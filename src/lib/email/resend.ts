import "server-only";

type SendEmailArgs = {
  to: string[];
  subject: string;
  html: string;
  text?: string;
};

export async function sendResendEmail(args: SendEmailArgs): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim() ?? "billing@flippincalendar.co.za";

  if (!apiKey) {
    console.warn("[resend] RESEND_API_KEY not set — skipping email send.");
    return false;
  }

  const recipients = args.to.filter(Boolean);
  if (recipients.length === 0) {
    return false;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: recipients,
      subject: args.subject,
      html: args.html,
      text: args.text,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend failed (${response.status}): ${detail}`);
  }

  return true;
}
