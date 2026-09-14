"use client";

import { useState } from "react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { supabase } from "@/shared/lib/supabase-client";

type Submission = {
  id: string;
  kind: string;
  payload: unknown;
  status: string;
  created_at: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  new: "Nuova",
  in_review: "In lavorazione",
  done: "Chiusa",
};

export function SubmissionInbox({ initialItems }: { initialItems: Submission[] }) {
  const [items, setItems] = useState(initialItems);

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("public_form_submissions").update({ status }).eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Richieste dal sito</h2>
      <p className="text-sm text-muted-foreground">
        Contatti, mandati e promozione. I mandati non creano anagrafiche: valuta e crea l&apos;artista dal gestionale.
      </p>
      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nessuna richiesta.</p>
        ) : (
          items.map((item) => (
            <article key={item.id} className="rounded-md border bg-white p-4 space-y-2">
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{item.kind}</Badge>
                  <Badge>{STATUS_LABEL[item.status] || item.status}</Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {item.created_at ? new Date(item.created_at).toLocaleString("it-IT") : ""}
                </span>
              </div>
              <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                {JSON.stringify(item.payload, null, 2)}
              </pre>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setStatus(item.id, "in_review")}>
                  In lavorazione
                </Button>
                <Button size="sm" onClick={() => setStatus(item.id, "done")}>
                  Chiudi
                </Button>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
