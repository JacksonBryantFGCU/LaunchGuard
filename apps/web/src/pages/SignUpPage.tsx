import { SignUp } from "@clerk/react";

export function SignUpPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-slate-950 px-6 py-16">
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" fallbackRedirectUrl="/app" />
    </main>
  );
}
