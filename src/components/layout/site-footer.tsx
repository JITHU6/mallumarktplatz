import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { FacebookIcon as Facebook, InstagramIcon as Instagram, LinkedinIcon as Linkedin } from "@/components/icons/social-icons";
import { siteConfig } from "@/config/site";
import { Logo } from "./logo";

export async function SiteFooter() {
  const t = await getTranslations("footer");
  const tc = await getTranslations("common");

  const platform = [
    { href: "/about", label: t("about") },
    { href: "/contact", label: t("contact") },
    { href: "/register-business", label: t("registerBusiness") },
  ];
  const legal = [
    { href: "/privacy", label: t("privacy") },
    { href: "/terms", label: t("terms") },
    { href: "/impressum", label: t("impressum") },
  ];
  const social = [
    { href: siteConfig.social.instagram, label: "Instagram", Icon: Instagram },
    { href: siteConfig.social.facebook, label: "Facebook", Icon: Facebook },
    { href: siteConfig.social.linkedin, label: "LinkedIn", Icon: Linkedin },
  ].filter((s) => s.href);

  return (
    <footer className="mt-auto bg-forest text-cream">
      <div className="kasavu-rule" />
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div className="space-y-4">
          <Logo inverted />
          <p className="max-w-sm text-sm leading-relaxed text-cream/75">{t("description")}</p>
          <p className="text-sm font-semibold text-gold">{tc("tagline")}</p>
        </div>
        <FooterColumn title={t("platform")} links={platform} />
        <FooterColumn title={t("legal")} links={legal} />
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gold">{t("follow")}</h2>
          {social.length > 0 ? (
            <ul className="flex gap-2">
              {social.map(({ href, label, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="flex size-10 items-center justify-center rounded-full bg-cream/10 transition-colors hover:bg-gold hover:text-charcoal"
                  >
                    <Icon className="size-4" />
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <a href={`mailto:${siteConfig.contactEmail}`} className="text-sm text-cream/75 hover:text-gold">
              {siteConfig.contactEmail}
            </a>
          )}
        </div>
      </div>
      <div className="border-t border-cream/10">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-cream/60 md:flex-row md:justify-between">
          <p>{t("rights", { year: new Date().getFullYear() })}</p>
          <p>{t("independent")}</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gold">{title}</h2>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-sm text-cream/80 transition-colors hover:text-gold">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
