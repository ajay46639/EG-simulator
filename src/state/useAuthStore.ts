import { create } from 'zustand';
import {
  AuthSession,
  clearSession,
  getSavedSession,
  saveSession,
  submitAccessToFormspree,
  verifySpecialKey,
} from '../services/authService';

interface AuthStore {
  isAuthenticated: boolean;
  user: AuthSession | null;
  isLoading: boolean;
  statusMessage: string | null;
  error: string | null;
  
  // Actions
  login: (name: string, email: string, key: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  clearError: () => void;
}

// Initial session check
const existingSession = getSavedSession();

export const useAuthStore = create<AuthStore>((set) => ({
  isAuthenticated: !!existingSession,
  user: existingSession,
  isLoading: false,
  statusMessage: null,
  error: null,

  login: async (name: string, email: string, key: string) => {
    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const cleanKey = key.trim();

    // Client-side validation
    if (!cleanName || cleanName.length < 2) {
      const err = 'Please enter your full name (at least 2 characters).';
      set({ error: err, isLoading: false, statusMessage: null });
      return { success: false, error: err };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      const err = 'Please enter a valid email address.';
      set({ error: err, isLoading: false, statusMessage: null });
      return { success: false, error: err };
    }

    if (!cleanKey) {
      const err = 'Please enter your unique special access key.';
      set({ error: err, isLoading: false, statusMessage: null });
      return { success: false, error: err };
    }

    set({ isLoading: true, statusMessage: 'Verifying key & sending notification...', error: null });

    // Step 1: Verify the special key
    const verification = await verifySpecialKey(cleanKey);
    const isAuthorized = verification.valid;

    // Step 2: Form notification MUST get sent even if the access key is wrong!
    await submitAccessToFormspree(cleanName, cleanEmail, cleanKey, isAuthorized);

    // Step 3: If key is wrong, DO NOT grant access to the project
    if (!isAuthorized) {
      const err = verification.message || 'Invalid special access key. Access denied.';
      set({
        isLoading: false,
        statusMessage: null,
        error: err,
      });
      return { success: false, error: err };
    }

    // Step 4: Special key is right! Grant access & save session
    const session = saveSession(cleanName, cleanEmail, cleanKey);
    set({
      isAuthenticated: true,
      user: session,
      isLoading: false,
      statusMessage: null,
      error: null,
    });

    return { success: true };
  },

  logout: () => {
    clearSession();
    set({
      isAuthenticated: false,
      user: null,
      isLoading: false,
      statusMessage: null,
      error: null,
    });
  },

  clearError: () => {
    set({ error: null });
  },
}));
