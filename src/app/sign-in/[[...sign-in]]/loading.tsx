import { AuthFormSkeleton } from "@/components/loading/auth-form-skeleton";

export default function SignInLoading() {
  return (
    <div className="flex min-h-[280px] items-center justify-center">
      <AuthFormSkeleton label="Loading sign-in…" />
    </div>
  );
}
