"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useT } from "@/contexts/i18n-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const DISMISS_KEY = "payday-pwa-install-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  if (typeof window === "undefined") return true;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

type Platform = "ios" | "android" | "desktop";

export function PwaInstallPrompt() {
  const t = useT();
  const [guideOpen, setGuideOpen] = useState(false);
  const [platform, setPlatform] = useState<Platform>("desktop");
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);
  const shownRef = useRef(false);
  const toastIdRef = useRef<string | number | null>(null);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, "1");
    if (toastIdRef.current != null) toast.dismiss(toastIdRef.current);
  }, []);

  const openGuide = useCallback(() => {
    setGuideOpen(true);
  }, []);

  const showPrompt = useCallback(() => {
    if (shownRef.current || isStandalone() || localStorage.getItem(DISMISS_KEY)) return;
    shownRef.current = true;

    const canNativeInstall = Boolean(deferredRef.current);

    toastIdRef.current = toast.message(t("pwa.title"), {
      description: t("pwa.body"),
      duration: Infinity,
      action: canNativeInstall
        ? {
            label: t("pwa.install"),
            onClick: () => {
              void (async () => {
                const prompt = deferredRef.current;
                if (!prompt) return;
                await prompt.prompt();
                const { outcome } = await prompt.userChoice;
                if (outcome === "accepted") {
                  localStorage.setItem(DISMISS_KEY, "1");
                  toast.success(t("pwa.installed"));
                }
                deferredRef.current = null;
              })();
            },
          }
        : {
            label: t("pwa.howTo"),
            onClick: openGuide,
          },
      cancel: {
        label: t("pwa.dismiss"),
        onClick: dismiss,
      },
    });
  }, [t, dismiss, openGuide]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone() || localStorage.getItem(DISMISS_KEY)) return;

    setPlatform(isIos() ? "ios" : isAndroid() ? "android" : "desktop");

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredRef.current = e as BeforeInstallPromptEvent;
      if (!shownRef.current) showPrompt();
    };

    const onInstalled = () => {
      localStorage.setItem(DISMISS_KEY, "1");
      toast.success(t("pwa.installed"));
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    const timer = setTimeout(showPrompt, 3000);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [t, showPrompt]);

  const steps =
    platform === "ios"
      ? [t("pwa.iosStep1"), t("pwa.iosStep2"), t("pwa.iosStep3")]
      : platform === "android"
        ? [t("pwa.androidStep1"), t("pwa.androidStep2")]
        : [t("pwa.desktopStep1"), t("pwa.desktopStep2")];

  const guideTitle =
    platform === "ios"
      ? t("pwa.iosTitle")
      : platform === "android"
        ? t("pwa.androidTitle")
        : t("pwa.desktopTitle");

  return (
    <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
      <DialogContent className="rounded-3xl sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{guideTitle}</DialogTitle>
          <DialogDescription>{t("pwa.body")}</DialogDescription>
        </DialogHeader>
        <ol className="space-y-3 py-1 text-sm">
          {steps.map((step, i) => (
            <li key={step} className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {i + 1}
              </span>
              <span className="pt-0.5 leading-snug">{step}</span>
            </li>
          ))}
        </ol>
        <Button
          className="h-11 w-full rounded-xl"
          onClick={() => {
            setGuideOpen(false);
            dismiss();
          }}
        >
          {t("pwa.gotIt")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
