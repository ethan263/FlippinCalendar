import type { Metadata } from "next";

import { LegalPageShell } from "@/components/marketing/legal-page-shell";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How flippinCalendar collects, uses, and protects personal information.",
  alternates: { canonical: "/privacy" },
};

const LAST_UPDATED = "29 August 2026";

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy Policy" lastUpdated={LAST_UPDATED}>
      <p>
        This draft privacy policy describes how <strong>flippinCalendar</strong>{" "}
        (operated by <strong>[Business name]</strong>, registration no.{" "}
        <strong>[Company registration number]</strong>, with registered address{" "}
        <strong>[Physical address, South Africa]</strong>) processes personal
        information when you use our booking and AI concierge platform.
      </p>

      <h2>1. Who we are</h2>
      <p>
        flippinCalendar is a software-as-a-service product for businesses to
        manage online bookings, customer conversations, and an optional AI web
        concierge. Contact: <strong>[privacy@flippincalendar.co.za]</strong>.
      </p>

      <h2>2. Information we collect</h2>
      <ul>
        <li>
          <strong>Account data</strong> — name, email, and organisation details
          when you sign in via Clerk.
        </li>
        <li>
          <strong>Booking data</strong> — customer names, contact details, and
          appointment information entered by your business or customers.
        </li>
        <li>
          <strong>Payment metadata</strong> — plan status and PayFast transaction
          references. We do not store card numbers; payments are processed by
          PayFast.
        </li>
        <li>
          <strong>AI concierge interactions</strong> — chat or voice session
          content processed via ElevenLabs to fulfil booking requests on your
          public site.
        </li>
        <li>
          <strong>Technical data</strong> — IP address, browser type, and usage
          logs for security and service improvement.
        </li>
      </ul>

      <h2>3. How we use information</h2>
      <p>We use personal information to:</p>
      <ul>
        <li>provide and secure the flippinCalendar service;</li>
        <li>process subscriptions and send billing or renewal notices;</li>
        <li>operate AI concierge features enabled on your plan;</li>
        <li>comply with law and respond to lawful requests.</li>
      </ul>

      <h2>4. Processors and transfers</h2>
      <p>
        We use trusted subprocessors, including Clerk (authentication), Supabase
        (database hosting), Vercel (application hosting), PayFast (payments),
        ElevenLabs (voice and chat AI), and Resend (transactional email). Data
        may be processed outside South Africa where those providers operate;
        appropriate safeguards are applied contractually.
      </p>

      <h2>5. Retention</h2>
      <p>
        We retain data while your account is active and for a reasonable period
        afterward for backups, billing records, and legal obligations. You may
        request deletion subject to applicable law.
      </p>

      <h2>6. Your rights (POPIA)</h2>
      <p>
        Under the Protection of Personal Information Act 4 of 2013 (POPIA), you
        may request access, correction, or deletion of your personal information,
        and object to certain processing. Contact us at the address above. You
        may lodge a complaint with the Information Regulator of South Africa.
      </p>

      <h2>7. Security</h2>
      <p>
        We use encryption in transit, access controls, and row-level security in
        our database. No method of transmission over the Internet is fully
        secure; we work to protect your data proportionate to the risk.
      </p>

      <h2>8. Changes</h2>
      <p>
        We may update this policy. Material changes will be posted on this page
        with a revised date.
      </p>
    </LegalPageShell>
  );
}
