import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "docs/**",
    // Plain-node utility scripts and data stores, not app code.
    "scripts/**",
    "data/**",
    "db/**",
    "var/**",
  ]),
  // ── Styling standard (Trust-Agent rulebook) ────────────────────
  // Rules are `warn` while the codebase converges, then upgrade to
  // `error` once a sweep has cleaned the remaining occurrences.
  {
    files: ["**/*.tsx"],
    rules: {
      "no-restricted-syntax": [
        "warn",
        {
          // Inline style={{}} in TSX. Reserved for runtime-dynamic values
          // (chart fills, user-picked colours, CSS custom-prop animation
          // targets). Static styling goes through Tailwind classes.
          selector: "JSXAttribute[name.name='style']",
          message:
            "Inline style={{}} is reserved for runtime-dynamic values. " +
            "Use a Tailwind utility class instead.",
        },
        {
          // Hex-literal colour strings in JSX. Colours must come from
          // design-system tokens exposed via @theme in app/globals.css.
          selector:
            "JSXElement Literal[value=/#(?:[0-9a-fA-F]{3}){1,2}\\b/]",
          message:
            "Hex literals aren't allowed in JSX. Use a design-system token " +
            "via className (e.g. 'text-brand').",
        },
      ],
    },
  },
]);

export default eslintConfig;
