const GSI_SCRIPT = "https://accounts.google.com/gsi/client";

let gsiPromise: Promise<void> | null = null;

export function getGoogleClientId(): string | undefined {
  const id = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
  return id || undefined;
}

export function loadGoogleGsi(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Sign-In chỉ chạy trên trình duyệt."));
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  if (!gsiPromise) {
    gsiPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = GSI_SCRIPT;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Không tải được Google Sign-In."));
      document.head.appendChild(script);
    });
  }

  return gsiPromise;
}
