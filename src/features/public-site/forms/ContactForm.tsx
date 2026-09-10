"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { SITE_CONTACTS } from "../site-info";

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    if (String(data.get("website") || "").trim()) {
      setStatus("ok");
      return;
    }

    setStatus("sending");
    setMessage("");
    try {
      const res = await fetch("/api/public/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "contatti",
          website: data.get("website"),
          payload: {
            nome: data.get("nome"),
            email: data.get("email"),
            telefono: data.get("telefono"),
            messaggio: data.get("messaggio"),
          },
        }),
      });
      if (!res.ok) throw new Error("submit failed");
      form.reset();
      setStatus("ok");
      setMessage("Richiesta inviata. Ti risponderemo appena possibile.");
    } catch {
      setStatus("error");
      setMessage(`Invio non riuscito. Scrivi a ${SITE_CONTACTS.email}.`);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-3xl border border-anthropic-light-gray p-6">
      <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" />
      <div className="space-y-2">
        <Label htmlFor="nome">Nome</Label>
        <Input id="nome" name="nome" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="telefono">Telefono</Label>
        <Input id="telefono" name="telefono" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="messaggio">Messaggio</Label>
        <Textarea id="messaggio" name="messaggio" rows={5} required />
      </div>
      <Button
        type="submit"
        disabled={status === "sending"}
        className="font-poppins rounded-full bg-anthropic-orange text-anthropic-light"
      >
        {status === "sending" ? "Invio…" : "Invia"}
      </Button>
      {message ? <p className="text-sm text-anthropic-mid-gray">{message}</p> : null}
    </form>
  );
}
