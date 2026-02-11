/**
 * Tests for Insight Colors
 * Ensures the insight type colors follow the Purple, Black, Grey, White palette
 */

import { InsightTypeColors, InsightType } from '../types/insights';

describe('Insight Colors', () => {
  // Neon colors that should NOT be used
  const NEON_COLORS = ['#00D4FF', '#00FF88', '#FFB800', '#FF0080'];

  it('should not use any neon accent colors', () => {
    Object.values(InsightTypeColors).forEach((color) => {
      expect(NEON_COLORS).not.toContain(color);
    });
  });

  it('should have colors defined for all insight types', () => {
    expect(InsightTypeColors[InsightType.BEHAVIORAL]).toBeDefined();
    expect(InsightTypeColors[InsightType.PROGRESS]).toBeDefined();
    expect(InsightTypeColors[InsightType.RISK]).toBeDefined();
  });

  it('should use purple-family or neutral colors only', () => {
    // Allowed color prefixes (purple shades, white, grey)
    const allowedPrefixes = [
      '#8B5C', // Deep purple
      '#A78B', // Light purple
      '#C4B5', // Soft lavender
      '#7C3A', // Darker purple
      '#FFFFFF', // White
      '#E5E5', // Light grey
      '#A3A3', // Medium grey
    ];

    Object.values(InsightTypeColors).forEach((color) => {
      const matchesAllowed = allowedPrefixes.some((prefix) =>
        color.toUpperCase().startsWith(prefix.toUpperCase())
      );
      expect(matchesAllowed).toBe(true);
    });
  });

  it('should use white (#FFFFFF) for RISK type for urgency', () => {
    expect(InsightTypeColors[InsightType.RISK]).toBe('#FFFFFF');
  });

  it('should use light purple (#A78BFA) for BEHAVIORAL type', () => {
    expect(InsightTypeColors[InsightType.BEHAVIORAL]).toBe('#A78BFA');
  });

  it('should use soft lavender (#C4B5FD) for PROGRESS type', () => {
    expect(InsightTypeColors[InsightType.PROGRESS]).toBe('#C4B5FD');
  });
});
