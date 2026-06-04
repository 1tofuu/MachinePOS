/**
 * KHQR Payment Utilities
 *
 * Helper functions for KHQR payment processing
 */

export interface KHQRPaymentData {
  amount: number;
  invoiceNumber: string;
  description?: string;
  merchantName?: string;
  timestamp?: Date;
}

/**
 * Generate KHQR string from payment data
 * This is a simplified version - actual KHQR format follows specific standards
 *
 * @param data Payment data to encode
 * @returns KHQR encoded string
 */
export const generateKHQRString = (data: KHQRPaymentData): string => {
  // This is a placeholder implementation
  // In production, use the official KHQR specification from NBC (National Bank of Cambodia)
  // Reference: https://www.nbc.org.kh/khqr/

  const khqrPayload = {
    amount: data.amount,
    invoice: data.invoiceNumber,
    description: data.description || "Payment",
    merchant: data.merchantName || "Merchant",
    timestamp: data.timestamp?.toISOString() || new Date().toISOString(),
  };

  return JSON.stringify(khqrPayload);
};

/**
 * Format currency for Cambodian Riel (KHR)
 * @param amount Amount to format
 * @returns Formatted currency string
 */
export const formatKHR = (amount: number): string => {
  return new Intl.NumberFormat("km-KH", {
    style: "currency",
    currency: "KHR",
  }).format(amount);
};

/**
 * Format currency for USD
 * @param amount Amount to format
 * @returns Formatted currency string
 */
export const formatUSD = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

/**
 * Convert seconds to time display format (MM:SS)
 * @param seconds Time in seconds
 * @returns Formatted time string
 */
export const formatTimeRemaining = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
};

/**
 * Check if payment has expired based on time remaining
 * @param timeRemaining Time in seconds
 * @returns True if expired
 */
export const isPaymentExpired = (timeRemaining: number): boolean => {
  return timeRemaining <= 0;
};

/**
 * Calculate payment status based on time and transaction state
 * @param timeRemaining Time in seconds
 * @param isPaid Whether payment has been confirmed
 * @param isCancelled Whether payment has been cancelled
 * @returns Current payment status
 */
export const calculatePaymentStatus = (
  timeRemaining: number,
  isPaid: boolean,
  isCancelled: boolean,
): "PENDING" | "PAID" | "EXPIRED" | "CANCELLED" => {
  if (isPaid) return "PAID";
  if (isCancelled) return "CANCELLED";
  if (timeRemaining <= 0) return "EXPIRED";
  return "PENDING";
};

/**
 * Generate mock KHQR image (for testing)
 * In production, use qrcode.react or similar library
 *
 * @param data Payment data
 * @returns Data URL for QR code image
 */
export const generateMockKHQRImage = async (data: KHQRPaymentData): Promise<string> => {
  // This is a placeholder that returns a mock QR code
  // In production, use:
  // - QRCode.toDataURL() from 'qrcode' library
  // - <QRCode /> from 'qrcode.react' library

  const khqrString = generateKHQRString(data);

  // For demo purposes, return a data URL
  // In production, integrate with proper QR code generation library
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(khqrString)}`;
};

/**
 * Validate KHQR payment data
 * @param data Payment data to validate
 * @returns Validation result with errors if any
 */
export const validateKHQRPayment = (
  data: KHQRPaymentData,
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!data.amount || data.amount <= 0) {
    errors.push("Amount must be greater than 0");
  }

  if (!data.invoiceNumber || data.invoiceNumber.trim().length === 0) {
    errors.push("Invoice number is required");
  }

  if (data.amount > 1000000) {
    errors.push("Amount exceeds maximum limit");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Parse KHQR response from payment gateway
 * @param response Raw response from payment gateway
 * @returns Parsed payment response
 */
export interface KHQRPaymentResponse {
  success: boolean;
  invoiceNumber: string;
  amount: number;
  status: "PENDING" | "PAID" | "EXPIRED" | "CANCELLED";
  transactionId?: string;
  timestamp?: string;
  message?: string;
}

export const parseKHQRResponse = (response: any): KHQRPaymentResponse => {
  return {
    success: response.success || false,
    invoiceNumber: response.invoiceNumber || "",
    amount: response.amount || 0,
    status: response.status || "PENDING",
    transactionId: response.transactionId,
    timestamp: response.timestamp,
    message: response.message,
  };
};
