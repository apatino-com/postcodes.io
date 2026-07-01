import { defineConfig } from "vitest/config";

// Tests are read-only against the seeded Postgres DB (test/seed/seed.sql.gz),
// so test files run in parallel — each fork gets its own pg pool.

export default defineConfig({
  test: {
    include: ["test/*.ts"],
    exclude: [
      "test/helper/**",
      "test/seed/**",
      "**/node_modules/**",
    ],
    testTimeout: 15000,
    hookTimeout: 15000,
    pool: "forks",
  },
});
