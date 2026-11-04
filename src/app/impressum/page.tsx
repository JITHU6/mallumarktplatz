import type { Metadata } from "next";
import { LegalTemplateNotice } from "@/components/legal-notice";
import { ProsePage } from "@/components/prose-page";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = { title: "Impressum", alternates: { canonical: "/impressum" } };

export default function ImpressumPage() {
  const l = siteConfig.legal;
  return (
    <ProsePage title="Impressum">
      <LegalTemplateNotice />
      <section>
        <h2>Angaben gemäß § 5 DDG</h2>
        <p>
          {l.operatorName}
          <br />
          {l.street}
          <br />
          {l.postalCity}
          <br />
          {l.country}
        </p>
      </section>
      <section>
        <h2>Kontakt</h2>
        <p>
          E-Mail: <a href={`mailto:${l.email}`}>{l.email}</a>
          {l.phone && (
            <>
              <br />
              Telefon: {l.phone}
            </>
          )}
        </p>
      </section>
      <section>
        <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
        <p>
          {l.responsiblePerson}
          <br />
          {l.street}, {l.postalCity}
        </p>
      </section>
      <section>
        <h2>Haftung für Inhalte und Einträge</h2>
        <p>
          Die Brancheneinträge auf MalluMarktplatz werden von den jeweiligen Unternehmen bereitgestellt. Wir prüfen
          Einträge vor der Veröffentlichung, übernehmen jedoch keine Gewähr für die Richtigkeit, Vollständigkeit und
          Aktualität der Angaben. Ein „Verifiziert“-Abzeichen wird nur angezeigt, wenn unser Team die Angaben
          tatsächlich überprüft hat.
        </p>
      </section>
      <section>
        <h2>Haftung für Links</h2>
        <p>
          Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Für
          die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber verantwortlich.
        </p>
      </section>
      <section>
        <h2>Verbraucherstreitbeilegung</h2>
        <p>Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
      </section>
    </ProsePage>
  );
}
