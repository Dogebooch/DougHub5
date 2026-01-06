import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    // Environment for Electron main process testing
    environment: "node",

    // Global test setup
    setupFiles: ["./tests/helpers/test-setup.ts"],

    // Include patterns
    include: [
      "tests/**/*.{test,spec}.{js,ts}",
      "src/**/*.{test,spec}.{ts,tsx}",
    ],

    // Benchmark patterns
    benchmark: {
      include: ["tests/performance/**/*.bench.{js,ts}"],
    },

    // Test timeout (increase for performance tests)
    testTimeout: 10000,

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["electron/**/*.ts"],
      exclude: [
        "electron/**/*.d.ts",
        "electron/electron-env.d.ts",
        "dist-electron/**",
      ],
      // Target 80% coverage for critical database/backup code
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },

    // Globals for easier testing
    globals: true,

    // Parallel execution
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
  },

  // Resolve aliases to match main app
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@electron": path.resolve(__dirname, "./electron"),
    },
  },
});
