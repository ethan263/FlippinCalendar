import type { Metadata } from "next";

import { LegalPageShell } from "@/components/marketing/legal-page-shell";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms governing use of the flippinCalendar platform.",
  alternates: { canonical: "/terms" },
};

const LAST_UPDATED = "29 August 2026";

export default function TermsPage() {
  return (
    <LegalPageShell title="Terms of Service" lastUpdated={LAST_UPDATED}>
      <p>
        These draft terms govern access to <strong>flippinCalendar</strong>{" "}
        provided by <strong>[Business name]</strong> (
        <strong>[Company registration number]</strong>). By creating an account
        or using the service, you agree to these terms on behalf of your
        business.
      </p>

      <h2>1. The service</h2>
      <p>
        flippinCalendar provides online booking, team scheduling, customer
        messaging, and optional AI concierge features (text and voice) for
        businesses in South Africa and elsewhere. Features depend on your
        subscription plan.
      </p>

      <h2>2. Accounts and eligibility</h2>
      <p>
        You must be authorised to act for your business. You are responsible for
        activity under your account and for keeping sign-in credentials secure.
        Authentication is provided through Clerk.
      </p>

      <h2>3. Plans and billing</h2>
      <ul>
        <li>
          <strong>Core</strong> is free. <strong>Pro</strong> unlocks AI
          concierge features and is billed in ZAR via PayFast.
        </li>
        <li>
          Pro is sold as a <strong>one-time payment for a 30-day access
          period</strong>, not an automatically recurring subscription. We send
          renewal reminders before expiry; you must complete a new checkout to
          extend Pro access.
        </li>
        <li>
          Prices are shown on our pricing page and may change with notice for
          future periods.
        </li>
        <li>
          Refunds are handled at our discretion unless required by applicable
          consumer law. Contact <strong>[billing@flippincalendar.co.za]</strong>.
        </li>
      </ul>

      <h2>4. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>use the service unlawfully or to harass others;</li>
        <li>attempt to bypass security, quotas, or plan limits;</li>
        <li>upload malware or infringe third-party rights;</li>
        <li>
          use AI features to generate unlawful, deceptive, or harmful content.
        </li>
      </ul>
      <p>
        You are responsible for content on your public booking site and for
        obtaining any consents required from your customers.
      </p>

      <h2>5. AI concierge</h2>
      <p>
        AI responses are generated automatically and may be inaccurate. You must
        review critical bookings and not rely solely on the concierge for
        regulated or high-risk decisions. Voice and chat processing is provided
        by ElevenLabs under their terms.
      </p>

      <h2>6. Availability and support</h2>
      <p>
        We aim for high availability but do not guarantee uninterrupted access.
        Maintenance, third-party outages, or force majeure may affect the
        service. Support contact: <strong>[support@flippincalendar.co.za]</strong>.
      </p>

      <h2>7. Intellectual property</h2>
      <p>
        flippinCalendar, its software, and branding remain our property. You
        retain ownership of your business data. You grant us a licence to host
        and process your data to operate the service.
      </p>

      <h2>8. Limitation of liability</h2>
      <p>
        To the fullest extent permitted by South African law, we are not liable
        for indirect or consequential damages, or for loss of profits or data.
        Our aggregate liability for any claim relating to the service is limited
        to the fees you paid to us in the twelve months before the claim.
      </p>

      <h2>9. Termination</h2>
      <p>
        You may stop using the service at any time. We may suspend or terminate
        access for breach of these terms or non-payment. On termination, export
        your data promptly; we may delete data after a retention period.
      </p>

      <h2>10. Governing law</h2>
      <p>
        These terms are governed by the laws of the Republic of South Africa.
        Disputes are subject to the exclusive jurisdiction of South African
        courts, unless mandatory consumer protections provide otherwise.
      </p>

      <h2>11. Changes</h2>
      <p>
        We may update these terms. Continued use after changes constitutes
        acceptance. Material changes will be communicated via the dashboard or
        email where practicable.
      </p>
    </LegalPageShell>
  );
}
