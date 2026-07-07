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

  try {
    const credential = await signInWithPopup(auth, googleProvider);
    return credential.user;
  } catch (error) {
    if (
      error instanceof FirebaseError &&
      (error.code === "auth/popup-blocked" ||
        error.code === "auth/cancelled-popup-request")
    ) {
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
