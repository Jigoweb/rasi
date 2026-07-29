import { PublicDocumentLayout } from "@/features/cms/components/PublicDocumentLayout";
import {
  extractInstitutionalHtml,
  isMigrationPlaceholder,
  resolvePublicDocuments,
  type PublicDocument,
} from "@/shared/lib/cms-content";

type InstitutionalPageViewProps = {
  category: string;
  slug: string;
  title: string;
  content: string;
  linkedDocuments?: { title: string; file_url: string }[];
  eyebrow?: string;
  intro?: string;
  backHref?: string;
  backLabel?: string;
  documentsHeading?: string;
};

export function InstitutionalPageView({
  category,
  slug,
  title,
  content,
  linkedDocuments,
  eyebrow,
  intro,
  backHref,
  backLabel,
  documentsHeading,
}: InstitutionalPageViewProps) {
  const documents: PublicDocument[] = resolvePublicDocuments({
    category,
    slug,
    content,
    linkedDocuments,
  });

  const bodyHtml = isMigrationPlaceholder(content) ? "" : extractInstitutionalHtml(content);
  const hasBody = bodyHtml.length > 0;

  return (
    <PublicDocumentLayout
      title={title}
      eyebrow={eyebrow}
      intro={intro}
      documents={documents}
      documentsHeading={documentsHeading}
      backHref={backHref}
      backLabel={backLabel}
    >
      {hasBody ? (
        <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      ) : null}
    </PublicDocumentLayout>
  );
}
