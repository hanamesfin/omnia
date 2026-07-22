import type { Metadata } from "next";
import { CreateStudioShell } from "@/components/CreateStudioShell";

export const metadata: Metadata = {
  title: "Create",
  description: "Interview-guided agent generation — chips or free text, then a transparent spec and prompt.",
};

export default function CreateLayout({ children }: { children: React.ReactNode }) {
  return <CreateStudioShell>{children}</CreateStudioShell>;
}
