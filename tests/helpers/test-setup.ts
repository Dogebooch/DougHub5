/**
 * Global Test Setup
 * 
 * Runs before all tests to configure Vitest environment and mocks.
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { setupElectronMocks, resetElectronMocks, cleanupTempDirs } from './electron-mocks'

// Setup Electron mocks globally
beforeAll(() => {
  setupElectronMocks()
})

// Cleanup after all tests
afterAll(() => {
  cleanupTempDirs()
})

// Reset mocks before each test for isolation
beforeEach(() => {
  resetElectronMocks()
})

// Cleanup after each test
afterEach(() => {
  // Additional per-test cleanup if needed
})
