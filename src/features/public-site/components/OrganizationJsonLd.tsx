import {
  SITE_CONTACTS,
  SITE_LEGAL,
  SITE_LEGAL_NAME,
  SITE_SOCIAL,
} from "../site-info";

export function OrganizationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_LEGAL_NAME,
    alternateName: "R.A.S.I.",
    url: "https://www.reteartistispettacolo.it/",
    email: SITE_CONTACTS.email,
    telephone: SITE_CONTACTS.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: "Via Po 43",
      postalCode: "00198",
      addressLocality: "Roma",
      addressCountry: "IT",
    },
    vatID: SITE_LEGAL.partitaIva,
    taxID: SITE_LEGAL.codiceFiscale,
    sameAs: [SITE_SOCIAL.facebook, SITE_SOCIAL.twitter, SITE_SOCIAL.instagram, SITE_SOCIAL.youtube],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
