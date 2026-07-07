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
import { getFirebaseAuth, getFirebaseAnalytics } from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import {
  GOOGLE_AUTH_ENABLED,
  logOut,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from "@/lib/firebase/auth";
import { getAuthErrorMessage } from "@/lib/firebase/errors";

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
    if (!isFirebaseConfigured()) {
      console.error("[auth] Firebase env vars missing at build time");
      setLoading(false);
      return;
    }

    // ponytail: clear stale flag from old redirect flow
    sessionStorage.removeItem("payday-google-redirect");

    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);

    void auth.authStateReady().finally(() => {
      setLoading(false);
      void getFirebaseAnalytics();
    });

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
    if (!GOOGLE_AUTH_ENABLED) {
      throw new Error("Đăng nhập Google tạm thời không khả dụng.");
    }
    if (!isFirebaseConfigured()) {
      throw new Error(
        "Firebase chưa cấu hình trên server. Thêm NEXT_PUBLIC_FIREBASE_* trên Vercel và redeploy."
      );
    }
    try {
      await signInWithGoogle();
    } catch (error) {
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
