/**
 * Apple Sign-In Utilities for Native iOS
 * Uses expo-apple-authentication for native dialog + Supabase signInWithIdToken
 */

import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { Platform } from "react-native";
import { supabase } from "./supabase";

/**
 * Check if Apple Sign-In is available on this device.
 * Returns false on Android and on iOS versions < 13.
 */
export const isAppleSignInAvailable = async (): Promise<boolean> => {
  if (Platform.OS !== "ios") {
    return false;
  }
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
};

/**
 * Generate a random nonce string for Apple Sign-In security.
 */
function generateNonce(length: number = 32): string {
  const charset =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._";
  let result = "";
  const randomValues = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    randomValues[i] = Math.floor(Math.random() * charset.length);
  }
  for (let i = 0; i < length; i++) {
    result += charset[randomValues[i] % charset.length];
  }
  return result;
}

/**
 * Start native Apple Sign-In flow.
 *
 * 1. Generate a random nonce and SHA-256 hash it
 * 2. Present native Apple dialog requesting email + full name
 * 3. Pass the identity token + raw nonce to Supabase signInWithIdToken
 * 4. Update user metadata with name if provided (Apple only sends name on first sign-in)
 */
export const startAppleSignIn = async () => {
  try {
    console.log("[AppleAuth] Starting native Apple Sign-In...");

    const rawNonce = generateNonce();
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce,
    );

    console.log("[AppleAuth] Requesting Apple credential...");

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      ],
      nonce: hashedNonce,
    });

    console.log("[AppleAuth] Apple credential received");

    if (!credential.identityToken) {
      console.error("[AppleAuth] No identity token in credential");
      return {
        data: null,
        error: new Error("No identity token received from Apple"),
      };
    }

    // Apple only sends name on first sign-in
    const fullName = credential.fullName
      ? [credential.fullName.givenName, credential.fullName.familyName]
          .filter(Boolean)
          .join(" ")
      : undefined;

    console.log(
      "[AppleAuth] Full name from Apple:",
      fullName || "(not provided)",
    );

    console.log("[AppleAuth] Exchanging token with Supabase...");

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: credential.identityToken,
      nonce: rawNonce,
    });

    if (error) {
      console.error("[AppleAuth] Supabase signInWithIdToken error:", error);
      return { data: null, error };
    }

    // Update user metadata with name if Apple provided it
    if (fullName && data.user) {
      console.log("[AppleAuth] Updating user metadata with name:", fullName);
      try {
        await supabase.auth.updateUser({
          data: { full_name: fullName },
        });
      } catch (updateError) {
        console.warn("[AppleAuth] Failed to update user name:", updateError);
      }
    }

    console.log(
      "[AppleAuth] Apple Sign-In successful, user:",
      data.user?.id,
    );
    return { data, fullName: fullName || null, error: null };
  } catch (error: any) {
    console.error("[AppleAuth] Apple Sign-In exception:", error);
    return { data: null, error };
  }
};

/**
 * Handle Apple Sign-In errors with user-friendly messages.
 */
export const handleAppleAuthError = (error: any): string => {
  console.error("[AppleAuth] Detailed error analysis:", {
    message: error?.message,
    code: error?.code,
    name: error?.name,
  });

  if (error?.code === "ERR_REQUEST_CANCELED" || error?.code === "1001") {
    return "Sign-in was cancelled.";
  }

  if (error?.code === "ERR_REQUEST_FAILED" || error?.code === "1000") {
    return "Apple Sign-In failed. Please try again.";
  }

  if (error?.code === "ERR_REQUEST_NOT_HANDLED" || error?.code === "1002") {
    return "Apple Sign-In is not available. Please use another sign-in method.";
  }

  if (error?.code === "ERR_REQUEST_NOT_INTERACTIVE" || error?.code === "1003") {
    return "Apple Sign-In requires interaction. Please try again.";
  }

  if (
    error?.message?.includes("cancelled") ||
    error?.message?.includes("cancel")
  ) {
    return "Sign-in was cancelled.";
  }

  if (
    error?.message?.includes("network") ||
    error?.message?.includes("fetch")
  ) {
    return "Network connection error. Please check your internet connection.";
  }

  if (error?.message?.includes("Invalid")) {
    return "Authentication failed. Please try again.";
  }

  return `Apple Sign-In error: ${error?.message || "Unknown error occurred"}`;
};
