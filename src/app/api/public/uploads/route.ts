import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/lib/supabase-server";

const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED = /^(application\/pdf|image\/|video\/)/;

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "File mancante" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File troppo grande" }, { status: 400 });
  }
  if (!ALLOWED.test(file.type || "")) {
    return NextResponse.json({ error: "Formato non consentito" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "bin";
  const path = `promozione/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabaseServer.storage.from("public-uploads").upload(path, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (error) {
    return NextResponse.json({ error: "Upload non riuscito" }, { status: 500 });
  }

  const { data } = supabaseServer.storage.from("public-uploads").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
