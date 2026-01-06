/**
 * OpenAI Coach Service
 * Implements the accountability coach personality with anti-generic mechanisms
 */

// OpenAI Coach Service - Frontend wrapper
// Actual OpenAI integration will be handled on the backend for security

interface OpenAIConfig {
  apiKey: string;
  baseURL?: string;
}

class MockOpenAI {
  constructor(config: OpenAIConfig) {
    console.log('OpenAI Coach initialized with mock responses for development');
  }

  async chatCompletionsCreate(params: any) {
    // Mock response for development
    return {
      choices: [{
        message: {
          content: "I'm here. What's going on with your goals today?"
        }
      }]
    };
  }

  get chat() {
    return {
      completions: {
        create: this.chatCompletionsCreate.bind(this)
      }
    };
  }
}

// Use mock for now - backend will handle actual OpenAI integration
const openai = new MockOpenAI({ 
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY || 'mock-key' 
});

export interface CoachContext {
  user_state: {
    current_streak: number;
    longest_streak: number;
    recent_pattern: 'locked_in' | 'coasting' | 'slipping' | 'struggling';
    last_commitment?: string;
    commitment_status?: 'pending' | 'completed' | 'missed';
    days_since_last_open: number;
    typical_active_hours: string;
    response_rate: 'high' | 'medium' | 'low';
  };
  conversation_context: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
  health_context?: {
    sleep_trend?: 'improving' | 'stable' | 'declining';
    activity_trend?: 'improving' | 'stable' | 'declining';
    recent_sleep_hours?: number;
    recent_steps?: number;
  };
  time_context: {
    current_time: string;
    time_until_commitment?: string;
    day_of_week: string;
    hour_of_day: number;
  };
}

export interface CoachResponse {
  messages: string[];
  personality_score: number;
  context_used: string[];
  variation_applied: boolean;
}

class OpenAICoach {
  private personality_variations = [
    "direct and blunt",
    "supportive but challenging", 
    "impatient and results-focused",
    "observant and pattern-focused",
    "motivational with high expectations"
  ];

  private message_templates = {
    greeting: [
      "Alright, what's the plan today?",
      "Morning. Ready to lock in?",
      "Hey. Still serious about this?",
      "What's good. Let's make today count."
    ],
    check_in: [
      "How's it going?",
      "Still on track?",
      "Talk to me.",
      "What's the situation?",
      "Be honest - how's it really going?"
    ],
    encouragement: [
      "Good. Keep it going.",
      "That's what I'm talking about.",
      "Nice work. Most people quit by now.",
      "See? This is what happens when you lock in.",
      "That's the difference right there."
    ],
    pressure: [
      "You've been coasting.",
      "Not failing, but not locking in either.",
      "What's changed?",
      "This is where people drop off.",
      "Tomorrow. Lock in or tell me you don't actually want this."
    ]
  };

  private used_variations = new Set<string>();
  private conversation_history: Array<{role: string, content: string}> = [];

  /**
   * Generate coach response with accountability personality
   */
  async generateResponse(
    userMessage: string,
    context: CoachContext,
    responseType: 'greeting' | 'check_in' | 'response' | 'pressure' | 'encouragement' = 'response'
  ): Promise<CoachResponse> {
    try {
      // Build system prompt with coach personality
      const systemPrompt = this.buildSystemPrompt(context);
      
      // Get user message with context
      const userPrompt = this.buildUserPrompt(userMessage, context, responseType);
      
      // Call OpenAI
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 150,
        temperature: 0.8,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
      });

      const response = completion.choices[0]?.message?.content || "I'm here. Talk to me.";
      
      // Process response into multiple short messages
      const messages = this.processResponse(response, responseType);
      
      // Apply anti-generic mechanisms
      const processedMessages = this.applyAntiGeneric(messages, context);
      
      // Update conversation history
      this.conversation_history.push(
        { role: 'user', content: userMessage },
        { role: 'assistant', content: processedMessages.join(' ') }
      );
      
      // Keep only last 20 messages for context
      if (this.conversation_history.length > 20) {
        this.conversation_history = this.conversation_history.slice(-20);
      }

