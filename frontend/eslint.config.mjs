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
  ]),
  {
    rules: {
      // Regla advisory de performance, no de correctness. La apagamos: usamos
      // patrones legítimos (guard de hidratación + fetch on-mount/intervalo).
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
