import { supabaseServer } from "@/shared/lib/supabase-server";
import { SubmissionInbox } from "@/features/cms/components/SubmissionInbox";

export default async function CmsSubmissionsPage() {
  const { data, error } = await supabaseServer
    .from("public_form_submissions")
    .select("id,kind,payload,status,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return <div>Errore nel caricamento delle richieste: {error.message}</div>;
  }

  return <SubmissionInbox initialItems={data || []} />;
}
