import { useState, useCallback, useEffect, useRef } from "react";

type PaymentStatus = "PENDING" | "PAID" | "EXPIRED" | "CANCELLED";

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

interface UseKHQRPaymentOptions {
  invoiceNumber: string;
  totalAmount: number;
  autoCheckInterval?: number;
  timeoutSeconds?: number;
  onStatusChange?: (status: PaymentStatus) => void;
  onError?: (error: Error) => void;
}

interface UseKHQRPaymentReturn {
  status: PaymentStatus;
  timeRemaining: number;
  isVerifying: boolean;
  error: string | null;
  verifyPayment: () => Promise<void>;
  cancelPayment: () => void;
  resetPayment: () => void;
}

/**
 * Hook for managing KHQR payment state and operations
 *
 * @param options Configuration options
 * @returns Payment state and control functions
 */
export const useKHQRPayment = ({
  invoiceNumber,
  totalAmount,
  autoCheckInterval = 5000,
  timeoutSeconds = 15 * 60, // 15 minutes default
  onStatusChange,
  onError,
}: UseKHQRPaymentOptions): UseKHQRPaymentReturn => {
  const [status, setStatus] = useState<PaymentStatus>("PENDING");
  const [timeRemaining, setTimeRemaining] = useState(timeoutSeconds);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout>();
  const checkIntervalRef = useRef<NodeJS.Timeout>();

  // Countdown timer effect
  useEffect(() => {
    if (status === "PAID" || status === "CANCELLED") return;

    countdownIntervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setStatus("EXPIRED");
          onStatusChange?.("EXPIRED");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [status, onStatusChange]);

  // Auto-check payment status
  useEffect(() => {
    if (status !== "PENDING") return;

    checkIntervalRef.current = setInterval(async () => {
      try {
        // This would call your payment verification API
        await checkPaymentStatus();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to check payment status";
        console.error("Error checking payment status:", errorMessage);
      }
    }, autoCheckInterval);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [status, autoCheckInterval]);

  const checkPaymentStatus = useCallback(async (): Promise<void> => {
    try {
      // Call your backend API to check payment status
      const response = await fetch(`/api/payments/status/${invoiceNumber}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to check payment status");
      }

      const data = await response.json();
      const parsedResponse = parseKHQRResponse(data);

      if (parsedResponse.success && parsedResponse.status === "PAID") {
        setStatus("PAID");
        onStatusChange?.("PAID");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      onError?.(new Error(errorMessage));
    }
  }, [invoiceNumber, onStatusChange, onError]);

  const verifyPayment = useCallback(async (): Promise<void> => {
    setIsVerifying(true);
    setError(null);

    try {
      // Call your backend API to verify payment
      const response = await fetch("/api/payments/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invoiceNumber,
          totalAmount,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to verify payment");
      }

      const data = await response.json();
      const parsedResponse = parseKHQRResponse(data);

      if (parsedResponse.success) {
        setStatus("PAID");
        onStatusChange?.("PAID");
      } else {
        throw new Error(parsedResponse.message || "Payment verification failed");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      onError?.(new Error(errorMessage));
      throw err;
    } finally {
      setIsVerifying(false);
    }
  }, [invoiceNumber, totalAmount, onStatusChange, onError]);

  const cancelPayment = useCallback((): void => {
    setStatus("CANCELLED");
    onStatusChange?.("CANCELLED");

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
    }
  }, [onStatusChange]);

  const resetPayment = useCallback((): void => {
    setStatus("PENDING");
    setTimeRemaining(timeoutSeconds);
    setError(null);
    setIsVerifying(false);

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
    }
  }, [timeoutSeconds]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, []);

  return {
    status,
    timeRemaining,
    isVerifying,
    error,
    verifyPayment,
    cancelPayment,
    resetPayment,
  };
};

/**
 * Hook for polling payment status with exponential backoff
 */
interface UsePollPaymentStatusOptions {
  invoiceNumber: string;
  enabled?: boolean;
  initialDelay?: number;
  maxDelay?: number;
  onStatusChange?: (status: PaymentStatus) => void;
}

export const usePollPaymentStatus = ({
  invoiceNumber,
  enabled = true,
  initialDelay = 2000,
  maxDelay = 10000,
  onStatusChange,
}: UsePollPaymentStatusOptions) => {
  const [isPolling, setIsPolling] = useState(false);
  const [lastStatus, setLastStatus] = useState<PaymentStatus>("PENDING");
  const delayRef = useRef(initialDelay);

  useEffect(() => {
    if (!enabled || lastStatus !== "PENDING") return;

    const poll = async () => {
      try {
        setIsPolling(true);
        const response = await fetch(`/api/payments/status/${invoiceNumber}`);

        if (!response.ok) throw new Error("Failed to fetch status");

        const data = await response.json();
        const newStatus = data.status as PaymentStatus;

        if (newStatus !== lastStatus) {
          setLastStatus(newStatus);
          onStatusChange?.(newStatus);

          // Reset delay on successful status change
          delayRef.current = initialDelay;
        } else {
          // Increase delay with exponential backoff
          delayRef.current = Math.min(delayRef.current * 1.5, maxDelay);
        }
      } catch (error) {
        console.error("Error polling payment status:", error);
        // Increase delay on error
        delayRef.current = Math.min(delayRef.current * 2, maxDelay);
      } finally {
        setIsPolling(false);
      }
    };

    const timeoutId = setTimeout(poll, delayRef.current);
    return () => clearTimeout(timeoutId);
  }, [invoiceNumber, enabled, lastStatus, initialDelay, maxDelay, onStatusChange]);

  return { isPolling, currentStatus: lastStatus };
};
