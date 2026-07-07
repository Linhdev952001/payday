"use client";

import type { CSSProperties } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/auth-context";
import { I18nProvider } from "@/contexts/i18n-context";
import { Toaster } from "@/components/ui/sonner";
import { FirebaseSetupBanner } from "@/components/firebase-setup-banner";
import { useUserInit } from "@/hooks/use-payday";

function PaydayInit({ children }: { children: React.ReactNode }) {
  useUserInit();
  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5000,
            refetchOnWindowFocus: true,
          },
        },
      })
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <FirebaseSetupBanner />
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <I18nProvider>
            <PaydayInit>{children}</PaydayInit>
          </I18nProvider>
          <Toaster
            richColors
            position="top-center"
            style={
              {
                top: "max(0.75rem, env(safe-area-inset-top))",
              } as CSSProperties
            }
          />
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
