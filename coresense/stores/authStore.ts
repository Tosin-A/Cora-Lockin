/**
 * Authentication Store (Zustand)
 * Clean implementation with proper error handling
 */

import { create } from "zustand";
import { supabase } from "../utils/supabase";
import { startGoogleOAuth, handleOAuthError } from "../utils/oauth";
import { startAppleSignIn } from "../utils/appleAuth";
import { clearAuthTokenCache } from "../utils/coresenseApi";
import { API_BASE_URL } from "../utils/apiConfig";
import type { User } from "../types";

// Helper function to initialize user data for new signups
async function initializeUserForNewSignup(
  userId: string,
  email: string,
  fullName?: string,
) {
  try {
    console.log("[AuthStore] Initializing user data for:", userId);

    // Initialize message limits by calling our API endpoint
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      console.warn("[AuthStore] No session found for user initialization");
      return;
    }

    const response = await fetch(
      `${API_BASE_URL}/api/v1/user/initialize`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          email: email,
          full_name: fullName,
        }),
      },
    );

    const usageData = response.ok ? await response.json() : null;
    const usageError = !response.ok
      ? new Error(`HTTP ${response.status}`)
      : null;

    if (usageError) {
      console.warn("[AuthStore] User initialization failed:", usageError);
      // Don't throw - initialization failure shouldn't break signup
    } else {
      console.log("[AuthStore] User data initialized successfully");
    }
  } catch (error) {
    console.warn("[AuthStore] User initialization error:", error);
    // Don't throw - initialization failure shouldn't break signup
  }
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  googleLoading: boolean;
  appleLoading: boolean;
  deletingAccount: boolean;
  pendingPasswordReset: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  setPendingPasswordReset: (pending: boolean) => void;
  deleteAccount: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  googleLoading: false,
  appleLoading: false,
  deletingAccount: false,
  pendingPasswordReset: false,

  checkAuth: async () => {
    try {
      console.log("checkAuth: Checking session...");
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error("checkAuth: Session error:", error);
        set({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }

      if (session?.user) {
        // Only update if user changed or not authenticated
        const currentState = get();
        if (
          currentState.user?.id === session.user.id &&
          currentState.isAuthenticated
        ) {
          console.log("checkAuth: User already authenticated, skipping update");
          set({ isLoading: false });
          return;
        }

        console.log("checkAuth: Session found, user:", session.user.id);
        const fullName = session.user.user_metadata?.full_name || null;
        const mappedUser: User = {
          id: session.user.id,
          email: session.user.email || "",
          username: fullName || session.user.email?.split("@")[0] || "",
          full_name: fullName,
          avatar_url: session.user.user_metadata?.avatar_url || null,
          created_at: session.user.created_at,
        };
        set({
          user: mappedUser,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        console.log("checkAuth: No session found");
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch (error) {
      console.error("checkAuth: Exception:", error);
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  signIn: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      console.log("[AuthStore] SignIn attempt for:", email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("[AuthStore] SignIn error:", error);
        set({ isLoading: false });

        // Provide helpful error messages
        if (error.message.includes("Invalid login credentials")) {
          throw new Error(
            'Invalid email or password. Please check your credentials or use "Sign Up" to create an account.',
          );
        }
        if (error.message.includes("Email not confirmed")) {
          throw new Error(
            "Please check your email and click the confirmation link before signing in.",
          );
        }
        throw new Error(error.message);
      }

      if (!data.user) {
        set({ isLoading: false });
        throw new Error("Sign in failed. Please try again.");
      }

      console.log("[AuthStore] SignIn success, user:", data.user.id);

      const name = data.user.user_metadata?.full_name || null;
      const mappedUser: User = {
        id: data.user.id,
        email: data.user.email || "",
        username: name || data.user.email?.split("@")[0] || "",
        full_name: name,
        avatar_url: data.user.user_metadata?.avatar_url || null,
        created_at: data.user.created_at,
      };

      set({
        user: mappedUser,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      console.error("[AuthStore] SignIn exception:", error);
      set({ isLoading: false });
      throw error;
    }
  },

  signUp: async (email: string, password: string, fullName?: string) => {
    set({ isLoading: true });
    try {
      console.log("[AuthStore] SignUp attempt for:", email, "name:", fullName);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        console.error("[AuthStore] SignUp error:", error);
        set({ isLoading: false });

        if (error.message.includes("already registered")) {
          throw new Error(
            'An account with this email already exists. Please use "Sign In" or try a different email.',
          );
        }
        if (error.message.includes("Password should be at least")) {
          throw new Error(
            "Password is too weak. Please use at least 6 characters.",
          );
        }
        throw new Error(error.message);
      }

      if (!data.user) {
        set({ isLoading: false });
        throw new Error("Sign up failed. Please try again.");
      }

      console.log("[AuthStore] SignUp success, user ID:", data.user.id);

      // Initialize user data for new users
      try {
        await initializeUserForNewSignup(
          data.user.id,
          data.user.email || "",
          fullName,
        );
      } catch (initError) {
        console.warn("[AuthStore] User initialization warning:", initError);
        // Don't fail signup if initialization fails
      }

      // Check if email confirmation is required
      if (!data.user.email_confirmed_at) {
        set({ isLoading: false });
        const confirmationError: any = new Error(
          "Account created! Please check your email to confirm your account before signing in.",
        );
        confirmationError.isEmailConfirmation = true;
        throw confirmationError;
      }

      // User is immediately confirmed and logged in
      const signUpName = fullName || data.user.user_metadata?.full_name || null;
      const mappedUser: User = {
        id: data.user.id,
        email: data.user.email || "",
        username: signUpName || data.user.email?.split("@")[0] || "",
        full_name: signUpName,
        avatar_url: data.user.user_metadata?.avatar_url || null,
        created_at: data.user.created_at,
      };

      set({
        user: mappedUser,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      console.error("[AuthStore] SignUp exception:", error);
      set({ isLoading: false });
      throw error;
    }
  },

  signInWithGoogle: async () => {
    set({ googleLoading: true });
    try {
      console.log("[AuthStore] Starting Google OAuth...");

      const { data, error } = await startGoogleOAuth();

      if (error) {
        console.error("[AuthStore] Google OAuth error:", error);
        throw error;
      }

      if (!data?.data?.user) {
        console.error("[AuthStore] No user returned from Google OAuth");
        throw new Error("Google sign-in failed. Please try again.");
      }

      console.log("[AuthStore] Google OAuth success, user:", data.data.user.id);

      const googleName = data.data.user.user_metadata?.full_name || null;
      const mappedUser: User = {
        id: data.data.user.id,
        email: data.data.user.email || "",
        username: googleName || data.data.user.email?.split("@")[0] || "",
        full_name: googleName,
        avatar_url: data.data.user.user_metadata?.avatar_url || null,
        created_at: data.data.user.created_at,
      };

      set({
        user: mappedUser,
        isAuthenticated: true,
        googleLoading: false,
      });

      // Trigger checkAuth to ensure session is properly synced
      await get().checkAuth();
    } catch (error: any) {
      console.error("[AuthStore] Google OAuth exception:", error);
      set({ googleLoading: false });
      throw error;
    }
  },

  signInWithApple: async () => {
    set({ appleLoading: true });
    try {
      console.log("[AuthStore] Starting Apple Sign-In...");

      const { data, fullName, error } = await startAppleSignIn();

      if (error) {
        console.error("[AuthStore] Apple Sign-In error:", error);
        throw error;
      }

      if (!data?.user) {
        console.error("[AuthStore] No user returned from Apple Sign-In");
        throw new Error("Apple sign-in failed. Please try again.");
      }

      console.log("[AuthStore] Apple Sign-In success, user:", data.user.id);

      // Use Apple-provided name, falling back to stored metadata, then email prefix
      const appleName =
        fullName ||
        data.user.user_metadata?.full_name ||
        null;

      const mappedUser: User = {
        id: data.user.id,
        email: data.user.email || "",
        username: appleName || data.user.email?.split("@")[0] || "",
        full_name: appleName,
        avatar_url: data.user.user_metadata?.avatar_url || null,
        created_at: data.user.created_at,
      };

      set({
        user: mappedUser,
        isAuthenticated: true,
        appleLoading: false,
      });

      // Always initialize for Apple users — ensures profile and
      // message limits exist, and updates name if it was missing.
      try {
        await initializeUserForNewSignup(
          data.user.id,
          data.user.email || "",
          appleName || undefined,
        );
      } catch (initError) {
        console.warn(
          "[AuthStore] Apple user initialization warning:",
          initError,
        );
      }

      await get().checkAuth();
    } catch (error: any) {
      console.error("[AuthStore] Apple Sign-In exception:", error);
      set({ appleLoading: false });
      throw error;
    }
  },

  signOut: async () => {
    try {
      console.log("[AuthStore] Signing out...");

      clearAuthTokenCache();

      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        pendingPasswordReset: false,
      });

      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("[AuthStore] Sign out error:", error);
      } else {
        console.log("[AuthStore] Sign out successful");
      }
    } catch (error: any) {
      console.error("[AuthStore] Sign out exception:", error);
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        pendingPasswordReset: false,
      });
    }
  },

  resetPassword: async (email: string) => {
    try {
      console.log("[AuthStore] Sending password reset email to:", email);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "coresense://auth/recovery",
      });

      if (error) {
        console.error("[AuthStore] Password reset error:", error);
        throw new Error(error.message);
      }

      console.log("[AuthStore] Password reset email sent");
    } catch (error: any) {
      console.error("[AuthStore] Password reset exception:", error);
      throw error;
    }
  },

  updatePassword: async (newPassword: string) => {
    try {
      console.log("[AuthStore] Updating password...");
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error("[AuthStore] Password update error:", error);
        throw new Error(error.message);
      }

      console.log("[AuthStore] Password updated successfully");
    } catch (error: any) {
      console.error("[AuthStore] Password update exception:", error);
      throw error;
    }
  },

  setPendingPasswordReset: (pending: boolean) => {
    set({ pendingPasswordReset: pending });
  },

  deleteAccount: async () => {
    set({ deletingAccount: true });
    try {
      console.log("[AuthStore] Deleting account...");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/account`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Delete failed: ${response.status}`);
      }

      console.log("[AuthStore] Account deleted, clearing local state");

      clearAuthTokenCache();

      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        deletingAccount: false,
      });

      await supabase.auth.signOut();
    } catch (error: any) {
      console.error("[AuthStore] Delete account exception:", error);
      set({ deletingAccount: false });
      throw error;
    }
  },
}));
