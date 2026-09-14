import Link from "next/link";

const MANDATO_LINKS = [
  { href: "/mandato/artista", label: "Se sei un artista" },
  { href: "/mandato/minorenne", label: "Se sei un artista minorenne" },
  { href: "/mandato/rappresentante", label: "Se rappresenti un artista" },
  { href: "/mandato/produttore", label: "Se sei un produttore" },
  { href: "/mandato/erede", label: "Se sei l'erede di un artista" },
  { href: "/mandato/internazionale", label: "Se sei un artista internazionale (20%)" },
  { href: "/mandato/repertorio", label: "Schede repertorio" },
];

export function HomeWhyMandate() {
  return (
    <section className="w-full py-20 bg-anthropic-light">
      <div className="container mx-auto px-4 md:px-6">
        <h2 className="font-poppins text-3xl md:text-4xl font-bold text-anthropic-dark mb-6">
          Perché firmare il mandato alla R.A.S.I.?
        </h2>
        <div className="max-w-3xl space-y-4 text-anthropic-dark/80 font-lora mb-10">
          <p>
            È il mandato più vantaggioso fra quelli attualmente proposti. Se le interpretazioni
            sono state utilizzate, R.A.S.I. richiede i compensi e, una volta incassati, trattiene
            solo una commissione del <strong>10%</strong> su quanto viene liquidato all&apos;artista.
          </p>
          <p>
            Per gli artisti internazionali la commissione è del <strong>20%</strong> per i costi di
            gestione. Il mandato è gratuito e può essere revocato in qualsiasi momento.
          </p>
          <p>
            Dopo la firma ricostruiamo l&apos;elenco delle interpretazioni e attiviamo un archivio
            online personalizzato (Award System) di anagrafica, diritti e repertorio.
          </p>
        </div>
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {MANDATO_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="block rounded-full border border-anthropic-dark px-5 py-3 text-sm font-poppins hover:bg-anthropic-dark hover:text-anthropic-light transition-colors"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
