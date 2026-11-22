import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  DEFAULT_ACCESS_KEY,
  getActiveAccessKey,
  hashKey,
} from '../src/config/authConfig';
import {
  clearSession,
  getSavedSession,
  saveSession,
  verifySpecialKey,
} from '../src/services/authService';
import { useAuthStore } from '../src/state/useAuthStore';

describe('EG SIMULATOR Authentication & Access Gate', () => {
  beforeEach(() => {
    clearSession();
    useAuthStore.getState().logout();
  });

  it('provides a default access key when env variables are not present', () => {
    const key = getActiveAccessKey();
    expect(key).toBeDefined();
    expect(key.length).toBeGreaterThan(0);
    expect(key).toBe(DEFAULT_ACCESS_KEY);
  });

  it('rejects empty or whitespace-only keys', async () => {
    const result1 = await verifySpecialKey('');
    expect(result1.valid).toBe(false);

    const result2 = await verifySpecialKey('   ');
    expect(result2.valid).toBe(false);
  });

  it('rejects incorrect access keys', async () => {
    const result = await verifySpecialKey('INCORRECT_KEY_12345');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('Invalid');
  });

  it('accepts the correct special access key', async () => {
    const expected = getActiveAccessKey();
    const result = await verifySpecialKey(expected);
    expect(result.valid).toBe(true);
  });

  it('accepts correct key with surrounding whitespace trimmed', async () => {
    const expected = getActiveAccessKey();
    const result = await verifySpecialKey(`  ${expected}  `);
    expect(result.valid).toBe(true);
  });

  it('hashes keys consistently', () => {
    const hash1 = hashKey('TEST-KEY-1');
    const hash2 = hashKey('TEST-KEY-1');
    const hash3 = hashKey('TEST-KEY-2');

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
  });

  it('saves and restores authenticated sessions from storage', () => {
    const testKey = getActiveAccessKey();
    saveSession('Alice Walker', 'alice@test.edu', testKey);

    const session = getSavedSession();
    expect(session).not.toBeNull();
    expect(session?.name).toBe('Alice Walker');
    expect(session?.email).toBe('alice@test.edu');
    expect(session?.keyHash).toBe(hashKey(testKey));
  });

  it('clears session on logout', () => {
    const testKey = getActiveAccessKey();
    saveSession('Bob Smith', 'bob@test.edu', testKey);
    expect(getSavedSession()).not.toBeNull();

    clearSession();
    expect(getSavedSession()).toBeNull();
  });

  it('sends notification even with WRONG access key but strictly denies access to project', async () => {
    // Mock global fetch to inspect Formspree submission
    const originalFetch = globalThis.fetch;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    globalThis.fetch = fetchMock as any;

    try {
      const loginRes = await useAuthStore.getState().login('Intruder Joe', 'joe@example.com', 'WRONG-KEY');
      
      // Access must be denied
      expect(loginRes.success).toBe(false);
      expect(loginRes.error).toContain('Invalid special access key');
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().user).toBeNull();

      // Formspree MUST still have been called with denied status!
      expect(fetchMock).toHaveBeenCalled();
      const formspreeCall = fetchMock.mock.calls.find(c => String(c[0]).includes('formspree.io'));
      expect(formspreeCall).toBeDefined();
      const payload = JSON.parse(String(formspreeCall?.[1]?.body || '{}'));
      expect(payload.name).toBe('Intruder Joe');
      expect(payload.email).toBe('joe@example.com');
      expect(payload.accessKey).toBe('WRONG-KEY');
      expect(payload.status).toBe('ACCESS_DENIED_WRONG_KEY');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('sends notification and GRANTS access when correct key is entered', async () => {
    const originalFetch = globalThis.fetch;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    globalThis.fetch = fetchMock as any;

    try {
      const validKey = getActiveAccessKey();
      const loginRes = await useAuthStore.getState().login('Student Rahul', 'rahul@college.edu', validKey);
      
      // Access must be granted
      expect(loginRes.success).toBe(true);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().user?.name).toBe('Student Rahul');

      // Formspree MUST have been called with granted status!
      const formspreeCall = fetchMock.mock.calls.find(c => String(c[0]).includes('formspree.io'));
      expect(formspreeCall).toBeDefined();
      const payload = JSON.parse(String(formspreeCall?.[1]?.body || '{}'));
      expect(payload.status).toBe('ACCESS_GRANTED');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
