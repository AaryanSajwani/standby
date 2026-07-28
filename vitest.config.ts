import { defineConfig } from "vitest/config"

// Unit tests cover the pure-logic foundations only (state machine, verification
// codes, fee math, reliability, content guards). No DB, no DOM — plain Node.
// These modules are deliberately side-effect-free so they can be verified
// without a running Supabase instance. See standby-autonomous-progress.md.
export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
})
