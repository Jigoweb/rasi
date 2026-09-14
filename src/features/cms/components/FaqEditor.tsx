"use client";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";

export type FaqItem = { question: string; answer: string };

export function parseFaqContent(content: string): FaqItem[] {
  try {
    const parsed = JSON.parse(content || "[]");
    if (Array.isArray(parsed)) {
      return parsed
        .filter((x) => x && typeof x.question === "string")
        .map((x) => ({ question: x.question, answer: String(x.answer || "") }));
    }
  } catch {
    /* HTML leftover */
  }
  if (content.trim()) {
    return [{ question: "Domanda", answer: content }];
  }
  return [{ question: "", answer: "" }];
}

export function FaqEditor({
  items,
  onChange,
}: {
  items: FaqItem[];
  onChange: (items: FaqItem[]) => void;
}) {
  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={index} className="rounded-md border p-4 space-y-3">
          <div className="space-y-2">
            <Label>Domanda {index + 1}</Label>
            <Input
              value={item.question}
              onChange={(e) => {
                const next = [...items];
                next[index] = { ...item, question: e.target.value };
                onChange(next);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Risposta (HTML)</Label>
            <Textarea
              rows={4}
              value={item.answer}
              onChange={(e) => {
                const next = [...items];
                next[index] = { ...item, answer: e.target.value };
                onChange(next);
              }}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange(items.filter((_, i) => i !== index))}
          >
            Rimuovi
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={() => onChange([...items, { question: "", answer: "" }])}>
        Aggiungi domanda
      </Button>
    </div>
  );
}
