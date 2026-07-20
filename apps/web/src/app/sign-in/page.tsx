import type { Metadata } from "next";
import { AuthPage } from "@/components/AuthPage";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your OMNIA workspace.",
};

export default function SignInPage() {
  return <AuthPage mode="sign-in" />;
}
