import { ClerkProvider } from "@clerk/react";
import { RouterProvider } from "react-router-dom";
import { router } from "./app/router.js";
import { AuthTokenBridge } from "./app/AuthTokenBridge.js";
import { resolvePublishableKey } from "./lib/auth/clerkConfig.js";

const publishableKey = resolvePublishableKey(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

function App() {
  return (
    <ClerkProvider publishableKey={publishableKey} afterSignOutUrl="/" signInUrl="/sign-in" signUpUrl="/sign-up">
      <AuthTokenBridge />
      <RouterProvider router={router} />
    </ClerkProvider>
  );
}

export default App;
