"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { GOOGLE_AUTH_ENABLED } from "@/lib/firebase/auth";

export function HomeCta() {
  return (
    <div className="mt-10 flex w-full max-w-sm flex-col gap-3">
      {GOOGLE_AUTH_ENABLED && (
        <GoogleSignInButton
          variant="default"
          size="lg"
          label="Đăng nhập với Google"
        />
      )}
      <Button
        variant={GOOGLE_AUTH_ENABLED ? "outline" : "default"}
        size="lg"
        render={<Link href="/login" />}
      >
        Đăng nhập bằng email
      </Button>
    </div>
  );
}
