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

    if (reason === 'insufficient_funds') {
      return {
        recoveryType: 'WAIT_AND_RETRY',
        confidence: 85,
        reason: 'Insufficient funds typically resolve within a few days. Recommended delayed retry.',
        urgency: 'LOW',
        expectedOutcome: 'Successful charge after funds are added',
        requiresEscalation: false
      };
    }

    if (reason === 'network_error') {
      return {
        recoveryType: 'WAIT_AND_RETRY',
        confidence: 90,
        reason: 'Network errors are transient. Immediate retry recommended.',
        urgency: 'HIGH',
        expectedOutcome: 'Successful charge on immediate retry',
        requiresEscalation: false
      };
    }

    if (reason === 'bank_timeout') {
      return {
        recoveryType: 'WAIT_AND_RETRY',
        confidence: 80,
        reason: 'Bank timeouts indicate temporary downtime. Delayed retry recommended.',
        urgency: 'MEDIUM',
        expectedOutcome: 'Successful charge on delayed retry',
        requiresEscalation: false
      };
    }

    if (reason === 'authentication_failed') {
      return {
        recoveryType: 'NOTIFY_CUSTOMER',
        confidence: 95,
        reason: 'Customer verification required due to failed authentication.',
        urgency: 'HIGH',
        expectedOutcome: 'Customer completes 3DS/verification',
        requiresEscalation: false
      };
    }

    if (reason === 'card_declined' || reason === 'expired_card') {
      return {
        recoveryType: 'RETRY_ALTERNATIVE_METHOD',
        confidence: 90,
        reason: 'Card was declined. Request alternate payment method.',
        urgency: 'HIGH',
        expectedOutcome: 'Customer provides new payment method',
        requiresEscalation: false
      };
    }

    // Default
    return {
      recoveryType: 'ESCALATE',
      confidence: 70,
      reason: 'Unknown failure reason. Safe escalation.',
      urgency: 'MEDIUM',
      expectedOutcome: 'Human review required',
      requiresEscalation: true
    };
  }
}
