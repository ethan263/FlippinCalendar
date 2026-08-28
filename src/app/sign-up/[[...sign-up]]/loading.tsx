import { AuthShell } from "@/components/auth-shell";
import { AuthFormSkeleton } from "@/components/loading/auth-form-skeleton";

export default function SignUpLoading() {
  return (
    <AuthShell>
      <AuthFormSkeleton label="Loading sign-up…" />
    </AuthShell>
  );
}
