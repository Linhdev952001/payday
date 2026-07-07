import { GuestGuard } from "@/components/auth/auth-guard";
import { LoginForm } from "@/components/auth/auth-forms";

export default function LoginPage() {
  return (
    <GuestGuard>
      <LoginForm />
    </GuestGuard>
  );
}
