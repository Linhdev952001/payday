/**
 * Firestore rejects documents containing `undefined` values.
 * Strip them recursively before writing.
 */
export function sanitizeForFirestore<T>(value: T): T {
  if (value === undefined || value === null) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForFirestore(item)) as T;
  }

  if (typeof value === "object" && value instanceof Date) {
    return value;
  }

  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (entry !== undefined) {
        result[key] = sanitizeForFirestore(entry);
      }
    }
    return result as T;
  }

  return value;
}
