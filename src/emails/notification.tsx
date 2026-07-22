import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "react-email";

import { siteConfig } from "@/lib/site";

/**
 * Generic notification email. Rendered by the dispatcher for any
 * system-generated notification that survives the preference gate.
 * Pass an unsubscribeUrl pre-signed by `signUnsubscribeToken`.
 */
export function NotificationEmail({
  title,
  body,
  actionUrl,
  actionLabel,
  unsubscribeUrl,
}: {
  title: string;
  body?: string;
  actionUrl?: string;
  actionLabel?: string;
  unsubscribeUrl?: string;
}) {
  const year = new Date().getFullYear();
  const preview = title.slice(0, 100);
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind>
        <Body className="bg-[#f6f9fc] py-[40px] font-sans">
          <Container className="mx-auto max-w-[565px] rounded-[8px] bg-white p-[40px]">
            <Heading className="mb-[16px] text-[24px] font-semibold text-[#111111]">
              {title}
            </Heading>
            {body ? (
              <Text className="mb-[24px] text-[14px] leading-[24px] text-[#415159]">
                {body}
              </Text>
            ) : null}
            {actionUrl && actionLabel ? (
              <Section className="mb-[32px] text-center">
                <Button
                  href={actionUrl}
                  className="rounded-[6px] bg-[#0a0a0a] px-[24px] py-[12px] text-[14px] font-medium text-white no-underline"
                >
                  {actionLabel}
                </Button>
              </Section>
            ) : null}
            <Hr className="mx-0 my-[24px] w-full border border-solid border-[#e6ebf1]" />
            {unsubscribeUrl ? (
              <Text className="text-[12px] leading-[20px] text-[#8895a7]">
                Don&apos;t want these emails?{" "}
                <Link
                  href={unsubscribeUrl}
                  className="text-[#8895a7] underline"
                >
                  Unsubscribe
                </Link>
                .
              </Text>
            ) : null}
            <Text className="text-[12px] leading-[20px] text-[#8895a7]">
              &copy; {year} {siteConfig.name}
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export default NotificationEmail;
