import type { Metadata } from "next";
import Link from "next/link";
import { LegalTemplateNotice } from "@/components/legal-notice";
import { ProsePage } from "@/components/prose-page";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = { title: "Privacy Policy", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  const l = siteConfig.legal;
  return (
    <ProsePage title="Privacy Policy" intro="How MalluMarktplatz processes personal data in accordance with the EU General Data Protection Regulation (GDPR).">
      <LegalTemplateNotice />
      <section>
        <h2>1. Controller</h2>
        <p>
          {l.operatorName}, {l.street}, {l.postalCity}, {l.country}. Email: <a href={`mailto:${l.email}`}>{l.email}</a>
        </p>
      </section>
      <section>
        <h2>2. Data we process</h2>
        <ul>
          <li>
            <strong>Account data</strong> (name, email address, password hash, preferred language) to provide your
            account – Art. 6(1)(b) GDPR.
          </li>
          <li>
            <strong>Business listing data</strong> submitted by business owners. Business contact details are only
            published after the owner&apos;s explicit consent and admin review. The owner&apos;s personal name is kept
            private unless the owner chooses to display it – Art. 6(1)(a) and (b) GDPR.
          </li>
          <li>
            <strong>Favourites</strong> you save, visible only to you – Art. 6(1)(b) GDPR.
          </li>
          <li>
            <strong>Reports</strong> about listings, including an optional email address for follow-up – Art. 6(1)(f) GDPR.
          </li>
          <li>
            <strong>Profile view statistics</strong>: we only store an aggregated daily counter per listing. No IP
            addresses, cookies or user identifiers are stored for this purpose.
          </li>
          <li>
            <strong>Technical data</strong> (server logs) required to operate the service securely – Art. 6(1)(f) GDPR.
          </li>
        </ul>
      </section>
      <section>
        <h2>3. Cookies</h2>
        <p>
          We only use strictly necessary cookies: an authentication cookie when you are logged in and a cookie that
          stores your language preference. We do not use advertising or tracking cookies.
        </p>
      </section>
      <section>
        <h2>4. Analytics</h2>
        <p>
          We use Vercel Web Analytics, a cookieless and privacy-friendly analytics service that does not track
          individual users across sites. Data is aggregated and anonymised.
        </p>
      </section>
      <section>
        <h2>5. Processors</h2>
        <ul>
          <li>Supabase (database, authentication and file storage) – hosted in the EU region selected for this project.</li>
          <li>Vercel (hosting and analytics).</li>
          <li>Mapbox (map display and address geocoding), only when you use the map features.</li>
        </ul>
        <p>Data processing agreements are in place with all processors.</p>
      </section>
      <section>
        <h2>6. Your rights</h2>
        <p>
          You have the right to access, rectification, erasure, restriction, data portability and objection, and the
          right to lodge a complaint with a supervisory authority. You can download your data and permanently delete
          your account at any time in your <Link href="/dashboard/settings">account settings</Link>. Business listings
          can be deleted from your dashboard, and anyone can request the removal of a listing using the &quot;Report
          this listing&quot; function.
        </p>
      </section>
      <section>
        <h2>7. Retention</h2>
        <p>
          We store personal data only as long as necessary for the purposes above. Deleting your account permanently
          removes your profile, listings, images and favourites.
        </p>
      </section>
    </ProsePage>
  );
}
