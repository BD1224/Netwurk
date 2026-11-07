// Lint rules. Also enforces the boundary rule: UI code may not import from src/services.
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts"] },
  {
    files: ["src/components/**", "src/hooks/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ group: ["@/services/*", "@/lib/anthropic"], message: "UI code may not import server-only modules." }] },
      ],
    },
  },
];

export default config;
