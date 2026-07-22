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
 * Welcome email — sent on signup.
 * Tailwind via react-email's built-in Tailwind config (no tailwind.config needed).
 */
export function WelcomeEmail({
  name = "there",
  loginUrl = `${siteConfig.url}/sign-in`,
}: {
  name?: string;
  loginUrl?: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to {siteConfig.name} — let&apos;s get started.</Preview>
      <Tailwind>
        <Body className="bg-gray-50 font-sans text-gray-900">
          <Container className="mx-auto my-[40px] max-w-[565px] rounded border border-solid border-gray-200 bg-white p-[20px]">
            <Section className="mt-[16px]">
              <Heading className="text-[24px] font-semibold tracking-tight text-gray-900">
                Welcome to {siteConfig.name}
              </Heading>
            </Section>
            <Section>
              <Text className="text-[14px] leading-[24px] text-gray-600">
                Hi {name},
              </Text>
              <Text className="text-[14px] leading-[24px] text-gray-600">
                Thanks for signing up. {siteConfig.name} gives you everything
                you need to build and ship — auth, billing, observability, and a
                hardened security baseline.
              </Text>
              <Text className="text-[14px] leading-[24px] text-gray-600">
                Your 14-day free trial has started. No credit card required.
              </Text>
              <Section className="mt-[28px] mb-[24px] text-center">
                <Button
                  className="rounded bg-gray-900 px-6 py-3 text-center text-[14px] font-semibold text-white no-underline"
                  href={loginUrl}
                >
                  Get started
                </Button>
              </Section>
            </Section>
            <Hr className="mx-0 my-[24px] h-[1px] w-full border-0 bg-gray-200" />
            <Section>
              <Text className="text-[12px] leading-[20px] text-gray-500">
                If you didn&apos;t create an account, you can safely ignore this
                email.
              </Text>
              <Text className="text-[12px] leading-[20px] text-gray-500">
                &copy; {new Date().getFullYear()} {siteConfig.name}.{" "}
                <Link
                  href={siteConfig.url}
                  className="text-gray-500 no-underline"
                >
                  {siteConfig.url}
                </Link>
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export default WelcomeEmail;
