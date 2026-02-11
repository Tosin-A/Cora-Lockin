/**
 * Theme Store
 * Manages dark/light mode preference with persistence
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'light' as ThemeMode,
      isDark: false,

      setMode: (mode: ThemeMode) => {
        // For now, 'system' defaults to light
        // In a full implementation, we'd check Appearance.getColorScheme()
        const isDark = mode === 'dark';
        set({ mode, isDark });
      },

      toggleTheme: () => {
        const { isDark } = get();
        const newMode = isDark ? 'light' : 'dark';
        set({ mode: newMode, isDark: !isDark });
      },
    }),
    {
      name: 'coresense-theme',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
