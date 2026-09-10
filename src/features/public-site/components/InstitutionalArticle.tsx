import { extractTocAndInjectIds } from "../lib/html-toc";

export function InstitutionalArticle({ title, content }: { title: string; content: string }) {
  const { html, toc } = extractTocAndInjectIds(content || "");

  return (
    <article className="max-w-5xl mx-auto py-16 px-4 md:px-6">
      <h1 className="font-poppins text-4xl md:text-5xl font-bold text-anthropic-dark mb-8">{title}</h1>
      <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
        {toc.length > 2 ? (
          <nav className="hidden lg:block sticky top-24 self-start text-sm">
            <p className="font-poppins font-semibold text-anthropic-dark mb-3">Indice</p>
            <ul className="space-y-2">
              {toc.map((item) => (
                <li key={item.id}>
                  <a href={`#${item.id}`} className="text-anthropic-mid-gray hover:text-anthropic-orange">
                    {item.text}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : (
          <div className="hidden lg:block" />
        )}
        <div
          className="prose prose-lg prose-anthropic font-lora text-anthropic-dark/80"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </article>
  );
}
