import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy | R.A.S.I.",
  description: "Informativa sui cookie utilizzati dal sito di Rete Artisti Spettacolo per l'Innovazione.",
};

export default function CookiePolicyPage() {
  return (
    <article className="max-w-3xl mx-auto py-16 px-4 md:px-6 prose prose-lg font-lora">
      <h1 className="font-poppins text-4xl font-bold text-anthropic-dark">Cookie Policy</h1>
      <p>
        Questo sito utilizza cookie tecnici necessari al funzionamento (sessione, preferenze di consenso
        e sicurezza). I cookie di analitica vengono attivati solo dopo il consenso esplicito dal banner.
      </p>
      <h2 className="font-poppins text-2xl font-semibold text-anthropic-dark">Cookie essenziali</h2>
      <p>
        Consentono autenticazione all&apos;area riservata, protezione CSRF e memorizzazione della scelta
        sul banner cookie. Non richiedono consenso.
      </p>
      <h2 className="font-poppins text-2xl font-semibold text-anthropic-dark">Cookie analitici</h2>
      <p>
        Se abilitati, servono a comprendere l&apos;uso del sito in forma aggregata. Puoi revocare il
        consenso cancellando i cookie del browser o rifiutando dal banner.
      </p>
      <p>
        Titolare del trattamento: Rete Artisti Spettacolo per l&apos;Innovazione, Via Po 43, 00198 Roma —
        info@reteartistispettacolo.it.
      </p>
    </article>
  );
}
