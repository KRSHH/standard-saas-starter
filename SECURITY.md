# Security Policy

## Reporting a vulnerability

Please **do not open a public issue** for security vulnerabilities.

Report privately via
[GitHub Security Advisories](https://github.com/KRSHH/standard-saas-starter/security/advisories/new)
("Report a vulnerability"). You'll get a response within a few days.

## Scope

This is a template — vulnerabilities in the template code itself (auth flows,
webhook verification, RLS policies, CSP, rate limiting, upload handling,
unsubscribe tokens) are in scope. Vulnerabilities in upstream dependencies
should be reported to those projects, though a heads-up here is appreciated if
the template's default configuration is affected.

## Security baseline

The template ships with defense-in-depth defaults, documented in the README:
strict CSP with per-request nonces, RLS on every table, revoked default
privileges, webhook signature verification with idempotency, rate limiting
(fails closed in production without distributed storage), signed upload URLs,
HMAC unsubscribe tokens, and a full security header bundle.
