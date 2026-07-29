import Link from "next/link";
import { Download, ExternalLink } from "lucide-react";
import type { PublicDocument } from "@/shared/lib/cms-content";

type DocumentDownloadListProps = {
  documents: PublicDocument[];
  heading?: string;
};

export function DocumentDownloadList({ documents, heading = "Documenti" }: DocumentDownloadListProps) {
  if (documents.length === 0) return null;

  return (
    <div className="rounded-2xl border border-rasi-line bg-rasi-paper overflow-hidden">
      <div className="border-b border-rasi-line bg-rasi-line/30 px-6 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-rasi-ink">{heading}</h2>
      </div>
      <ul className="divide-y divide-rasi-line">
        {documents.map((doc) => {
          const isPdf = /\.pdf($|\?)/i.test(doc.url);
          const isExternal = doc.url.startsWith("http");

          return (
            <li key={doc.url}>
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-rasi-line/20"
              >
                <span className="min-w-0 font-medium text-rasi-ink">{doc.title}</span>
                <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-rasi-ember">
                  {isPdf ? (
                    <>
                      <Download className="h-4 w-4" aria-hidden="true" />
                      Scarica PDF
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      {isExternal ? "Apri" : "Vai"}
                    </>
                  )}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

type PublicDocumentLayoutProps = {
  title: string;
  eyebrow?: string;
  intro?: string;
  children?: React.ReactNode;
  documents?: PublicDocument[];
  documentsHeading?: string;
  backHref?: string;
  backLabel?: string;
};

export function PublicDocumentLayout({
  title,
  eyebrow,
  intro,
  children,
  documents = [],
  documentsHeading,
  backHref,
  backLabel,
}: PublicDocumentLayoutProps) {
  return (
    <div className="font-schibsted">
      <section className="bg-rasi-ink py-16 md:py-20">
        <div className="mx-auto max-w-3xl px-4 md:px-6">
          {backHref ? (
            <Link
              href={backHref}
              className="mb-6 inline-block text-sm font-semibold text-rasi-paper/60 transition-colors hover:text-rasi-paper"
            >
              ← {backLabel ?? "Indietro"}
            </Link>
          ) : null}
          {eyebrow ? (
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-rasi-paper/50">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-rasi-paper md:text-4xl lg:text-5xl">
            {title}
          </h1>
          {intro ? (
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-rasi-paper/70">{intro}</p>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-16">
        {documents.length > 0 ? (
          <div className={children ? "mb-10" : ""}>
            <DocumentDownloadList documents={documents} heading={documentsHeading} />
          </div>
        ) : null}

        {children ? (
          <div className="prose prose-lg max-w-none prose-headings:font-semibold prose-headings:text-rasi-ink prose-p:text-rasi-slate prose-a:text-rasi-ember prose-a:no-underline hover:prose-a:underline prose-li:text-rasi-slate">
            {children}
          </div>
        ) : null}

        {!children && documents.length === 0 ? (
          <p className="text-center text-rasi-slate">
            Il contenuto di questa pagina è in aggiornamento. Per informazioni scrivi a{" "}
            <a href="mailto:info@reteartistispettacolo.it" className="font-semibold text-rasi-ember hover:underline">
              info@reteartistispettacolo.it
            </a>
            .
          </p>
        ) : null}
      </section>
    </div>
  );
}
