/**
 * useColors Hook
 * Returns the appropriate colors based on the current theme mode
 */

import { useMemo } from 'react';
import { useThemeStore } from '../stores/themeStore';
import { getColors, getShadows, getGlassmorphism, setThemeColors } from '../constants/theme';

export function useColors() {
  const isDark = useThemeStore((state) => state.isDark);

  // Update global Colors object when theme changes
  useMemo(() => {
    setThemeColors(isDark);
  }, [isDark]);

  return useMemo(() => getColors(isDark), [isDark]);
}

export function useShadows() {
  const isDark = useThemeStore((state) => state.isDark);
  return useMemo(() => getShadows(isDark), [isDark]);
}

export function useGlassmorphism() {
  const isDark = useThemeStore((state) => state.isDark);
  return useMemo(() => getGlassmorphism(isDark), [isDark]);
}
