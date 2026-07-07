import type { FirebaseOptions } from "firebase/app";

const REQUIRED_ENV_KEYS = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
] as const;

function readEnv(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value || undefined;
}

function normalizeAuthDomain(domain: string): string {
  return domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function buildFirebaseConfig(): FirebaseOptions {
  const apiKey = readEnv("NEXT_PUBLIC_FIREBASE_API_KEY");
  const authDomain = readEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
  const projectId = readEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  const storageBucket = readEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET");
  const messagingSenderId = readEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID");
  const appId = readEnv("NEXT_PUBLIC_FIREBASE_APP_ID");
  const measurementId = readEnv("NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID");

  const config: FirebaseOptions = {
    apiKey: apiKey!,
    authDomain: normalizeAuthDomain(authDomain!),
    projectId: projectId!,
    storageBucket: storageBucket!,
    messagingSenderId: messagingSenderId!,
    appId: appId!,
  };

  if (measurementId) {
    config.measurementId = measurementId;
  }

  return config;
}

/** @deprecated use buildFirebaseConfig — kept for imports that read fields */
export const firebaseConfig = {
  get apiKey() {
    return readEnv("NEXT_PUBLIC_FIREBASE_API_KEY");
  },
  get authDomain() {
    const domain = readEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
    return domain ? normalizeAuthDomain(domain) : undefined;
  },
  get projectId() {
    return readEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  },
  get storageBucket() {
    return readEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET");
  },
  get messagingSenderId() {
    return readEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID");
  },
  get appId() {
    return readEnv("NEXT_PUBLIC_FIREBASE_APP_ID");
  },
  get measurementId() {
    return readEnv("NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID");
  },
} as const;

export function assertFirebaseConfig() {
  const missing = REQUIRED_ENV_KEYS.filter((key) => !readEnv(key));

  if (missing.length > 0) {
    throw new Error(
      `Missing Firebase env vars: ${missing.join(", ")}. Check .env.local or Vercel env.`
    );
  }
}
