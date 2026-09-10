import type { Metadata } from "next";
import { SITE_CONTACTS, SITE_LEGAL_NAME, SITE_TAGLINE } from "@/features/public-site/site-info";
import { ContactForm } from "@/features/public-site/forms/ContactForm";

export const metadata: Metadata = {
  title: "Contatti | R.A.S.I.",
  description: "Recapiti e form di contatto di Rete Artisti Spettacolo per l'Innovazione.",
};

export default function ContattiPage() {
  return (
    <section className="max-w-5xl mx-auto py-16 px-4 md:px-6">
      <h1 className="font-poppins text-4xl md:text-5xl font-bold text-anthropic-dark mb-4">
        Contatti R.A.S.I.
      </h1>
      <p className="font-lora text-anthropic-mid-gray mb-10 max-w-2xl">
        {SITE_LEGAL_NAME}. {SITE_TAGLINE}
      </p>
      <div className="grid md:grid-cols-2 gap-10">
        <div className="space-y-4 text-sm">
          <div>
            <h2 className="font-poppins font-semibold text-anthropic-dark mb-1">Sede legale e operativa</h2>
            <p>{SITE_CONTACTS.addressShort}</p>
          </div>
          <p>
            Tel. <a className="text-anthropic-orange" href={SITE_CONTACTS.phoneHref}>{SITE_CONTACTS.phone}</a>
          </p>
          <p>
            Tel. <a className="text-anthropic-orange" href={SITE_CONTACTS.phoneAltHref}>{SITE_CONTACTS.phoneAlt}</a>
          </p>
          <p>
            Cellulare / WhatsApp{" "}
            <a className="text-anthropic-orange" href={SITE_CONTACTS.whatsappHref}>
              {SITE_CONTACTS.mobile}
            </a>
          </p>
          <p>
            Email{" "}
            <a className="text-anthropic-orange" href={SITE_CONTACTS.emailHref}>
              {SITE_CONTACTS.email}
            </a>
          </p>
          <p>
            PEC istituzionale{" "}
            <a className="text-anthropic-orange" href={SITE_CONTACTS.pecHref}>
              {SITE_CONTACTS.pec}
            </a>
          </p>
          <p>
            PEC utilizzatori{" "}
            <a className="text-anthropic-orange" href={SITE_CONTACTS.pecUtilizzatoriHref}>
              {SITE_CONTACTS.pecUtilizzatori}
            </a>
          </p>
          <p>{SITE_CONTACTS.hours}</p>
        </div>
        <div>
          <h2 className="font-poppins text-2xl font-semibold text-anthropic-dark mb-2">
            Scrivi a R.A.S.I.
          </h2>
          <p className="text-sm text-anthropic-mid-gray mb-4">
            Compila il modulo oppure scrivi a{" "}
            <a className="text-anthropic-orange" href={SITE_CONTACTS.emailHref}>
              {SITE_CONTACTS.email}
            </a>
            .
          </p>
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
