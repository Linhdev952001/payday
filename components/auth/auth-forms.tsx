"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useT } from "@/contexts/i18n-context";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function LoginForm() {
  const { signIn } = useAuth();
  const t = useT();
  const router = useRouter();
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      await signIn(email, password);
      toast.success(t("auth.loginSuccess"));
      router.push("/dashboard");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("auth.loginFailed")
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md border-0 shadow-none">
      <CardHeader className="px-0 pb-2">
        <CardTitle className="text-2xl font-bold">{t("auth.login")}</CardTitle>
        <CardDescription>{t("auth.loginDesc")}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 px-0">
        <GoogleSignInButton
          variant="default"
          size="lg"
          label={t("auth.loginWithGoogle")}
        />

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">{t("auth.or")}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowEmailForm((open) => !open)}
          className="flex w-full items-center justify-between rounded-xl bg-secondary px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {t("auth.loginWithEmail")}
          <ChevronDown
            className={cn(
              "size-4 transition-transform",
              showEmailForm && "rotate-180"
            )}
          />
        </button>

        {showEmailForm && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-muted-foreground">
                {t("auth.email")}
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="ban@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-muted-foreground">
                {t("auth.password")}
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />}
              {t("auth.login")}
            </Button>
          </form>
        )}
      </CardContent>

      <CardFooter className="justify-center px-0 pt-2">
        <p className="text-sm text-muted-foreground">
          {t("auth.noAccount")}{" "}
          <Link
            href="/register"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            {t("auth.register")}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

export function RegisterForm() {
  const { signUp } = useAuth();
  const t = useT();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      await signUp(email, password, name);
      toast.success(t("auth.registerSuccess"));
      router.push("/dashboard");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("auth.registerFailed")
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md border-0 shadow-none">
      <CardHeader className="px-0 pb-2">
        <CardTitle className="text-2xl font-bold">{t("auth.register")}</CardTitle>
        <CardDescription>{t("auth.registerDesc")}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 px-0">
        <GoogleSignInButton
          variant="default"
          size="lg"
          label={t("auth.registerWithGoogle")}
        />

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">{t("auth.or")}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium text-muted-foreground">
              {t("auth.name")}
            </label>
            <Input
              id="name"
              type="text"
              autoComplete="name"
              placeholder="Nguyễn Văn A"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-muted-foreground">
              {t("auth.email")}
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="ban@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-muted-foreground">
              {t("auth.password")}
            </label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <Button type="submit" variant="secondary" className="w-full" disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            {t("auth.createWithEmail")}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center px-0 pt-2">
        <p className="text-sm text-muted-foreground">
          {t("auth.hasAccount")}{" "}
          <Link
            href="/login"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            {t("auth.login")}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
