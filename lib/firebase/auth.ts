import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  GoogleAuthProvider,
  linkWithCredential,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "./client";

export async function signInWithGoogleIdToken(idToken: string): Promise<User> {
  const auth = getFirebaseAuth();
  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(auth, credential);
  return result.user;
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

export function hasPasswordLogin(user: User): boolean {
  return user.providerData.some((provider) => provider.providerId === "password");
}

export async function linkEmailPassword(password: string): Promise<User> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;

  if (!user?.email) {
    throw new FirebaseError("auth/invalid-email", "missing-email");
  }

  if (hasPasswordLogin(user)) {
    throw new FirebaseError("auth/provider-already-linked", "password-linked");
  }

  const credential = EmailAuthProvider.credential(user.email, password);
  const result = await linkWithCredential(user, credential);
  return result.user;
}

export async function logOut(): Promise<void> {
  await signOut(getFirebaseAuth());
}
