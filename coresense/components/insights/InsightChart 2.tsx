/**
 * Insight Chart Component
 * Simple bar chart for pattern evidence visualization.
 * Minimal design - no axis labels, highlight bar at specified index.
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Colors, Spacing, Typography } from '../../constants/theme';

const screenWidth = Dimensions.get('window').width;

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
  highlightColor = Colors.primary,
  barColor = Colors.glassBorder,
  showLabels = true,
  showValues = true,
  height = 120,
}: InsightChartProps) {
  // Calculate max value for scaling
  const maxValue = Math.max(...values, 1);
  const chartWidth = screenWidth - Spacing.lg * 4;
  const barWidth = Math.min(32, chartWidth / labels.length - 8);
  const barGap = 8;

  return (
    <View style={[styles.container, { height: height + 40 }]}>
      {/* Bars */}
      <View style={[styles.barsContainer, { height }]}>
        {values.map((value, index) => {
          const isHighlighted = index === highlightIndex;
          const barHeight = maxValue > 0 ? (value / maxValue) * height * 0.85 : 0;
          const color = isHighlighted ? highlightColor : barColor;

          return (
            <View key={index} style={styles.barWrapper}>
              {/* Value above bar */}
              {showValues && value > 0 && (
                <Text style={[styles.valueLabel, isHighlighted && styles.highlightedValueLabel]}>
                  {formatValue(value)}
                </Text>
              )}

              {/* Bar */}
              <View
                style={[
                  styles.bar,
                  {
                    width: barWidth,
                    height: Math.max(barHeight, 4),
                    backgroundColor: color,
                  },
                  isHighlighted && styles.highlightedBar,
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
              <Text
                key={index}
                style={[
                  styles.label,
                  { width: barWidth + barGap },
                  isHighlighted && styles.highlightedLabel,
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
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
    marginVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8,
  },
  barWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    borderRadius: 4,
    minHeight: 4,
  },
  highlightedBar: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 5,
  },
  valueLabel: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginBottom: 4,
    fontSize: 10,
  },
  highlightedValueLabel: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  labelsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.sm,
    gap: 0,
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
