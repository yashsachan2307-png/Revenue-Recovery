export interface AgentDecision {
  recoveryType: 'WAIT_AND_RETRY' | 'NOTIFY_CUSTOMER' | 'RETRY_ALTERNATIVE_METHOD' | 'ESCALATE' | 'STOP_RECOVERY';
  confidence: number;
  reason: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH';
  expectedOutcome: string;
  requiresEscalation: boolean;
}

export class LLMProvider {
  static async analyze(context: any): Promise<AgentDecision> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.log("[LLMProvider] No API key found. Falling back to deterministic rules.");
      return this.deterministicFallback(context);
    }

    try {
      const prompt = `
        You are a Revenue Recovery AI Agent.
        Analyze the following failed payment context and recommend a recovery strategy.
        Respond ONLY with a valid JSON object matching this structure, and nothing else:
        {
          "recoveryType": "WAIT_AND_RETRY" | "NOTIFY_CUSTOMER" | "RETRY_ALTERNATIVE_METHOD" | "ESCALATE" | "STOP_RECOVERY",
          "confidence": number (0-100),
          "reason": "Concise business reasoning",
          "urgency": "LOW" | "MEDIUM" | "HIGH",
          "expectedOutcome": "Expected outcome string",
          "requiresEscalation": boolean
        }

        Context:
        ${JSON.stringify(context, null, 2)}
      `;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });

      if (!response.ok) {
        throw new Error(`LLM API Error: ${response.statusText}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!text) throw new Error("Empty response from LLM");

      return JSON.parse(text) as AgentDecision;

    } catch (error) {
      console.error("[LLMProvider] LLM failed, falling back:", error);
      return this.deterministicFallback(context);
    }
  }

  private static deterministicFallback(context: any): AgentDecision {
    const reason = context.failure_reason || 'UNKNOWN';
    const attempt = context.attempt_number || 1;

    if (reason === 'insufficient_funds') {
      return {
        recoveryType: 'WAIT_AND_RETRY',
        confidence: 85,
        reason: 'Insufficient funds typically resolve within a few days. Recommended to wait and retry.',
        urgency: 'LOW',
        expectedOutcome: 'Successful charge after funds are added',
        requiresEscalation: false
      };
    }

    if (reason === 'card_expired' || reason === 'invalid_payment_method') {
      return {
        recoveryType: 'NOTIFY_CUSTOMER',
        confidence: 95,
        reason: 'Payment method is invalid or expired. Customer intervention required.',
        urgency: 'HIGH',
        expectedOutcome: 'Customer updates payment method',
        requiresEscalation: false
      };
    }

    if (attempt >= 3) {
      return {
        recoveryType: 'ESCALATE',
        confidence: 90,
        reason: 'Max retries reached. Escalate to manual review.',
        urgency: 'MEDIUM',
        expectedOutcome: 'Human review required',
        requiresEscalation: true
      };
    }

    // Default
    return {
      recoveryType: 'WAIT_AND_RETRY',
      confidence: 70,
      reason: 'Temporary failure assumed. Safe to retry.',
      urgency: 'MEDIUM',
      expectedOutcome: 'Successful retry',
      requiresEscalation: false
    };
  }
}
