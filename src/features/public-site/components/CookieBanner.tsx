"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/shared/components/ui/button";

const STORAGE_KEY = "rasi-cookie-consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  function choose(value: "essential" | "all") {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 inset-x-4 z-[60] rounded-2xl border border-anthropic-light-gray bg-anthropic-light p-4 shadow-lg md:max-w-xl md:left-auto">
      <p className="text-sm text-anthropic-dark mb-3">
        Usiamo cookie essenziali per il sito. Gli analitici partono solo con il consenso.{" "}
        <Link href="/cookie-policy" className="text-anthropic-orange underline">
          Cookie policy
        </Link>
      </p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => choose("essential")}>
          Solo essenziali
        </Button>
        <Button
          className="bg-anthropic-orange text-anthropic-light"
          onClick={() => choose("all")}
        >
          Accetta tutti
        </Button>
      </div>
    </div>
  );
}
