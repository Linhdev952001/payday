"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { toast } from "sonner";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import {
  GOOGLE_REDIRECT_FLAG,
  logOut,
  resolveGoogleRedirectResult,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from "@/lib/firebase/auth";
import { getAuthErrorMessage } from "@/lib/firebase/errors";
import { getFirebaseAnalytics } from "@/lib/firebase/client";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    displayName?: string
  ) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe = () => {};

    void (async () => {
      if (!isFirebaseConfigured()) {
        console.error("[auth] Firebase env vars missing at build time");
        setLoading(false);
        return;
      }

      try {
        const auth = getFirebaseAuth();
        const redirectUser = await resolveGoogleRedirectResult();

        await auth.authStateReady();
        const nextUser = auth.currentUser ?? redirectUser;
        setUser(nextUser);
        unsubscribe = onAuthStateChanged(auth, setUser);

        if (nextUser && sessionStorage.getItem(GOOGLE_REDIRECT_FLAG)) {
          sessionStorage.removeItem(GOOGLE_REDIRECT_FLAG);
          toast.success("Đăng nhập thành công");
        }

        void getFirebaseAnalytics();
      } catch (error) {
        console.error("[auth] init failed:", error);
      } finally {
        setLoading(false);
      }
    })();

    return () => unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isFirebaseConfigured()) {
      throw new Error(
        "Firebase chưa cấu hình trên server. Thêm NEXT_PUBLIC_FIREBASE_* trên Vercel và redeploy."
      );
    }
    try {
      await signInWithEmail(email, password);
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, displayName?: string) => {
      if (!isFirebaseConfigured()) {
        throw new Error(
          "Firebase chưa cấu hình trên server. Thêm NEXT_PUBLIC_FIREBASE_* trên Vercel và redeploy."
        );
      }
      try {
        await signUpWithEmail(email, password, displayName);
      } catch (error) {
        throw new Error(getAuthErrorMessage(error));
      }
    },
    []
  );

  const signInGoogle = useCallback(async () => {
    if (!isFirebaseConfigured()) {
      throw new Error(
        "Firebase chưa cấu hình trên server. Thêm NEXT_PUBLIC_FIREBASE_* trên Vercel và redeploy."
      );
    }
    try {
      await signInWithGoogle();
    } catch (error) {
      if (error instanceof Error && error.message === "REDIRECT_PENDING") {
        return;
      }
      throw new Error(getAuthErrorMessage(error));
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logOut();
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      signIn,
      signUp,
      signInGoogle,
      signOut,
    }),
    [user, loading, signIn, signUp, signInGoogle, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
