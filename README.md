# REVENUE//RECOVERY

**AI-powered revenue recovery infrastructure that detects revenue at risk, selects bounded recovery actions, applies policy guardrails, executes recovery workflows, and measures recovered revenue.**

## 1. Problem
Merchants lose a significant percentage of their revenue to failed payments caused by transient network issues, bank timeouts, authentication failures, and insufficient funds. Analyzing each failure manually is impossible at scale, and naive blind-retry systems lead to terrible customer experiences and blocked payment gateways.

## 2. Solution
REVENUE//RECOVERY is a deterministic, AI-driven payment recovery platform. It acts as an autonomous financial agent that contextually understands *why* a payment failed and orchestrates the safest, most effective path to recovering the funds without violating merchant policies. 

## 3. Core Features
- **AI Failure Analysis**: Classifies and analyzes root causes of failed payments.
- **Policy Engine**: Strictly bounds the AI's recommendations with absolute deterministic rules.
- **Action Execution**: Triggers notifications, wait-and-retry schedules, or escalation to human review.
- **Synthetic Evaluation**: Includes a 500-case synthetic engine to mathematically prove the AI's revenue recovery lift vs. naive baseline strategies.
- **Audit Logging**: Maintains a fully transparent ledger of every decision, policy check, and action.

## 4. Architecture

```text
Payment Events
      ↓
Risk Detection
      ↓
AI Analysis
      ↓
Recovery Recommendation
      ↓
Policy Engine
      ↓
Bounded Action Executor
      ↓
Recovery Result
      ↓
Audit Log
      ↓
Analytics / Evaluation
```

*Note: This is a demonstration application. Real money movement is NOT performed by the demo.*

## 5. AI Agent
The system utilizes a modern LLM (configured for Gemini 2.5) to parse unstructured failure strings, customer context, and bank status codes into structured, explainable recovery strategies. The AI evaluates confidence levels and explicitly states its reasoning.

## 6. Policy Engine
AI is strictly an advisory component. The **Policy Engine** evaluates the AI's recommended action against deterministic merchant-configured rules (e.g., "Never auto-retry payments > ₹50,000" or "Always require human review for VIP customers").

## 7. Recovery Workflow
The system layers declarative workflow automation over the AI. Merchants can create triggers based on payment size, failure type, or customer segment to bypass the AI entirely or enforce strict cooldowns between retry attempts.

## 8. Synthetic Evaluation
To demonstrate actual ROI, the application features an integrated evaluation engine that tests the AI recovery strategy against a deterministic synthetic dataset of 500 payment cases. The resulting dashboard calculates the exact synthetic "Revenue Recovered" vs a naive baseline.

## 9. Security
- **Authentication**: JWT-based session persistence with HTTP-only cookies and proper authorization middleware.
- **Rate Limiting**: Brute-force protection on all `/auth` and public routes.
- **Cryptography**: PBKDF2 (100k iterations) password hashing. 
- **Secret Management**: API keys and configurations are strictly bound to server-side environments.

## 10. Local Setup
From the project root:

1. Install dependencies across all workspaces:
   ```bash
   npm install
   ```
2. Build and run the backend:
   ```bash
   npm run build --workspace=backend
   npm run dev --workspace=backend
   ```
3. Build and run the frontend:
   ```bash
   npm run build --workspace=frontend
   npm run dev --workspace=frontend
   ```

## 11. Demo Access
To instantly test the product without registering an account:
1. Start the application.
2. Navigate to the Login screen.
3. Click the **"Demo Access (Instant Entry)"** button to bypass authentication and launch into a pre-seeded synthetic merchant environment.

## 12. Tech Stack
- **Frontend**: React + TypeScript + Vite + Tailwind CSS (v4)
- **Backend**: Express + TypeScript + SQLite + Better-SQLite3
- **Shared**: Zod validation schemas
