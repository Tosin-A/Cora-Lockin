/**
 * CoreSense Native Soft Precision Theme
 * Inspired by Things 3, Linear Mobile, Superhuman
 * Supports both light and dark modes
 */

// Light Mode Colors
export const LightColors = {
  // Native Light Backgrounds (Apple-style hierarchy)
  background: '#F8F8FA',
  backgroundSecondary: '#F2F2F7',
  backgroundTertiary: '#FFFFFF',

  // Primary Purple Spectrum
  primary: '#7C3AED',
  primaryLight: '#A78BFA',
  primaryDark: '#6D28D9',
  primaryMuted: 'rgba(124, 58, 237, 0.08)',

  // Semantic Accent Colors (purple-focused)
  neonGreen: '#10B981',
  neonAmber: '#8B5CF6',  // Purple instead of amber
  neonBlue: '#3B82F6',
  neonPink: '#A855F7',

  // Glassmorphism Colors
  glassSurface: 'rgba(255, 255, 255, 0.72)',
  glassBorder: 'rgba(0, 0, 0, 0.04)',
  glassHighlight: 'rgba(255, 255, 255, 0.9)',

  // Typography (slate palette)
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textTertiary: '#94A3B8',
  textMuted: '#CBD5E1',

  // Status Colors (purple-focused)
  success: '#10B981',
  warning: '#8B5CF6',  // Purple instead of yellow
  error: '#EF4444',
  info: '#3B82F6',

  // Subtle Tints
  successTint: 'rgba(16, 185, 129, 0.08)',
  warningTint: 'rgba(139, 92, 246, 0.08)',  // Purple tint
  errorTint: 'rgba(239, 68, 68, 0.08)',
  infoTint: 'rgba(59, 130, 246, 0.08)',

  // Interactive States
  buttonHover: 'rgba(0, 0, 0, 0.04)',
  buttonPressed: 'rgba(0, 0, 0, 0.08)',

  // Accessibility
  highContrastText: '#0F172A',
  highContrastBorder: '#0F172A',

  // Insight Type Colors (unified purple system)
  insightBehavioral: '#7C3AED',
  insightProgress: '#8B5CF6',
  insightRisk: '#6D28D9',

  // Card & Surface Colors
  surface: '#FFFFFF',
  surfaceMedium: '#F8F8FA',
  surfaceLight: '#FFFFFF',
  cardBackground: '#FFFFFF',

  // Borders
  border: 'rgba(0, 0, 0, 0.06)',
  borderLight: 'rgba(0, 0, 0, 0.04)',
  borderPurple: 'rgba(124, 58, 237, 0.12)',
  accent: '#7C3AED',

  // Engagement UI
  borderAccent: 'rgba(124, 58, 237, 0.2)',
  actionHighlight: '#7C3AED',

  // Shadow colors
  shadowColor: 'rgba(0, 0, 0, 0.08)',
  shadowColorStrong: 'rgba(0, 0, 0, 0.12)',
} as const;

// Dark Mode Colors (Premium Dark SaaS)
export const DarkColors = {
  // Deep dark backgrounds (consistent dark gray)
  background: '#0F0F14',
  backgroundSecondary: '#121218',
  backgroundTertiary: '#18181F',

  // Primary Purple Spectrum (vibrant for dark mode)
  primary: '#8B5CF6',
  primaryLight: '#A78BFA',
  primaryDark: '#7C3AED',
  primaryMuted: 'rgba(139, 92, 246, 0.2)',

  // Vibrant Accents (purple-focused)
  neonGreen: '#00FF88',
  neonAmber: '#A78BFA',  // Purple instead of yellow
  neonBlue: '#00D4FF',
  neonPink: '#C084FC',

  // Glassmorphism Colors
  glassSurface: 'rgba(255, 255, 255, 0.04)',
  glassBorder: 'rgba(255, 255, 255, 0.12)',
  glassHighlight: 'rgba(255, 255, 255, 0.06)',

  // High-Contrast Text (bright for readability)
  textPrimary: '#FFFFFF',
  textSecondary: '#E5E5E5',
  textTertiary: '#B0B0B0',  // Brighter for better icon visibility
  textMuted: '#808080',     // Brighter for better contrast

  // Status Colors (purple-focused accents)
  success: '#00FF88',
  warning: '#C084FC',  // Soft purple instead of yellow
  error: '#FF375F',
  info: '#00D4FF',

  // Subtle Tints (slightly more visible)
  successTint: 'rgba(0, 255, 136, 0.12)',
  warningTint: 'rgba(192, 132, 252, 0.12)',  // Purple tint
  errorTint: 'rgba(255, 55, 95, 0.12)',
  infoTint: 'rgba(0, 212, 255, 0.12)',

  // Interactive States
  buttonHover: 'rgba(255, 255, 255, 0.1)',
  buttonPressed: 'rgba(255, 255, 255, 0.2)',

  // Accessibility
  highContrastText: '#FFFFFF',
  highContrastBorder: '#FFFFFF',

  // Insight Type Colors (unified purple system)
  insightBehavioral: '#8B5CF6',
  insightProgress: '#A78BFA',
  insightRisk: '#7C3AED',

  // Card & Surface Colors (elevated from deep dark)
  surface: '#1A1A22',
  surfaceMedium: '#16161D',
  surfaceLight: '#22222B',
  cardBackground: '#1E1E26',

  // Borders
  border: 'rgba(255, 255, 255, 0.1)',
  borderLight: 'rgba(255, 255, 255, 0.06)',
  borderPurple: 'rgba(139, 92, 246, 0.3)',
  accent: '#8B5CF6',

  // Engagement UI
  borderAccent: 'rgba(139, 92, 246, 0.5)',
  actionHighlight: '#A78BFA',

  // Shadow colors
  shadowColor: 'rgba(0, 0, 0, 0.5)',
  shadowColorStrong: 'rgba(0, 0, 0, 0.7)',
} as const;

