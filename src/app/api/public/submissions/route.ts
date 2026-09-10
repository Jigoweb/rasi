import { NextRequest, NextResponse } from "next/server";
import { allowRequest, parseSubmission } from "@/features/public-site/forms/submission-schema";
import { supabaseServer } from "@/shared/lib/supabase-server";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!allowRequest(ip)) {
    return NextResponse.json({ error: "Troppe richieste. Riprova più tardi." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON non valido" }, { status: 400 });
  }

  const parsed = parseSubmission(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  if (parsed.honeypot) {
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabaseServer.from("public_form_submissions").insert([
    {
      kind: parsed.kind,
      payload: parsed.payload as Record<string, string | undefined>,
      status: "new",
    },
  ]);

  if (error) {
    return NextResponse.json({ error: "Salvataggio non riuscito" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
