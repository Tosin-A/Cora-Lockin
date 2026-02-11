/**
 * Theme Context Provider
 * Provides themed colors to the app and triggers re-renders on theme change
 */

import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useThemeStore } from '../stores/themeStore';
import {
  getColors,
  getShadows,
  getGlassmorphism,
  setThemeColors,
  LightColors,
  DarkColors,
} from '../constants/theme';

type ColorsType = typeof LightColors;
type ShadowsType = ReturnType<typeof getShadows>;
type GlassmorphismType = ReturnType<typeof getGlassmorphism>;

interface ThemeContextValue {
  colors: ColorsType;
  shadows: ShadowsType;
  glassmorphism: GlassmorphismType;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const isDark = useThemeStore((state) => state.isDark);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  // Update global Colors object when theme changes
  useEffect(() => {
    setThemeColors(isDark);
  }, [isDark]);

  const value = useMemo(
    () => ({
      colors: getColors(isDark),
      shadows: getShadows(isDark),
      glassmorphism: getGlassmorphism(isDark),
      isDark,
      toggleTheme,
    }),
    [isDark, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Re-export for convenience
export { useThemeStore } from '../stores/themeStore';
