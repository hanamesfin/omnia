import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Yours",
  description: "Your OMNIA library — agents you created and ones you added from Discover.",
};

export default function YoursLayout({ children }: { children: React.ReactNode }) {
  return children;
}
