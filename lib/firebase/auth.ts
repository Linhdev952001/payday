import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithRedirect,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "./client";

/** ponytail: flip to true when Google sign-in is ready again */
export const GOOGLE_AUTH_ENABLED = false;

const googleProvider = new GoogleAuthProvider();
export const GOOGLE_REDIRECT_FLAG = "payday-google-redirect";

let redirectResultPromise: Promise<User | null> | null = null;

function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /FBAN|FBAV|Instagram|Line\/|Twitter|MicroMessenger|KAKAOTALK/i.test(
    navigator.userAgent
  );
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName?: string
): Promise<User> {
  const auth = getFirebaseAuth();
  const credential = await createUserWithEmailAndPassword(auth, email, password);

  if (displayName?.trim()) {
    await updateProfile(credential.user, { displayName: displayName.trim() });
  }

  return credential.user;
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<User> {
  const auth = getFirebaseAuth();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function signInWithGoogle(): Promise<User> {
  if (isInAppBrowser()) {
    throw new FirebaseError(
      "auth/operation-not-supported-in-this-environment",
      "in-app-browser"
    );
  }

  const auth = getFirebaseAuth();
  sessionStorage.setItem(GOOGLE_REDIRECT_FLAG, "1");

  try {
    await signInWithRedirect(auth, googleProvider);
  } catch (error) {
    sessionStorage.removeItem(GOOGLE_REDIRECT_FLAG);
    throw error;
  }

  throw new Error("REDIRECT_PENDING");
}

/** ponytail: singleton promise — getRedirectResult() only works once per redirect */
export function resolveGoogleRedirectResult(): Promise<User | null> {
  if (!redirectResultPromise) {
    redirectResultPromise = (async () => {
      const auth = getFirebaseAuth();
      try {
        const result = await getRedirectResult(auth);
        return result?.user ?? null;
      } catch (error) {
        sessionStorage.removeItem(GOOGLE_REDIRECT_FLAG);
        console.error("[auth] getRedirectResult failed:", error);
        throw error;
      }
    })();
  }
  return redirectResultPromise;
}

export async function logOut(): Promise<void> {
  const auth = getFirebaseAuth();
  await signOut(auth);
}
