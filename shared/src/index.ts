import { z } from "zod";

export const PaymentStatusEnum = z.enum(["successful", "failed", "pending"]);
export type PaymentStatus = z.infer<typeof PaymentStatusEnum>;

export const FailureReasonEnum = z.enum([
  "insufficient_funds",
  "card_declined",
  "expired_card",
  "bank_timeout",
  "authentication_failed",
  "network_error",
  "unknown"
]);
export type FailureReason = z.infer<typeof FailureReasonEnum>;

export const RecoveryStatusEnum = z.enum([
  "detected",
  "analyzing",
  "recommended",
  "action_pending",
  "recovered",
  "failed",
  "escalated"
]);
export type RecoveryStatus = z.infer<typeof RecoveryStatusEnum>;

export const SeverityEnum = z.enum(["LOW", "MEDIUM", "HIGH"]);
export type Severity = z.infer<typeof SeverityEnum>;

export const FailureCategoryEnum = z.enum([
  "PAYMENT_METHOD",
  "CUSTOMER_FUNDS",
  "AUTHENTICATION",
  "BANK",
  "NETWORK",
  "UNKNOWN"
]);
export type FailureCategory = z.infer<typeof FailureCategoryEnum>;

export const MerchantSchema = z.object({
  id: z.string(),
  name: z.string(),
  currency: z.string(),
  created_at: z.string()
});
export type Merchant = z.infer<typeof MerchantSchema>;

export const CustomerSchema = z.object({
  id: z.string(),
  merchant_id: z.string(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  lifetime_value: z.number(),
  successful_payments: z.number(),
  failed_payments: z.number(),
  created_at: z.string()
});
export type Customer = z.infer<typeof CustomerSchema>;

export const PaymentSchema = z.object({
  id: z.string(),
  merchant_id: z.string(),
  customer_id: z.string(),
  amount: z.number(),
  currency: z.string(),
  status: PaymentStatusEnum,
  failure_reason: FailureReasonEnum.nullable(),
  payment_method: z.string(),
  attempt_number: z.number(),
  created_at: z.string(),
  updated_at: z.string()
});
export type Payment = z.infer<typeof PaymentSchema>;

export const RecoveryOpportunitySchema = z.object({
  id: z.string(),
  payment_id: z.string(),
  customer_id: z.string(),
  amount_at_risk: z.number(),
  category: FailureCategoryEnum,
  severity: SeverityEnum,
  status: RecoveryStatusEnum,
  recommended_action: z.string(),
  created_at: z.string(),
  updated_at: z.string()
});
export type RecoveryOpportunity = z.infer<typeof RecoveryOpportunitySchema>;

export const RecoveryEventSchema = z.object({
  id: z.string(),
  recovery_opportunity_id: z.string(),
  event_type: z.string(),
  description: z.string(),
  created_at: z.string()
});
export type RecoveryEvent = z.infer<typeof RecoveryEventSchema>;
