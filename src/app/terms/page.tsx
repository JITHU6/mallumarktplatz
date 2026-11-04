import type { Metadata } from "next";
import { LegalTemplateNotice } from "@/components/legal-notice";
import { ProsePage } from "@/components/prose-page";

export const metadata: Metadata = { title: "Terms & Conditions", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  return (
    <ProsePage title="Terms & Conditions">
      <LegalTemplateNotice />
      <section>
        <h2>1. Service</h2>
        <p>
          MalluMarktplatz is a free, community-driven directory of Malayali-owned businesses and professionals in
          Germany. We do not sell products or services ourselves and are not a party to any agreement between users
          and listed businesses.
        </p>
      </section>
      <section>
        <h2>2. Accounts</h2>
        <p>
          You must provide accurate information and keep your password confidential. You may delete your account at any
          time.
        </p>
      </section>
      <section>
        <h2>3. Business listings</h2>
        <ul>
          <li>You may only list a business you own or are authorised to represent.</li>
          <li>Information must be accurate, lawful and must not infringe third-party rights (including image rights).</li>
          <li>All listings and significant changes are reviewed before publication. We may reject, edit, suspend or remove listings.</li>
          <li>
            A &quot;Verified&quot; badge is only granted after our team has checked a business&apos;s details. Listings
            must not claim verification otherwise.
          </li>
        </ul>
      </section>
      <section>
        <h2>4. Acceptable use</h2>
        <p>Spam, misleading content, scraping, and attempts to bypass security measures are prohibited.</p>
      </section>
      <section>
        <h2>5. Liability</h2>
        <p>
          Listing content is provided by businesses. We are liable without limitation for intent and gross negligence;
          otherwise liability is limited to the extent permitted by law.
        </p>
      </section>
      <section>
        <h2>6. Changes and governing law</h2>
        <p>We may update these terms and will inform registered users of material changes. German law applies.</p>
      </section>
    </ProsePage>
  );
}
