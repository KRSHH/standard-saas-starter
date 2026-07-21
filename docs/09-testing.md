# 09 — Testing

Vitest for unit tests, Playwright for E2E. Both are preconfigured and runnable
out of the box.

---

## Unit tests (Vitest)

### Config

`vitest.config.ts`:

- **Environment:** `jsdom` (DOM APIs available).
- **Globals:** `true` (`describe`, `it`, `expect` without imports).
- **Setup:** `vitest.setup.ts` (testing-library matchers).
- **Alias:** `@` → `./src` (matches `tsconfig.json`).
- **Coverage:** v8 provider, excludes config/schema/layout files.

### Commands

```bash
bun run test          # run once
bun run test:watch    # watch mode
```

### Where tests live

Co-located with the code they test (`*.test.ts(x)` next to the source file):

```
src/lib/
├── audit/sanitize.test.ts
├── auth/oauth-providers.test.ts
├── notifications/tokens.test.ts
├── payments/{plans,subscriptions}.test.ts
├── uploads/{paths,quota}.test.ts
└── utils.test.ts
```

Co-location keeps tests discoverable — if you're editing `tokens.ts`, the test
is right there.

### What's tested

The template tests **pure logic** — the parts worth testing without a full
environment:

- **`sanitize.test.ts`** — audit metadata redaction (sensitive keys stripped).
- **`tokens.test.ts`** — unsubscribe token sign/verify/expire/invalid.
- **`plans.test.ts`** — plan config shape + slug typing.
- **`subscriptions.test.ts`** — `isEntitled()` gate logic (the billing gate).
- **`paths.test.ts` / `quota.test.ts`** — upload path building + quota math.
- **`oauth-providers.test.ts`** — provider registry shape.
- **`utils.test.ts`** — the `cn()` classname helper.

### Writing a unit test

```ts
// src/lib/my-thing.test.ts
import { myThing } from "./my-thing";

describe("myThing", () => {
  it("does the thing", () => {
    expect(myThing("input")).toBe("output");
  });
});
```

The config picks up any `src/**/*.test.{ts,tsx}` automatically.

### Testing components

For React component tests, use `@testing-library/react` (already a
devDependency). The setup file wires `@testing-library/jest-dom` matchers
(`toBeInTheDocument`, etc.).

---

## E2E tests (Playwright)

### Config

`playwright.config.ts`:

- **testDir:** `./e2e`
- **Base URL:** `http://localhost:3000`
- **Auto-starts dev server:** `bun run dev` (webServer config).
- **Trace:** on first retry. Screenshot: on failure.
- **Browser:** Chromium (add projects for Firefox/Safari if you need them).
- **CI:** `forbidOnly`, 2 retries, 1 worker, GitHub reporter.

### Commands

```bash
bun run test:e2e     # headless
bun run test:e2e:ui  # interactive UI mode (great for debugging)
```

### Where tests live

```
e2e/
├── auth.spec.ts           # sign-in / sign-up / sign-out flows
├── marketing.spec.ts      # public pages render
├── notifications.spec.ts  # bell + list + mark-as-read
├── security-seo.spec.ts   # CSP headers, robots, sitemap
└── fixtures/              # test data / helpers
```

### Running E2E

Playwright auto-starts `bun run dev` on port 3000 (if not already running)
and waits for it. In CI (`CI=true`), it starts a fresh server.

```bash
# Run everything
bun run test:e2e

# Run one file
bun run test:e2e -- e2e/auth.spec.ts

# Run by title regex
bun run test:e2e -- -g "sign in"

# Debug interactively
bun run test:e2e:ui
```

### Auth in E2E

The auth tests need real Supabase users (or mocked auth). The template's
`e2e/fixtures/` is where you'd put test-user setup. For CI, either:

- Use a dedicated Supabase project with known test users, or
- Mock the Supabase client in tests (harder — the middleware calls Supabase).

---

## The `check` script

```bash
bun run check
```

Runs typecheck + lint + format:check in sequence. Run this before committing —
CI runs the same thing.

### Individual checks

| Command | What |
|---------|------|
| `bun run typecheck` | `tsc --noEmit` |
| `bun run lint` | ESLint (flat config, `--max-warnings=0`) |
| `bun run lint:fix` | ESLint with `--fix` |
| `bun run format` | Prettier write |
| `bun run format:check` | Prettier check |

---

## CI considerations

The template doesn't ship a GitHub Actions workflow, but the commands are
CI-ready:

```yaml
- run: bun install --frozen-lockfile
- run: bun run check
- run: bun run test
- run: bun run test:e2e
  env:
    CI: "true"
```

For E2E in CI you need the `NEXT_PUBLIC_*` env vars set (Playwright builds the
app via `bun run dev`). See [Environment Variables → CI](./02-environment-variables.md#ci-github-actions).

---

## Common tasks

### Add a unit test

Create `*.test.ts` next to the file. Vitest picks it up automatically.

### Add an E2E test

Create `e2e/<area>.spec.ts`. Playwright auto-starts the dev server.

### Skip a flaky test

```ts
it.skip("flaky thing", () => { ... });
// or in CI only:
it.skipConditionally(process.env.CI, "flaky in CI")("...", () => { ... });
```

### Debug a failing E2E

```bash
bun run test:e2e:ui -- e2e/auth.spec.ts
```

Opens Playwright UI mode with step-by-step traces, inspector, and time-travel.

### Test something that needs a database

Unit tests shouldn't hit the DB — extract the pure logic and test that. For
DB integration, use an E2E test against a dev Supabase project.
