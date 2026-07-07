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

const googleProvider = new GoogleAuthProvider();
export const GOOGLE_REDIRECT_FLAG = "payday-google-redirect";

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

export async function resolveGoogleRedirectResult(): Promise<User | null> {
  const auth = getFirebaseAuth();
  try {
    const result = await getRedirectResult(auth);
    return result?.user ?? null;
  } catch (error) {
    sessionStorage.removeItem(GOOGLE_REDIRECT_FLAG);
    if (error instanceof FirebaseError && error.code === "auth/argument-error") {
      return null;
    }
    throw error;
  }
}

export async function logOut(): Promise<void> {
  const auth = getFirebaseAuth();
  await signOut(auth);
}
