"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CollectionsDemoIndex() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/app/demo/home");
  }, [router]);
  return (
    <div className="flex h-dvh items-center justify-center" aria-busy>
      <div className="skeleton h-10 w-48 rounded-xl" />
    </div>
  );
}
