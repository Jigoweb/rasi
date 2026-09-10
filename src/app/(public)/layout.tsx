import { PublicFooter } from "@/features/public-site/components/PublicFooter";
import { PublicHeader } from "@/features/public-site/components/PublicHeader";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-anthropic-light text-anthropic-dark font-lora">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
