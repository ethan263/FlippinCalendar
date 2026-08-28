import { AuthFormSkeleton } from "@/components/loading/auth-form-skeleton";

export default function SignUpLoading() {
  return (
    <div className="flex min-h-[280px] items-center justify-center">
      <AuthFormSkeleton label="Loading sign-up…" />
    </div>
  );
}
