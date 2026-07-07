import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "./client";

const googleProvider = new GoogleAuthProvider();

const REDIRECT_FALLBACK_CODES = new Set([
  "auth/popup-blocked",
  "auth/cancelled-popup-request",
  "auth/operation-not-supported-in-this-environment",
  "auth/argument-error",
]);

function shouldUseGoogleRedirect(): boolean {
  if (typeof window === "undefined") return false;

  const ua = navigator.userAgent;
  const isMobile = /iPhone|iPad|iPod|Android/i.test(ua);
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;

  return isMobile || isStandalone;
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
  const auth = getFirebaseAuth();

  if (shouldUseGoogleRedirect()) {
    await signInWithRedirect(auth, googleProvider);
    throw new Error("REDIRECT_PENDING");
  }

  try {
    const credential = await signInWithPopup(auth, googleProvider);
    return credential.user;
  } catch (error) {
    if (error instanceof FirebaseError && REDIRECT_FALLBACK_CODES.has(error.code)) {
      await signInWithRedirect(auth, googleProvider);
      throw new Error("REDIRECT_PENDING");
    }
    throw error;
  }
}

export async function resolveGoogleRedirectResult(): Promise<User | null> {
  const auth = getFirebaseAuth();
  try {
    const result = await getRedirectResult(auth);
    return result?.user ?? null;
  } catch (error) {
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
