import { RecoveryStrategy } from "../../../shared/src";

export interface AgentDecision {
  detectedIssue: string;
  probableCause: string;
  recommendedStrategy: RecoveryStrategy;
  confidence: number;
  explanation: string;
}

export class LLMProvider {
  static async analyze(context: any): Promise<AgentDecision> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return this.deterministicFallback(context);
    }

    try {
      const prompt = `
        You are a Revenue Recovery AI Agent.
        Analyze the following failed payment context and recommend a recovery strategy.
        Respond ONLY with a valid JSON object matching this structure, and nothing else:
        {
          "detectedIssue": "Short description of the failure",
          "probableCause": "Business logic reasoning for why it failed",
          "recommendedStrategy": "Wait & Retry" | "Notify Customer" | "Alternative Payment Method" | "Escalate" | "Stop Recovery",
          "confidence": number (0-100),
          "explanation": "Concise business reasoning for the recommended strategy"
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
      return this.deterministicFallback(context);
    }
  }

  private static deterministicFallback(context: any): AgentDecision {
    const reason = context.failure_reason || 'UNKNOWN';

    if (reason === 'insufficient_funds') {
      return {
        detectedIssue: 'Insufficient Funds',
        probableCause: 'Customer account lacks available balance for the transaction.',
        recommendedStrategy: 'Wait & Retry',
        confidence: 85,
        explanation: 'Insufficient funds typically resolve within a few days when customers top up. Recommended delayed retry.'
      };
    }

    if (reason === 'network_error') {
      return {
        detectedIssue: 'Network Error',
        probableCause: 'Transient connectivity issue between bank and payment gateway.',
        recommendedStrategy: 'Wait & Retry',
        confidence: 90,
        explanation: 'Network errors are transient. Immediate retry recommended.'
      };
    }

    if (reason === 'bank_timeout') {
      return {
        detectedIssue: 'Bank Timeout',
        probableCause: 'Issuing bank is experiencing temporary downtime or high latency.',
        recommendedStrategy: 'Wait & Retry',
        confidence: 80,
        explanation: 'Bank timeouts indicate temporary downtime. Delayed retry recommended.'
      };
    }

    if (reason === 'authentication_failed') {
      return {
        detectedIssue: 'Authentication Failed',
        probableCause: '3DS or OTP validation failed during checkout.',
        recommendedStrategy: 'Notify Customer',
        confidence: 95,
        explanation: 'Customer verification required due to failed authentication.'
      };
    }

    if (reason === 'card_declined' || reason === 'expired_card') {
      return {
        detectedIssue: 'Card Declined / Expired',
        probableCause: 'The card on file is no longer valid or was declined by the issuer.',
        recommendedStrategy: 'Alternative Payment Method',
        confidence: 90,
        explanation: 'Card was declined. Request alternate payment method.'
      };
    }

    // Default
    return {
      detectedIssue: 'Unknown Failure',
      probableCause: 'The exact cause of the failure could not be determined.',
      recommendedStrategy: 'Escalate',
      confidence: 70,
      explanation: 'Unknown failure reason requires human review. Safe escalation.'
    };
  }
}
