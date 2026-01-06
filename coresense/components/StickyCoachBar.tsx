/**
 * Sticky Coach Bar Component
 * Minimalist bottom bar with glowing notification badge
 * Optimized for 5-second interactions
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius, getGlassmorphismStyle } from '../constants/theme';

interface StickyCoachBarProps {
  onPress: () => void;
  unreadCount?: number;
  hasUnread?: boolean;
}

export default function StickyCoachBar({ 
  onPress, 
  unreadCount = 0, 
  hasUnread = false 
}: StickyCoachBarProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.barContainer}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={[styles.barInner, getGlassmorphismStyle('card')]}>
          {/* Coach Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="chatbubbles" size={20} color={Colors.primary} />
          </View>
          
          {/* Coach Text */}
          <View style={styles.textContainer}>
            <Text style={styles.coachText}>What's really going on today?</Text>
            {hasUnread && (
              <Text style={styles.subText}>New message waiting</Text>
            )}
          </View>
          
          {/* Notification Badge */}
          {hasUnread && (
            <View style={styles.notificationContainer}>
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationText}>
                  {unreadCount > 99 ? '99+' : unreadCount.toString()}
                </Text>
              </View>
            </View>
          )}
          
          {/* Action Indicator */}
          <View style={styles.actionContainer}>
            <Ionicons name="arrow-forward" size={16} color={Colors.textTertiary} />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 20, // Account for safe area
    paddingTop: Spacing.md,
    backgroundColor: 'transparent',
  },
  barContainer: {
    borderRadius: BorderRadius.large,
    overflow: 'hidden',
  },
  barInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.large,
    borderWidth: 1,
    position: 'relative',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.glassHighlight,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  coachText: {
    ...Typography.button,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  subText: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  notificationContainer: {
    marginRight: Spacing.md,
  },
  notificationBadge: {
    backgroundColor: Colors.neonPink,
    borderRadius: 12,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.neonPink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  notificationText: {
    ...Typography.bodySmall,
    color: 'white',
    fontWeight: '700',
    fontSize: 12,
  },
  actionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});