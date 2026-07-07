"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, Loader2, Mail } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useT } from "@/contexts/i18n-context";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type AuthScreenProps = {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
  panelClassName?: string;
};

function AuthScreen({
  title,
  description,
  children,
  footer,
  panelClassName,
}: AuthScreenProps) {
  return (
    <div className="flex w-full max-w-md flex-1 flex-col sm:mx-auto sm:justify-center sm:py-6">
      <div className="page-enter flex flex-1 flex-col justify-end pb-5 pt-1 sm:flex-none sm:pb-6">
        <p className="toss-label">Payday</p>
        <h1 className="mt-2 text-[30px] font-bold leading-[1.12] tracking-tight sm:text-[26px]">
          {title}
        </h1>
        <p className="mt-2.5 max-w-[28ch] text-[15px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>

      <div
        className={cn(
          "auth-panel page-enter stagger-1 -mx-5 px-5 pt-6 pb-6 sm:mx-0 sm:px-6",
          panelClassName
        )}
      >
        {children}
      </div>

      <div className="page-enter stagger-2 shrink-0 py-5 text-center sm:py-4">
        {footer}
      </div>
    </div>
  );
}

function AuthDivider() {
  const t = useT();
  return (
    <div className="relative py-1">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-border/60" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-card/90 px-3 text-[12px] font-medium text-muted-foreground sm:bg-card">
          {t("auth.or")}
        </span>
      </div>
    </div>
  );
}

function AuthFooterLink({
  prompt,
  href,
  label,
}: {
  prompt: string;
  href: string;
  label: string;
}) {
  return (
    <p className="text-[14px] text-muted-foreground">
      {prompt}{" "}
      <Link
        href={href}
        className="font-semibold text-primary underline-offset-4 active:underline"
      >
        {label}
      </Link>
    </p>
  );
}

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
    <AuthScreen
      title={t("auth.login")}
      description={t("auth.loginDesc")}
      footer={
        <AuthFooterLink
          prompt={t("auth.noAccount")}
          href="/register"
          label={t("auth.register")}
        />
      }
    >
      <div className="space-y-4">
        <GoogleSignInButton
          variant="default"
          size="lg"
          label={t("auth.loginWithGoogle")}
          className="shadow-[0_4px_20px_-4px_color-mix(in_srgb,var(--primary)_55%,transparent)]"
        />

        <AuthDivider />

        <button
          type="button"
          onClick={() => setShowEmailForm((open) => !open)}
          className={cn(
            "flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-colors active:scale-[0.99]",
            showEmailForm
              ? "bg-primary/10 text-foreground"
              : "bg-secondary text-muted-foreground active:bg-secondary/80"
          )}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-background/60">
            <Mail className="size-4" strokeWidth={2} />
          </span>
          <span className="min-w-0 flex-1 text-[15px] font-semibold">
            {t("auth.loginWithEmail")}
          </span>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 transition-transform duration-200",
              showEmailForm && "rotate-180"
            )}
          />
        </button>

        <div
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
            showEmailForm ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          )}
        >
          <div className="overflow-hidden">
            <form onSubmit={handleSubmit} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="px-1 text-[13px] font-medium text-muted-foreground"
                >
                  {t("auth.email")}
                </label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="ban@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="px-1 text-[13px] font-medium text-muted-foreground"
                >
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
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading && <Loader2 className="animate-spin" />}
                {t("auth.login")}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </AuthScreen>
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
    <AuthScreen
      title={t("auth.register")}
      description={t("auth.registerDesc")}
      panelClassName="max-h-[min(70dvh,520px)] overflow-y-auto sm:max-h-none sm:overflow-visible"
      footer={
        <AuthFooterLink
          prompt={t("auth.hasAccount")}
          href="/login"
          label={t("auth.login")}
        />
      }
    >
      <div className="space-y-4">
        <GoogleSignInButton
          variant="default"
          size="lg"
          label={t("auth.registerWithGoogle")}
          className="shadow-[0_4px_20px_-4px_color-mix(in_srgb,var(--primary)_55%,transparent)]"
        />

        <AuthDivider />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="name"
              className="px-1 text-[13px] font-medium text-muted-foreground"
            >
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
          <div className="space-y-1.5">
            <label
              htmlFor="register-email"
              className="px-1 text-[13px] font-medium text-muted-foreground"
            >
              {t("auth.email")}
            </label>
            <Input
              id="register-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="ban@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="register-password"
              className="px-1 text-[13px] font-medium text-muted-foreground"
            >
              {t("auth.password")}
            </label>
            <Input
              id="register-password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <Button type="submit" variant="secondary" className="w-full" size="lg" disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            {t("auth.createWithEmail")}
          </Button>
        </form>
      </div>
    </AuthScreen>
  );
}
