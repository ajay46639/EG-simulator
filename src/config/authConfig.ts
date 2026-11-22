/**
 * EG SIMULATOR - Authentication & Access Configuration
 * 
 * Update your Special Key in any of the following 3 ways:
 * 1. (Recommended for Vercel): Add Environment Variable `VITE_ACCESS_KEY` in Vercel Project Settings.
 * 2. In `.env` or `.env.local`: `VITE_ACCESS_KEY=your_new_key_here`
 * 3. Directly edit `DEFAULT_ACCESS_KEY` below.
 */

// Formspree endpoint for tracking authorized & unauthorized attempts
export const FORMSPREE_ENDPOINT = 'https://formspree.io/f/maeopqqb';

// Default special access key (fallback if no environment variable is set)
export const DEFAULT_ACCESS_KEY = 'EG-SIM-2026-VIP';

// Local storage keys
export const AUTH_STORAGE_KEY = 'eg_simulator_auth_session';

/**
 * Returns the currently active special access key.
 * Prioritizes Vercel / Vite environment variables (`VITE_ACCESS_KEY`),
 * falling back to `DEFAULT_ACCESS_KEY`.
 */
export function getActiveAccessKey(): string {
  const envKey = (import.meta.env.VITE_ACCESS_KEY || import.meta.env.VITE_SPECIAL_KEY || '') as string;
  const trimmedEnv = envKey.trim();
  return trimmedEnv.length > 0 ? trimmedEnv : DEFAULT_ACCESS_KEY;
}

/**
 * Simple key hashing for session validation (invalidates sessions when admin rotates the key).
 */
export function hashKey(key: string): string {
  let hash = 0;
  const str = key.trim();
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `k_${Math.abs(hash).toString(16)}`;
}
