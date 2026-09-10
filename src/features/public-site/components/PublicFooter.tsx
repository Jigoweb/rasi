import Link from "next/link";
import { footerNav } from "../nav";
import {
  AWARD_SYSTEM_URL,
  SITE_CONTACTS,
  SITE_LEGAL,
  SITE_LEGAL_NAME,
  SITE_NAME,
  SITE_SOCIAL,
  SITE_TAGLINE,
} from "../site-info";

export function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-anthropic-light-gray bg-anthropic-light text-anthropic-mid-gray">
      <div className="container mx-auto py-12 px-4 md:px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="space-y-4">
          <h3 className="font-poppins font-bold text-lg text-anthropic-dark">{SITE_NAME}</h3>
          <p className="text-sm">{SITE_LEGAL_NAME}. {SITE_TAGLINE}</p>
          <a
            href={AWARD_SYSTEM_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-sm text-anthropic-orange hover:underline"
          >
            Award System
          </a>
        </div>
        <div className="space-y-4">
          <h4 className="font-poppins font-semibold text-anthropic-dark">Istituzionale</h4>
          <ul className="space-y-2 text-sm">
            {footerNav.istituzionale.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-anthropic-orange">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-4">
          <h4 className="font-poppins font-semibold text-anthropic-dark">Servizi</h4>
          <ul className="space-y-2 text-sm">
            {footerNav.servizi.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-anthropic-orange">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-4">
          <h4 className="font-poppins font-semibold text-anthropic-dark">Contatti</h4>
          <ul className="space-y-2 text-sm">
            <li>{SITE_CONTACTS.address}</li>
            <li>
              <a href={SITE_CONTACTS.phoneHref} className="hover:text-anthropic-orange">
                Tel. {SITE_CONTACTS.phone}
              </a>
            </li>
            <li>
              <a href={SITE_CONTACTS.emailHref} className="hover:text-anthropic-orange">
                {SITE_CONTACTS.email}
              </a>
            </li>
            <li>
              <a href={SITE_CONTACTS.pecHref} className="hover:text-anthropic-orange">
                PEC {SITE_CONTACTS.pec}
              </a>
            </li>
            <li className="flex gap-3 pt-2">
              <a href={SITE_SOCIAL.facebook} target="_blank" rel="noreferrer" className="hover:text-anthropic-orange">
                Facebook
              </a>
              <a href={SITE_SOCIAL.instagram} target="_blank" rel="noreferrer" className="hover:text-anthropic-orange">
                Instagram
              </a>
              <a href={SITE_SOCIAL.youtube} target="_blank" rel="noreferrer" className="hover:text-anthropic-orange">
                YouTube
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-anthropic-light-gray py-6 px-4 text-center text-xs space-y-2">
        <p>
          © {year} {SITE_NAME}. Tutti i diritti riservati. P.IVA {SITE_LEGAL.partitaIva} · C.F.{" "}
          {SITE_LEGAL.codiceFiscale} · REA {SITE_LEGAL.rea} · Albo Coop. {SITE_LEGAL.alboCoop} ·
          Codice univoco {SITE_LEGAL.codiceUnivoco}
        </p>
      </div>
    </footer>
  );
}
