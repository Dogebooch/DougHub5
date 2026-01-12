import type { ElectronAPI } from "@/types/electron";

/**
 * Returns the typed Electron bridge if it exists in the current environment.
 * Falls back to null for tests or non-Electron renderers to prevent runtime errors.
 */
export function getWindowApi(): ElectronAPI | null {
  if (typeof window === "undefined") return null;
  return window.api ?? null;
}
