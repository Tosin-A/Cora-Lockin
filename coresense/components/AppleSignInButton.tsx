/**
 * Apple Sign-In Button Component
 * iOS only - returns null on Android
 */

import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  Platform,
  ViewStyle,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { Spacing, BorderRadius, Typography } from "../constants/theme";

interface AppleSignInButtonProps {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

const AppleLogo = () => (
  <Svg width={17} height={20} viewBox="0 0 24 28">
    <Path
      d="M19.665 16.811a10.316 10.316 0 0 1-1.021 1.837c-.537.767-.978 1.297-1.316 1.592-.525.482-1.089.73-1.692.744-.432 0-.954-.123-1.562-.373-.61-.249-1.17-.372-1.683-.372-.537 0-1.113.123-1.73.372-.616.25-1.114.381-1.495.393-.577.025-1.154-.229-1.729-.764-.367-.32-.826-.87-1.377-1.648-.59-.829-1.075-1.794-1.455-2.891-.407-1.187-.611-2.335-.611-3.447 0-1.273.275-2.372.826-3.292a4.857 4.857 0 0 1 1.73-1.751 4.65 4.65 0 0 1 2.338-.662c.46 0 1.063.142 1.81.422s1.227.422 1.436.422c.158 0 .689-.167 1.593-.498.853-.307 1.573-.434 2.163-.384 1.6.129 2.801.759 3.6 1.895-1.43.867-2.137 2.08-2.123 3.637.012 1.213.453 2.222 1.317 3.023a4.33 4.33 0 0 0 1.315.863c-.106.307-.218.6-.336.882zM15.998 2.38c0 .95-.347 1.838-1.038 2.659-.836.976-1.846 1.541-2.941 1.452a2.955 2.955 0 0 1-.022-.36c0-.913.396-1.889 1.1-2.688.352-.404.799-.74 1.343-1.009.542-.264 1.054-.41 1.536-.435.014.128.022.255.022.381z"
      fill="#FFFFFF"
    />
  </Svg>
);

export const AppleSignInButton: React.FC<AppleSignInButtonProps> = ({
  onPress,
  loading = false,
  disabled = false,
  style,
}) => {
  if (Platform.OS !== "ios") {
    return null;
  }

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <AppleLogo />
          </View>
          <Text style={styles.text}>Continue with Apple</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: BorderRadius.medium,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000000",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    marginRight: Spacing.sm,
  },
  text: {
    ...Typography.body,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