// Default to light mode - will be dynamically updated by useColors hook
export let Colors = { ...LightColors };

// Function to get colors based on theme mode
export const getColors = (isDark: boolean) => {
  return isDark ? DarkColors : LightColors;
};

// Function to update the global Colors object (for components that can't use hooks)
export const setThemeColors = (isDark: boolean) => {
  const newColors = isDark ? DarkColors : LightColors;
  Object.assign(Colors, newColors);
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

// Touch target minimum (Apple HIG: 44pt)
export const TouchTarget = {
  minimum: 44,
} as const;

export const Typography = {
  h1: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 17,
    fontWeight: '600' as const,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22,
    letterSpacing: -0.1,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  bodyLarge: {
    fontSize: 17,
    fontWeight: '400' as const,
    lineHeight: 24,
    letterSpacing: -0.1,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
    letterSpacing: 0.1,
  },
  button: {
    fontSize: 15,
    fontWeight: '600' as const,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  buttonSmall: {
    fontSize: 13,
    fontWeight: '600' as const,
    lineHeight: 18,
  },
  label: {
    fontSize: 11,
    fontWeight: '600' as const,
    lineHeight: 14,
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
  },
} as const;

export const BorderRadius = {
  small: 8,
  medium: 12,
  large: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
} as const;

// Glassmorphism styles (will be themed)
export const getGlassmorphism = (isDark: boolean) => ({
  header: {
    backgroundColor: isDark ? 'rgba(10, 10, 10, 0.85)' : 'rgba(248, 248, 250, 0.85)',
    backdropFilter: 'blur(20px)',
    borderBottomWidth: 0.5,
    borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
  },
  floatingBar: {
    backgroundColor: isDark ? 'rgba(20, 20, 20, 0.92)' : 'rgba(255, 255, 255, 0.92)',
    backdropFilter: 'blur(20px)',
    borderWidth: 0.5,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.04)',
  },
  card: {
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.72)',
    backdropFilter: 'blur(20px)',
  },
  button: {
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(10px)',
  },
});

// Default Glassmorphism (light mode)
export const Glassmorphism = getGlassmorphism(false);

// Shadows (same for both modes, but opacity adjusted)
export const getShadows = (isDark: boolean) => ({
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0.3 : 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.4 : 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  elevated: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.5 : 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  fab: {
    shadowColor: isDark ? '#8B5CF6' : '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: isDark ? 0.4 : 0.12,
    shadowRadius: 20,
    elevation: 12,
  },
});

// Default Shadows (light mode)
export const Shadows = getShadows(false);

// Deprecated - keeping for backward compatibility
export const GlowEffects = {
  streak: Shadows.elevated,
  button: Shadows.medium,
  coachAvatar: Shadows.elevated,
} as const;

export const getShadowStyle = (type: 'card' | 'medium' | 'elevated' | 'fab' = 'card') => {
  switch (type) {
    case 'medium':
      return Shadows.medium;
    case 'elevated':
      return Shadows.elevated;
    case 'fab':
      return Shadows.fab;
    default:
      return Shadows.card;
  }
};

export const getGlassmorphismStyle = (type: 'header' | 'floatingBar' | 'card' | 'button' = 'card') => {
  return Glassmorphism[type];
};

export const Animations = {
  quick: 150,
  normal: 250,
  slow: 350,
  spring: {
    damping: 20,
    stiffness: 300,
  },
} as const;

export const Layout = {
  screenPadding: Spacing.lg,
  cardPadding: Spacing.lg,
  sectionGap: Spacing.xl,
  itemGap: Spacing.md,
} as const;
