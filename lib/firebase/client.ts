import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
  type Auth,
} from "firebase/auth";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";
import { assertFirebaseConfig, buildFirebaseConfig } from "./config";

let app: FirebaseApp;
let auth: Auth;
let analytics: Analytics | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (typeof window === "undefined") {
    throw new Error("Firebase client SDK can only run in the browser.");
  }

  if (!getApps().length) {
    assertFirebaseConfig();
    app = initializeApp(buildFirebaseConfig());
  } else {
    app = getApps()[0]!;
  }

  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    const firebaseApp = getFirebaseApp();
    try {
      auth = initializeAuth(firebaseApp, {
        persistence: [indexedDBLocalPersistence, browserLocalPersistence],
      });
    } catch {
      auth = getAuth(firebaseApp);
    }
  }
  return auth;
}

export async function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (analytics) return analytics;
  if (typeof window === "undefined") return null;

  const supported = await isSupported();
  if (!supported) return null;

  try {
    analytics = getAnalytics(getFirebaseApp());
    return analytics;
  } catch {
    return null;
  }
}
