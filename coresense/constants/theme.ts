/**
 * CoreSense OLED Dark Theme - High-Fidelity Minimalist Design
 * Deep purples, vibrant neons, glassmorphism, urgent yet calm aesthetic
 */

export const Colors = {
  // OLED Deep Backgrounds
  background: '#0A0A0A',
  backgroundSecondary: '#0F0F0F',
  backgroundTertiary: '#141414',
  
  // Deep Purple Spectrum
  primary: '#8B5CF6',        // Deep purple (main brand)
  primaryLight: '#A78BFA',   // Lighter purple for hover states
  primaryDark: '#7C3AED',    // Darker purple for pressed states
  
  // Vibrant Neon Accents
  neonGreen: '#00FF88',      // Done button - vibrant green
  neonAmber: '#FFB800',      // Struggling button - neon amber
  neonBlue: '#00D4FF',       // Tomorrow button - neon blue
  neonPink: '#FF0080',       // Coach badge - neon pink
  
  // Glassmorphism Colors
  glassSurface: 'rgba(255, 255, 255, 0.03)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  glassHighlight: 'rgba(255, 255, 255, 0.05)',
  
  // High-Contrast Text
  textPrimary: '#FFFFFF',
  textSecondary: '#E5E5E5',
  textTertiary: '#A3A3A3',
  textMuted: '#737373',
  
  // Status Colors with Neon Touches
  success: '#00FF88',        // Neon green
  warning: '#FFB800',        // Neon amber  
  error: '#FF375F',          // Neon red
  info: '#00D4FF',           // Neon blue
  
  // Glowing Effects
  glowPrimary: 'rgba(139, 92, 246, 0.4)',
  glowSuccess: 'rgba(0, 255, 136, 0.3)',
  glowWarning: 'rgba(255, 184, 0, 0.3)',
  glowInfo: 'rgba(0, 212, 255, 0.3)',
  
  // Interactive States
  buttonHover: 'rgba(255, 255, 255, 0.1)',
  buttonPressed: 'rgba(255, 255, 255, 0.2)',
  
  // Accessibility High Contrast
  highContrastText: '#FFFFFF',
  highContrastBorder: '#FFFFFF',
  
  // Backward Compatibility Aliases
  surface: '#141414',           // Maps to backgroundTertiary
  surfaceMedium: '#0F0F0F',     // Maps to backgroundSecondary
  surfaceLight: '#1A1A1A',      // Lighter surface variant
  accent: '#8B5CF6',            // Maps to primary for compatibility
  border: 'rgba(255, 255, 255, 0.1)', // Standard border color
  borderPurple: 'rgba(139, 92, 246, 0.3)', // Purple-tinted border for cards
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const Typography = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    fontFamily: 'Montserrat-Bold',
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600' as const,
    fontFamily: 'Montserrat-SemiBold',
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    fontFamily: 'Montserrat-SemiBold',
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    fontFamily: 'Inter-Regular',
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    fontFamily: 'Inter-Medium',
    lineHeight: 16,
  },
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
    fontFamily: 'Montserrat-SemiBold',
    lineHeight: 24,
    letterSpacing: 0.5,
  },
  buttonSmall: {
    fontSize: 14,
    fontWeight: '600' as const,
    fontFamily: 'Montserrat-SemiBold',
    lineHeight: 20,
    letterSpacing: 0.3,
  },
  label: {
    fontSize: 11,
    fontWeight: '600' as const,
    fontFamily: 'Inter-Medium',
    lineHeight: 14,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
} as const;

export const BorderRadius = {
  small: 8,
  medium: 12,
  large: 16,
} as const;

// OLED-Specific Design Elements
export const Glassmorphism = {
  card: {
    backgroundColor: Colors.glassSurface,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    backdropFilter: 'blur(20px)',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  button: {
    backgroundColor: Colors.glassHighlight,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    backdropFilter: 'blur(10px)',
  },
} as const;

export const GlowEffects = {
  streak: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  button: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  coachAvatar: {
    shadowColor: Colors.neonPink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 8,
  },
} as const;

export const Shadows = {
  card: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  elevated: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;

// Helper functions for OLED design
export const getShadowStyle = (type: 'card' | 'elevated' | 'glow' = 'card') => {
  switch (type) {
    case 'elevated':
      return Shadows.elevated;
    case 'glow':
      return GlowEffects.streak;
    default:
      return Shadows.card;
  }
};

export const getGlassmorphismStyle = (type: 'card' | 'button' = 'card') => {
  return Glassmorphism[type];
};

// Animation timing optimized for 5-second interactions
export const Animations = {
  quick: 150,      // Button presses, micro-interactions
  normal: 300,     // Standard transitions
  slow: 500,       // Page transitions, coach messages
} as const;

