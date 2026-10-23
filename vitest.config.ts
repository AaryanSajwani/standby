import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

// Unit tests cover the pure-logic foundations only (state machine, verification
// codes, fee math, reliability, content guards, risk engine). No DB, no DOM — plain Node.
// These modules are deliberately side-effect-free so they can be verified
// without a running Supabase instance. See standby-autonomous-progress.md.
export default defineConfig({
  resolve: {
    // Mirror tsconfig's "@/*" path so tests can import runtime values
    // (e.g. EMPTY_FORM_DATA) the same way app code does.
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
})