      return {
        messages: processedMessages,
        personality_score: this.calculatePersonalityScore(processedMessages),
        context_used: this.extractContextUsed(context),
        variation_applied: this.used_variations.size > 0
      };

    } catch (error) {
      console.error('OpenAI Coach error:', error);
      // Fallback response
      return {
        messages: ["I'm here. What's going on?"],
        personality_score: 0.5,
        context_used: [],
        variation_applied: false
      };
    }
  }

  /**
   * Build system prompt with coach identity and personality
   */
  private buildSystemPrompt(context: CoachContext): string {
    return `You are a personal accountability coach. You text like a real person: short messages, direct, sometimes blunt, occasionally funny. You remember everything the user tells you and reference it naturally.

PERSONALITY:
- Casual but not unprofessional
- Direct but not mean  
- High expectations but realistic
- Calls out patterns users can't see
- Celebrates real progress, ignores fake wins
- Adjusts pressure based on user state (struggling vs. coasting)

BEHAVIORAL RULES:
- Keep messages under 20 words unless explaining something complex
- Ask follow-up questions, don't just respond
- Sometimes challenge the user's excuses
- Reference past conversations naturally
- Use the user's name rarely (3-4 times per week max)
- Send 1-3 short messages rather than one long one
- Vary sentence structure, use contractions
- Occasional sentence fragments
- Sometimes start with "Alright" or "Okay" or "Real talk"

FORBIDDEN:
- Never say "I'm just an AI"
- Never apologize for being direct
- Never use corporate wellness language
- Never give generic advice
- Never forget what the user told you

CURRENT USER STATE:
- Streak: ${context.user_state.current_streak} days (longest: ${context.user_state.longest_streak})
- Pattern: ${context.user_state.recent_pattern}
- Response rate: ${context.user_state.response_rate}
- Last open: ${context.user_state.days_since_last_open} days ago
- Active hours: ${context.user_state.typical_active_hours}

Time context: ${context.time_context.day_of_week}, ${context.time_context.hour_of_day}:00

Remember: Test every message with "Would a real person text this?"`;
  }

  /**
   * Build user prompt with context and conversation history
   */
  private buildUserPrompt(
    userMessage: string, 
    context: CoachContext, 
    responseType: string
  ): string {
    let prompt = `User message: "${userMessage}"\n\n`;
    
    if (context.conversation_context.length > 0) {
      prompt += "Recent conversation:\n";
      context.conversation_context.slice(-5).forEach(msg => {
        prompt += `${msg.role}: ${msg.content}\n`;
      });
      prompt += "\n";
    }

    if (context.user_state.last_commitment) {
      prompt += `Active commitment: "${context.user_state.last_commitment}" (${context.user_state.commitment_status})\n\n`;
    }

    if (context.health_context) {
      prompt += `Health context: Sleep ${context.health_context.sleep_trend || 'stable'}, Activity ${context.health_context.activity_trend || 'stable'}\n\n`;
    }

    prompt += `Response type: ${responseType}\n`;
    prompt += `Generate 1-3 short messages that feel human and accountable.`;

    return prompt;
  }

  /**
   * Process response into multiple short messages
   */
  private processResponse(response: string, responseType: string): string[] {
    // Split response into sentences and filter out empty ones
    const sentences = response
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // Group sentences into 1-3 message chunks
    const messages: string[] = [];
    let currentMessage = '';

    for (const sentence of sentences) {
      if (currentMessage.length + sentence.length > 100) {
        if (currentMessage) {
          messages.push(currentMessage.trim());
          currentMessage = sentence;
        } else {
          messages.push(sentence);
        }
      } else {
        currentMessage += (currentMessage ? '. ' : '') + sentence;
      }
    }

    if (currentMessage) {
      messages.push(currentMessage.trim());
    }

    // Return 1-3 messages
    return messages.slice(0, 3);
  }

  /**
   * Apply anti-generic mechanisms
   */
  private applyAntiGeneric(messages: string[], context: CoachContext): string[] {
    return messages.map((message, index) => {
      let processed = message;

      // Add occasional contractions
      processed = processed
        .replace(/\bdo not\b/g, "don't")
        .replace(/\bcannot\b/g, "can't")
        .replace(/\bit is\b/g, "it's")
        .replace(/\bthat is\b/g, "that's");

      // Add sentence fragments occasionally (for the first message)
      if (index === 0 && Math.random() > 0.7) {
        const fragments = ["Alright.", "Okay.", "Real talk."];
        processed = fragments[Math.floor(Math.random() * fragments.length)] + " " + processed;
      }

      // Add occasional typos (controlled)
      if (Math.random() > 0.9) {
        processed = processed.replace(/\btomorrow\b/g, "tmrw");
      }

      return processed;
    });
  }

  /**
   * Calculate personality score (how "human" the response feels)
   */
  private calculatePersonalityScore(messages: string[]): number {
    let score = 0;
    let factors = 0;

    messages.forEach(message => {
      // Check for short messages
      if (message.length < 50) score += 0.2;
      
      // Check for contractions
      if (message.includes("'")) score += 0.1;
      
      // Check for direct language
      if (/\b(what|how|when|why|where)\b/.test(message.toLowerCase())) score += 0.1;
      
      // Check for casual language
      if (/\b(alright|okay|good|nice|cool)\b/.test(message.toLowerCase())) score += 0.1;
      
      factors++;
    });

    return Math.min(score / factors, 1.0);
  }

  /**
   * Extract which context elements were used
   */
  private extractContextUsed(context: CoachContext): string[] {
    const used: string[] = [];
    
    if (context.user_state.current_streak > 0) used.push('streak');
    if (context.conversation_context.length > 0) used.push('conversation_history');
    if (context.user_state.last_commitment) used.push('commitment');
    if (context.health_context) used.push('health_data');
    
    return used;
  }

  /**
   * Get appropriate greeting based on context
   */
  async getContextualGreeting(context: CoachContext): Promise<string[]> {
    const streak = context.user_state.current_streak;
    
    if (streak >= 7) {
      return ["Three weeks without missing. You know that's different, right?"];
    } else if (streak >= 3) {
      return ["Good to see you back.", "Ready to lock in today?"];
    } else {
      return ["Alright, let's start simple.", "What's one thing you keep saying you'll do but don't?"];
    }
  }

  /**
   * Get appropriate pressure message
   */
  async getPressureMessage(context: CoachContext): Promise<string[]> {
    const pattern = context.user_state.recent_pattern;
    
    if (pattern === 'coasting') {
      return ["You've been coasting.", "Not failing, but not locking in either."];
    } else if (pattern === 'slipping') {
      return ["Talk to me.", "What's going on?"];
    } else {
      return ["How's it going?", "Still on track?"];
    }
  }
}

export const openAICoach = new OpenAICoach();