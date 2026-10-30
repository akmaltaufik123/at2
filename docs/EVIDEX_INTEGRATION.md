<!-- Hallmark · macrostructure: product-workflow · theme: ate-charcoal · genre: modern-minimal
pre-emit critique: P4 H4 E4 S5 R5 V4 · slop test: pass (EVIDEX addition) -->
# EVIDEX website integration

The domain's existing source is `akmaltaufik123/at2`, branch `root`. The served
homepage matched the repository before this edit, apart from Cloudflare email
obfuscation. This integration adds an EVIDEX navigation anchor and product
section between services and booking. It does not deploy the Python service.

## Durable preview

- Genre: modern-minimal product explanation inside the established ATE website.
- Structure: product purpose, three numbered workflow steps alongside availability
  and downloads, followed by file formats and integrity notes.
- Theme: ATE charcoal/red using the existing named palette tokens.
- Typography: existing Orbitron headings and Chakra Petch body, referenced through
  named font tokens in the additive stylesheet.
- Copy: Malay and English use the existing language switch and `js/lang.js`.
- Controls: installation guide, source ZIP and repository links point to real
  EVIDEX resources. No disabled or fake "launch" action is shown.
- Availability: current local-browser version requires Python and packages;
  hosted public acquisition has not launched. No Telegram credential or evidence
  upload form is exposed on the static site.
- Boundaries: no changes to booking, authentication, Supabase configuration,
  existing service content, gateway routing, DNS or backend infrastructure.
- Refinement: desktop navigation spacing keeps labels on one line after adding
  EVIDEX. Existing mobile hamburger behavior is preserved.
- Self-review: Philosophy 4, Hierarchy 4, Execution 4, Specificity 5, Restraint 5,
  Variety 4. This is a design review, not a product metric.

## Validation

`node --test tests/*.test.js`: 14 passed; one existing live Supabase matrix is
skipped without test credentials. `node --check js/lang.js` and `git diff --check`
passed. The real browser checked Malay/English, links, navigation and responsive
EVIDEX rendering inside test-only viewports of 320/375/414/768/1280px: no page
horizontal overflow or clipped EVIDEX links. Existing site styling and font
loading were retained. No claim is made to have redesigned or audited every
pre-existing page or decorative effect.

The local preview configuration and responsive test wrapper are untracked
checkout-only files, not production routes or new hosting identity. Publish
through the website's existing Git integration; do not create a replacement site.
