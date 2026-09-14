"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { SITE_CONTACTS } from "../site-info";

export function PromozioneForm() {
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
      const file = data.get("file");
      let file_url = "";
      if (file instanceof File && file.size > 0) {
        const upload = new FormData();
        upload.set("file", file);
        const up = await fetch("/api/public/uploads", { method: "POST", body: upload });
        if (!up.ok) throw new Error("upload");
        const json = (await up.json()) as { url?: string };
        file_url = json.url || "";
      }
      const res = await fetch("/api/public/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "promozione",
          payload: {
            nome: data.get("nome"),
            email: data.get("email"),
            titolo_opera: data.get("titolo_opera"),
            descrizione: data.get("descrizione"),
            file_url,
          },
        }),
      });
      if (!res.ok) throw new Error("fail");
      form.reset();
      setStatus("ok");
      setMessage("Materiale inviato. Un operatore valuterà la richiesta.");
    } catch {
      setStatus("error");
      setMessage(`Invio non riuscito. Scrivi a ${SITE_CONTACTS.email}.`);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-3xl border border-anthropic-light-gray p-6">
      <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" />
      <div className="space-y-2">
        <Label htmlFor="nome">Nome e cognome</Label>
        <Input id="nome" name="nome" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="titolo_opera">Titolo opera / spettacolo</Label>
        <Input id="titolo_opera" name="titolo_opera" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="descrizione">Descrizione</Label>
        <Textarea id="descrizione" name="descrizione" rows={4} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="file">Materiale (pdf, immagine o video, max 20 MB)</Label>
        <Input id="file" name="file" type="file" accept=".pdf,image/*,video/*" />
      </div>
      <Button
        type="submit"
        disabled={status === "sending"}
        className="font-poppins rounded-full bg-anthropic-orange text-anthropic-light"
      >
        {status === "sending" ? "Invio…" : "Invia materiale"}
      </Button>
      {message ? <p className="text-sm text-anthropic-mid-gray">{message}</p> : null}
    </form>
  );
}
