import { emailFrom, emailReplyTo, getResend } from "@/lib/email/client";
import { WelcomeEmail } from "@/emails/welcome";

/**
 * Email sending helpers — the single entry point for outbound email.
 * Wrap your call in try/catch in the caller; logs on failure.
 */
export async function sendWelcomeEmail({
  to,
  name,
}: {
  to: string;
  name?: string;
}) {
  const resend = getResend();
  return resend.emails.send({
    from: emailFrom,
    to,
    replyTo: emailReplyTo,
    subject: `Welcome aboard`,
    react: WelcomeEmail({ name }),
  });
}
