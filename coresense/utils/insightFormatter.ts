/**
 * Insight Formatter
 * Transforms technical insights into natural, human-written language
 */

import { Pattern } from './coresenseApi';

export interface FormattedInsight {
  title: string;
  message: string;
  category: string;
  trend?: 'up' | 'down' | 'stable';
  actionText?: string;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Transform a technical pattern into a natural, conversational insight
 */
export function formatInsight(pattern: Pattern): FormattedInsight {
  const category = pattern.category.toLowerCase();
  
  // Transform the interpretation into natural language
  let message = pattern.interpretation;
  
  // Make it more conversational
  message = makeConversational(message, category);
  
  // Determine priority based on trend and category
  const priority = determinePriority(pattern.trend, category);
  
  // Transform action text if available
  let actionText = pattern.expandedContent 
    ? extractActionFromContent(pattern.expandedContent)
    : undefined;
  
  return {
    title: pattern.title,
    message,
    category,
    trend: pattern.trend,
    actionText,
    priority,
  };
}

/**
 * Make technical language more conversational and human
 */
function makeConversational(text: string, category: string): string {
  let result = text;
  
  // Replace technical phrases with natural ones
  const replacements: [RegExp, string][] = [
    [/You slept ([\d.]+) hours on average/i, "You've been getting about $1 hours of sleep"],
    [/You averaged ([\d,]+) steps/i, "You're walking around $1 steps"],
    [/Aim for ([\d,]+) steps/i, "Try to hit $1 steps"],
    [/aim for ([\d.]+) hours/i, "shoot for $1 hours"],
    [/try to aim for/i, "try for"],
    [/to improve recovery/i, "to feel more rested"],
    [/to improve/i, "to feel better"],
    [/optimal health/i, "feeling your best"],
    [/excellent sleep patterns/i, "really solid sleep"],
    [/maintaining excellent/i, "doing great with"],
    [/improvement opportunity/i, "something to work on"],
    [/Sleep Duration Notice/i, "About your sleep"],
    [/excessive sleep may indicate/i, "lots of sleep might mean"],
    [/consistency improves/i, "keeping a regular schedule helps"],
    [/significantly/i, "quite a bit"],
    [/variance/i, "variation"],
    [/Activity Goal Opportunity/i, "Moving more"],
    [/Excellent Activity Level/i, "You're crushing it"],
    [/exceeding the ([\d,]+) steps goal/i, "way past $1 steps"],
    [/Great work/i, "Nice job"],
    [/Start Tracking/i, "Ready to track"],
    [/helps identify patterns/i, "helps you see what's working"],
    [/More frequent tracking/i, "Logging more often"],
    [/provides better insights/i, "gives you clearer picture"],
    [/Mood Support/i, "How you're feeling"],
    [/averaged ([\d.]+)\/10/i, "around $1 out of 10"],
    [/consider activities that bring you joy/i, "try doing things you enjoy"],
    [/speak with someone you trust/i, "talk to someone close"],
    [/High Stress Levels/i, "Feeling stressed"],
    [/stress-reduction techniques/i, "ways to unwind"],
    [/Track Water Intake/i, "Stay hydrated"],
    [/essential for health/i, "super important"],
    [/Increase Hydration/i, "Drink more water"],
    [/averaging ([\d]+)ml/i, "drinking about $1ml"],
    [/optimal hydration/i, "staying well hydrated"],
  ];
  
  replacements.forEach(([pattern, replacement]) => {
    result = result.replace(pattern, replacement);
  });
  
  // Add natural transitions
  if (!result.startsWith("You") && !result.startsWith("Your") && !result.startsWith("Try")) {
    // Add "You" if it makes sense
    if (result.match(/^(Sleep|Activity|Nutrition|Mental|Hydration)/i)) {
      result = result.replace(/^/, "Here's what I noticed: ");
    }
  }
  
  // Make it feel more personal
  result = result.replace(/\./g, (match, offset) => {
    // Add occasional casual language
    if (Math.random() > 0.7 && offset > result.length / 2) {
      return match;
    }
    return match;
  });
  
  return result;
}

/**
 * Extract actionable text from expanded content
 */
function extractActionFromContent(content: string): string | undefined {
  // Look for action-oriented phrases
  const actionPatterns = [
    /(?:Try|Set|Add|Log|Drink|Do|Start|Take)\s+[^\.]+/i,
    /(?:aim|goal|target)\s+[^\.]+/i,
  ];
  
  for (const pattern of actionPatterns) {
    const match = content.match(pattern);
    if (match) {
      let action = match[0];
      // Clean it up
      action = action.replace(/^(Try|Set|Add|Log|Drink|Do|Start|Take)\s+/i, '');
      return action.charAt(0).toUpperCase() + action.slice(1);
    }
  }
  
  return undefined;
}

/**
 * Determine priority based on trend and category
 */
function determinePriority(
  trend: 'up' | 'down' | 'stable',
  category: string
): 'high' | 'medium' | 'low' {
  // High priority: declining trends in important categories
  if (trend === 'down') {
    if (category === 'sleep' || category === 'mental') {
      return 'high';
    }
    return 'medium';
  }
  
  // Medium priority: stable but actionable
  if (trend === 'stable') {
    if (category === 'sleep' || category === 'activity') {
      return 'medium';
    }
  }
  
  // Low priority: positive trends or less critical categories
  if (trend === 'up') {
    return 'low';
  }
  
  return 'medium';
}

/**
 * Group insights by category for better organization
 */
export function groupInsightsByCategory(
  insights: FormattedInsight[]
): Record<string, FormattedInsight[]> {
  const grouped: Record<string, FormattedInsight[]> = {};
  
  insights.forEach((insight) => {
    const category = insight.category;
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(insight);
  });
  
  // Sort each group by priority
  Object.keys(grouped).forEach((category) => {
    grouped[category].sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  });
  
  return grouped;
}

/**
 * Get a friendly greeting based on wellness score
 */
export function getWellnessGreeting(score: number): string {
  if (score >= 85) {
    return "You're doing great!";
  } else if (score >= 70) {
    return "Looking good overall";
  } else if (score >= 55) {
    return "Here's what I noticed";
  } else {
    return "Let's focus on what matters";
  }
}
