import {
  AUTH_STORAGE_KEY,
  FORMSPREE_ENDPOINT,
  getActiveAccessKey,
  hashKey,
} from '../config/authConfig';

export interface AuthSession {
  name: string;
  email: string;
  keyHash: string;
  loggedInAt: string;
}

export interface VerifyKeyResult {
  valid: boolean;
  message?: string;
}

/**
 * Verifies if the entered key matches the authorized special key.
 * 1. Attempts serverless verification via /api/verify-access (on Vercel).
 * 2. Falls back to client-side configuration key match.
 */
export async function verifySpecialKey(enteredKey: string): Promise<VerifyKeyResult> {
  const cleanKey = enteredKey.trim();
  if (!cleanKey) {
    return { valid: false, message: 'Please enter a special access key.' };
  }

  // Attempt serverless API verification if available (e.g. deployed on Vercel)
  try {
    const res = await fetch('/api/verify-access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ key: cleanKey }),
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (typeof data.valid === 'boolean') {
        return {
          valid: data.valid,
          message: data.valid ? undefined : 'Invalid special access key. Access denied.',
        };
      }
    }
  } catch {
    // If /api/verify-access is not available (e.g. static dev without serverless),
    // proceed to client-side verification below.
  }

  // Client-side verification
  const expectedKey = getActiveAccessKey();
  const isValid = cleanKey === expectedKey;

  return {
    valid: isValid,
    message: isValid ? undefined : 'Invalid special access key. Access denied.',
  };
}

/**
 * Submits the user registration & access attempt to Formspree.
 * Sends notification regardless of whether the key was right or wrong!
 * Endpoint: https://formspree.io/f/maeopqqb
 */
export async function submitAccessToFormspree(
  name: string,
  email: string,
  key: string,
  isAuthorized: boolean
): Promise<{ success: boolean; message?: string }> {
  try {
    const payload = {
      name: name.trim(),
      email: email.trim(),
      accessKey: key.trim(),
      status: isAuthorized ? 'ACCESS_GRANTED' : 'ACCESS_DENIED_WRONG_KEY',
      accessResult: isAuthorized ? 'Authorized (Access Granted)' : 'Rejected (Invalid Key Attempt - Access Denied)',
      application: 'EG SIMULATOR (Engineering Drawing Simulator)',
      loginTime: new Date().toLocaleString(),
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      _subject: isAuthorized
        ? `[EG SIMULATOR Access Granted] ${name.trim()} (${email.trim()})`
        : `⚠️ [EG SIMULATOR Access Denied - Wrong Key] ${name.trim()} (${email.trim()})`,
    };

    const response = await fetch(FORMSPREE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      return { success: true };
    } else {
      const data = await response.json().catch(() => ({}));
      const errorMsg = data?.error || 'Formspree could not record submission.';
      console.warn('Formspree response warning:', errorMsg);
      return { success: true, message: errorMsg };
    }
  } catch (err: unknown) {
    console.error('Formspree submission error:', err);
    return {
      success: true,
      message: err instanceof Error ? err.message : 'Network error communicating with Formspree.',
    };
  }
}

// Safe in-memory fallback for SSR / Node / testing environments
const memoryStorage = new Map<string, string>();

function getStorageItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {}
  return memoryStorage.get(key) ?? null;
}

function setStorageItem(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {}
  memoryStorage.set(key, value);
}

function removeStorageItem(key: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch {}
  memoryStorage.delete(key);
}

/**
 * Reads existing session from storage and checks if still valid.
 */
export function getSavedSession(): AuthSession | null {
  try {
    const raw = getStorageItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const session: AuthSession = JSON.parse(raw);
    if (!session || !session.name || !session.email || !session.keyHash) {
      return null;
    }
    // Check if the key was changed by the admin
    const currentKey = getActiveAccessKey();
    const currentHash = hashKey(currentKey);
    if (session.keyHash !== currentHash) {
      // Key was rotated! Invalidate old session.
      removeStorageItem(AUTH_STORAGE_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

/**
 * Saves authenticated session to storage.
 */
export function saveSession(name: string, email: string, key: string): AuthSession {
  const session: AuthSession = {
    name: name.trim(),
    email: email.trim(),
    keyHash: hashKey(key),
    loggedInAt: new Date().toISOString(),
  };
  try {
    setStorageItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  } catch (err) {
    console.error('Failed to save auth session', err);
  }
  return session;
}

/**
 * Clears the active session from storage.
 */
export function clearSession(): void {
  try {
    removeStorageItem(AUTH_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear auth session', err);
  }
}
