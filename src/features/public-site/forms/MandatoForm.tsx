"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { SITE_CONTACTS } from "../site-info";
import { MANDATO_LABELS, type MandatoTipo } from "./submission-schema";

export function MandatoForm({ tipo }: { tipo: MandatoTipo }) {
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
    try {
      const res = await fetch("/api/public/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "mandato",
          payload: {
            tipo,
            nome: data.get("nome"),
            cognome: data.get("cognome"),
            email: data.get("email"),
            telefono: data.get("telefono"),
            codice_fiscale: data.get("codice_fiscale"),
            note: data.get("note"),
          },
        }),
      });
      if (!res.ok) throw new Error("fail");
      form.reset();
      setStatus("ok");
      setMessage("Richiesta inviata. Un operatore la prenderà in carico senza creare automaticamente l'anagrafica.");
    } catch {
      setStatus("error");
      setMessage(`Invio non riuscito. Scrivi a ${SITE_CONTACTS.email}.`);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-3xl border border-anthropic-light-gray p-6">
      <p className="font-poppins text-sm text-anthropic-mid-gray">{MANDATO_LABELS[tipo]}</p>
      <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" />
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome" name="nome" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cognome">Cognome</Label>
          <Input id="cognome" name="cognome" required />
        </div>
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
        <Label htmlFor="codice_fiscale">Codice fiscale</Label>
        <Input id="codice_fiscale" name="codice_fiscale" maxLength={16} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="note">Note / delega</Label>
        <Textarea id="note" name="note" rows={4} />
      </div>
      <Button
        type="submit"
        disabled={status === "sending"}
        className="font-poppins rounded-full bg-anthropic-orange text-anthropic-light"
      >
        {status === "sending" ? "Invio…" : "Invia richiesta di mandato"}
      </Button>
      {message ? <p className="text-sm text-anthropic-mid-gray">{message}</p> : null}
    </form>
  );
}
