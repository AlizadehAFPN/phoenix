import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      /**
       * BRIEF §2.6: no literal colours, fonts or sizes in the site's code —
       * every value resolves from the token layer, which is itself extracted
       * from the Phoenix app's theme. The generated token files are the one
       * place a hex literal may exist, and they are excluded below.
       */
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/^#[0-9a-fA-F]{3,8}$/]",
          message:
            "No literal colours in src/. Add the value to the token layer first, then read it from `@/theme`.",
        },
        {
          selector: "TemplateElement[value.raw=/#[0-9a-fA-F]{6}/]",
          message:
            "No literal colours in src/. Add the value to the token layer first, then read it from `@/theme`.",
        },
      ],
    },
  },
  {
    files: ["src/theme/tokens.generated.ts"],
    rules: { "no-restricted-syntax": "off" },
  },
  {
    /**
     * The scene mutates three.js objects — uniforms, vectors, materials,
     * the camera — inside `useFrame` callbacks, which is how a render loop
     * works and never happens during a React render. The compiler's
     * immutability rule cannot tell a frame callback from a render, so for
     * these files the rule that is right about three.js wins. Every other
     * compiler rule stays on.
     */
    files: ["src/components/scene/**/*.{ts,tsx}"],
    rules: { "react-hooks/immutability": "off" },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
    "public/**",
  ]),
]);
