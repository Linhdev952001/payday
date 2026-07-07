import type { FirebaseOptions } from "firebase/app";

/** Static access so Next.js inlines NEXT_PUBLIC_* at build time. */
const ENV = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
} as const;

export const REQUIRED_FIREBASE_ENV = [
  ["NEXT_PUBLIC_FIREBASE_API_KEY", ENV.apiKey],
  ["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", ENV.authDomain],
  ["NEXT_PUBLIC_FIREBASE_PROJECT_ID", ENV.projectId],
  ["NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", ENV.storageBucket],
  ["NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", ENV.messagingSenderId],
  ["NEXT_PUBLIC_FIREBASE_APP_ID", ENV.appId],
] as const;

function trimEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function normalizeAuthDomain(domain: string): string {
  return domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function buildFirebaseConfig(): FirebaseOptions {
  const apiKey = trimEnv(ENV.apiKey);
  const authDomain = trimEnv(ENV.authDomain);
  const projectId = trimEnv(ENV.projectId);
  const storageBucket = trimEnv(ENV.storageBucket);
  const messagingSenderId = trimEnv(ENV.messagingSenderId);
  const appId = trimEnv(ENV.appId);
  const measurementId = trimEnv(ENV.measurementId);

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
    return trimEnv(ENV.apiKey);
  },
  get authDomain() {
    const domain = trimEnv(ENV.authDomain);
    return domain ? normalizeAuthDomain(domain) : undefined;
  },
  get projectId() {
    return trimEnv(ENV.projectId);
  },
  get storageBucket() {
    return trimEnv(ENV.storageBucket);
  },
  get messagingSenderId() {
    return trimEnv(ENV.messagingSenderId);
  },
  get appId() {
    return trimEnv(ENV.appId);
  },
  get measurementId() {
    return trimEnv(ENV.measurementId);
  },
} as const;

export function assertFirebaseConfig() {
  const missing = getMissingFirebaseEnvKeys();

  if (missing.length > 0) {
    throw new Error(
      `Missing Firebase env vars: ${missing.join(", ")}. Check .env.local or Vercel env.`
    );
  }
}

export function isFirebaseConfigured(): boolean {
  return getMissingFirebaseEnvKeys().length === 0;
}

export function getMissingFirebaseEnvKeys(): string[] {
  return REQUIRED_FIREBASE_ENV.filter(([, value]) => !trimEnv(value)).map(
    ([key]) => key
  );
}
