import type { Metadata } from "next";
import { AuthPage } from "@/components/AuthPage";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create your OMNIA workspace.",
};

export default function SignUpPage() {
  return <AuthPage mode="sign-up" />;
}
