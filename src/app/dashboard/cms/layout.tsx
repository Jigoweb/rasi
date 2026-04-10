import Link from "next/link";
import { Button } from "@/shared/components/ui/button";

export default function CmsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Sito Pubblico (CMS)</h1>
        <p className="text-muted-foreground">
          Gestisci i contenuti, le pagine, le news e i documenti del sito pubblico.
        </p>
      </div>

      <div className="flex items-center gap-4 border-b pb-4">
        <Link href="/dashboard/cms/pages">
          <Button variant="ghost">Pagine</Button>
        </Link>
        <Link href="/dashboard/cms/news">
          <Button variant="ghost">Bandi e News</Button>
        </Link>
        <Link href="/dashboard/cms/documents">
          <Button variant="ghost">Documenti e Modulistica</Button>
        </Link>
      </div>

      <div>
        {children}
      </div>
    </div>
  );
}