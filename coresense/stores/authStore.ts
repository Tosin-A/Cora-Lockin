/**
 * Authentication Store (Zustand)
 * Clean implementation with proper error handling
 */

import { create } from "zustand";
import { supabase } from "../utils/supabase";
import { startGoogleOAuth, handleOAuthError } from "../utils/oauth";
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
      `${process.env.EXPO_PUBLIC_API_URL || "http://192.168.0.116:8000"}/api/v1/user/initialize`,
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
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  googleLoading: false,

  checkAuth: async () => {
    try {
      const currentState = get();

      // Prevent duplicate calls if already checking
      if (currentState.isLoading) {
        console.log("checkAuth: Already loading, skipping...");
        return;
      }

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
        const currentUser = currentState.user;
        if (
          currentUser?.id === session.user.id &&
          currentState.isAuthenticated
        ) {
          console.log("checkAuth: User already authenticated, skipping update");
          return;
        }

        console.log("checkAuth: Session found, user:", session.user.id);
        const mappedUser: User = {
          id: session.user.id,
          email: session.user.email || "",
          username: session.user.email?.split("@")[0] || "",
          full_name: session.user.user_metadata?.full_name || null,
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
        if (!currentState.isLoading) {
          set({ user: null, isAuthenticated: false, isLoading: false });
        } else {
          set({ user: null, isAuthenticated: false });
        }
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

      const mappedUser: User = {
        id: data.user.id,
        email: data.user.email || "",
        username: data.user.email?.split("@")[0] || "",
        full_name: data.user.user_metadata?.full_name || null,
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
      const mappedUser: User = {
        id: data.user.id,
        email: data.user.email || "",
        username: data.user.email?.split("@")[0] || "",
        full_name: data.user.user_metadata?.full_name || null,
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

      const mappedUser: User = {
        id: data.data.user.id,
        email: data.data.user.email || "",
        username: data.data.user.email?.split("@")[0] || "",
        full_name: data.data.user.user_metadata?.full_name || null,
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

  signOut: async () => {
    try {
      console.log("[AuthStore] Signing out...");

      // Clear local state first
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      // Then sign out from Supabase
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("[AuthStore] Sign out error:", error);
        // Still clear local state even if API call fails
      } else {
        console.log("[AuthStore] Sign out successful");
      }
    } catch (error: any) {
      console.error("[AuthStore] Sign out exception:", error);
      // Ensure state is cleared even on error
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
}));
