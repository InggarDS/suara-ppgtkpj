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
    // react-three-fiber's useFrame model is inherently imperative — it
    // mutates refs, camera and material objects every frame outside React's
    // render cycle by design (that's how it animates at 60fps without
    // triggering a re-render). The React Compiler-oriented
    // react-hooks/immutability rule doesn't recognize that pattern and flags
    // essentially every line of any useFrame callback; scope the exception
    // to just this 3D integration rather than disabling it project-wide.
    //
    // react-hooks/purity similarly flags Math.random() used to seed each
    // confetti particle's initial position inside useMemo(..., []) — the
    // standard "generate stable random data once on mount" pattern. Safe
    // here because the empty dep array means it genuinely only runs once.
    files: ["src/components/three/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
    },
  },
]);

export default eslintConfig;
