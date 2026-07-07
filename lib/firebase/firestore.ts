import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  setDoc,
  type Firestore,
} from "firebase/firestore";
import type { ActiveSession, Job, Shift, UserSettings } from "@/types";
import { getFirebaseApp } from "./client";
import { sanitizeForFirestore } from "./sanitize";

let firestore: Firestore | null = null;

export function getFirestoreDb(): Firestore {
  if (!firestore) {
    firestore = getFirestore(getFirebaseApp());
  }
  return firestore;
}

function userCollection(userId: string, name: string) {
  return collection(getFirestoreDb(), "users", userId, name);
}

function userDoc(userId: string, collectionName: string, docId: string) {
  return doc(getFirestoreDb(), "users", userId, collectionName, docId);
}

async function writeDoc<T extends Record<string, unknown>>(
  userId: string,
  collectionName: string,
  docId: string,
  data: T
): Promise<void> {
  await setDoc(
    userDoc(userId, collectionName, docId),
    sanitizeForFirestore(data) as T,
    { merge: true }
  );
}

export async function pushJobToFirestore(job: Job): Promise<void> {
  await writeDoc(job.userId, "jobs", job.id, job);
}

export async function pushShiftToFirestore(shift: Shift): Promise<void> {
  await writeDoc(shift.userId, "shifts", shift.id, shift);
}

export async function pushActiveSessionToFirestore(
  session: ActiveSession
): Promise<void> {
  await writeDoc(session.userId, "activeSessions", session.id, session);
}

export async function pushSettingsToFirestore(
  settings: UserSettings
): Promise<void> {
  await writeDoc(settings.userId, "settings", settings.id, settings);
}

export async function pullJobsFromFirestore(userId: string): Promise<Job[]> {
  const snapshot = await getDocs(userCollection(userId, "jobs"));
  return snapshot.docs.map((d) => d.data() as Job);
}

export async function pullShiftsFromFirestore(userId: string): Promise<Shift[]> {
  const snapshot = await getDocs(userCollection(userId, "shifts"));
  return snapshot.docs.map((d) => d.data() as Shift);
}

export async function pullSettingsFromFirestore(
  userId: string
): Promise<UserSettings | null> {
  const ref = userDoc(userId, "settings", "main");
  const snapshot = await getDoc(ref);
  return snapshot.exists() ? (snapshot.data() as UserSettings) : null;
}

export async function pullActiveSessionFromFirestore(
  userId: string
): Promise<ActiveSession | null> {
  const snapshot = await getDocs(userCollection(userId, "activeSessions"));
  const doc = snapshot.docs[0];
  return doc ? (doc.data() as ActiveSession) : null;
}
