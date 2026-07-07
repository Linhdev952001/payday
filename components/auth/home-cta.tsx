"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

export function HomeCta() {
  return (
    <div className="mt-10 flex w-full max-w-sm flex-col gap-3">
      <GoogleSignInButton
        variant="default"
        size="lg"
        label="Đăng nhập với Google"
      />
      <Button variant="outline" size="lg" render={<Link href="/login" />}>
        Đăng nhập bằng email
      </Button>
    </div>
  );
}
