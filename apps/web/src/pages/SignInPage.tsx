import { SignIn } from "@clerk/react";

export function SignInPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-slate-950 px-6 py-16">
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" fallbackRedirectUrl="/app" />
    </main>
  );
}
