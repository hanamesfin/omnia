import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Discover",
  description: "Find focused AI agents for the way you work.",
};

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return children;
}
