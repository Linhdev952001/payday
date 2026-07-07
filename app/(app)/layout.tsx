import { AppShell } from "@/components/app-shell/app-shell";
import { NotificationReminder } from "@/components/notifications/reminder";
import { PwaInstallPrompt } from "@/components/pwa/install-prompt";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell>
      {children}
      <NotificationReminder />
      <PwaInstallPrompt />
    </AppShell>
  );
}
