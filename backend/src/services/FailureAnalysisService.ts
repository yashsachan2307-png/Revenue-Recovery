import { FailureReason, FailureCategory } from "../../../shared/src";

export class FailureAnalysisService {
  static classify(reason: FailureReason | string | null): FailureCategory {
    switch (reason) {
      case "insufficient_funds":
        return "CUSTOMER_FUNDS";
      case "card_declined":
      case "expired_card":
        return "PAYMENT_METHOD";
      case "authentication_failed":
        return "AUTHENTICATION";
      case "bank_timeout":
        return "BANK";
      case "network_error":
        return "NETWORK";
      default:
        return "UNKNOWN";
    }
  }
}
