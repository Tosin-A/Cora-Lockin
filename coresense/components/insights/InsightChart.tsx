/**
 * Insight Chart Component
 * Premium dark SaaS aesthetic - unified purple accent system
 * Clean, minimal bar chart with purple highlights
 */

import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

interface InsightChartProps {
  labels: string[];
  values: number[];
  highlightIndex?: number;
  highlightColor?: string;
  barColor?: string;
  showLabels?: boolean;
  showValues?: boolean;
  height?: number;
}

export function InsightChart({
  labels,
  values,
  highlightIndex,
  highlightColor,
  barColor,
  showLabels = true,
  showValues = true,
  height = 100,
}: InsightChartProps) {
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const actualHighlightColor = highlightColor || colors.primary;
  const actualBarColor = barColor || colors.border;

  // Calculate max value for scaling
  const maxValue = Math.max(...values, 1);

  // Dynamic bar sizing based on data count and screen width
  const availableWidth = screenWidth - Spacing.lg * 4;
  const barCount = labels.length;
  const barGap = barCount > 7 ? 4 : 6;
  const barWidth = Math.max(16, Math.min(32, (availableWidth - barGap * (barCount - 1)) / barCount));

  // Label height depends on label length
  const labelHeight = 28;

  return (
    <View style={[styles.container, { height: height + labelHeight + 16 }]}>
      {/* Bars */}
      <View style={[styles.barsContainer, { height }]}>
        {values.map((value, index) => {
          const isHighlighted = index === highlightIndex;
          const barHeight = maxValue > 0 ? (value / maxValue) * height * 0.85 : 0;
          const color = isHighlighted ? actualHighlightColor : actualBarColor;

          return (
            <View key={index} style={[styles.barWrapper, { width: barWidth }]}>
              {/* Value above bar */}
              {showValues && value > 0 && (
                <Text
                  style={[
                    styles.valueLabel,
                    { color: colors.textTertiary },
                    isHighlighted && { color: actualHighlightColor, fontWeight: '600' },
                  ]}
                  numberOfLines={1}
                >
                  {formatValue(value)}
                </Text>
              )}

              {/* Bar */}
              <View
                style={[
                  styles.bar,
                  {
                    width: barWidth,
                    height: Math.max(barHeight, 3),
                    backgroundColor: color,
                    opacity: isHighlighted ? 1 : 0.5,
                  },
                ]}
              />
            </View>
          );
        })}
      </View>

      {/* Labels */}
      {showLabels && (
        <View style={styles.labelsContainer}>
          {labels.map((label, index) => {
            const isHighlighted = index === highlightIndex;
            return (
              <View key={index} style={[styles.labelWrapper, { width: barWidth + barGap }]}>
                <Text
                  style={[
                    styles.label,
                    { color: colors.textTertiary },
                    isHighlighted && [styles.highlightedLabel, { color: colors.textPrimary }],
                  ]}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {label}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function formatValue(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  if (value >= 100) {
    return Math.round(value).toString();
  }
  if (Number.isInteger(value)) {
    return value.toString();
  }
  return value.toFixed(1);
}

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
  },
  barWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    borderRadius: BorderRadius.small,
    minHeight: 3,
  },
  valueLabel: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginBottom: 3,
    fontSize: 10,
  },
  labelsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.sm,
    gap: 0,
  },
  labelWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  label: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: 'center',
    fontSize: 10,
  },
  highlightedLabel: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
});

export default InsightChart;
