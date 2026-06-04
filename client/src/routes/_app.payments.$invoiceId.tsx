import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Box, Snackbar, Alert } from "@mui/material";
import KHQRPaymentPage from "@/components/payment/KHQRPaymentPage";
import { useKHQRPayment } from "@/hooks/useKHQRPayment";
import { generateMockKHQRImage } from "@/lib/khqr-utils";

interface PaymentDetails {
  invoiceNumber: string;
  totalAmount: number;
  orderDetails?: {
    items: Array<{ name: string; quantity: number; price: number }>;
    subtotal: number;
    tax: number;
    total: number;
  };
}

export const Route = createFileRoute("/_app/payments/$invoiceId")({
  component: KHQRPaymentPageComplete,
});

function KHQRPaymentPageComplete() {
  const { invoiceId } = Route.useParams();

  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [khqrImageUrl, setKhqrImageUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "warning" | "info";
  }>({
    open: false,
    message: "",
    severity: "info",
  });

  // Initialize payment hook
  const {
    status,
    timeRemaining,
    isVerifying,
    error: paymentError,
    verifyPayment,
    cancelPayment,
  } = useKHQRPayment({
    invoiceNumber: invoiceId,
    totalAmount: paymentDetails?.totalAmount || 0,
    autoCheckInterval: 5000,
    timeoutSeconds: 15 * 60,
    onStatusChange: (newStatus) => {
      handleStatusChange(newStatus);
    },
    onError: (error) => {
      handlePaymentError(error);
    },
  });

  // Fetch payment details on mount
  useEffect(() => {
    fetchPaymentDetails();
  }, [invoiceId]);

  // Generate KHQR image when payment details are loaded
  useEffect(() => {
    if (paymentDetails && !khqrImageUrl) {
      generateKHQRCode();
    }
  }, [paymentDetails, khqrImageUrl]);

  // Handle payment errors
  useEffect(() => {
    if (paymentError) {
      showSnackbar(paymentError, "error");
    }
  }, [paymentError]);

  /**
   * Fetch payment details from backend
   */
  const fetchPaymentDetails = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/payments/details/${invoiceId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch payment details: ${response.statusText}`);
      }

      const data = await response.json();
      setPaymentDetails({
        invoiceNumber: data.invoiceNumber || invoiceId,
        totalAmount: data.totalAmount || data.amount || 0,
        orderDetails: data.orderDetails,
      });

      showSnackbar("Payment details loaded successfully", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch payment details";
      showSnackbar(message, "error");
      // Set default values so component still renders
      setPaymentDetails({
        invoiceNumber: invoiceId,
        totalAmount: 0,
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Generate KHQR QR code
   */
  const generateKHQRCode = async () => {
    try {
      if (!paymentDetails) return;

      // Generate KHQR image from backend
      const response = await fetch("/api/payments/generate-khqr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          invoiceNumber: paymentDetails.invoiceNumber,
          amount: paymentDetails.totalAmount,
          description: "POS Payment",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate KHQR code");
      }

      const data = await response.json();
      setKhqrImageUrl(data.qrCodeUrl || data.imageUrl);
    } catch (error) {
      console.error("Error generating KHQR code:", error);
      // Fallback to mock image
      const mockUrl = await generateMockKHQRImage({
        amount: paymentDetails?.totalAmount || 0,
        invoiceNumber: paymentDetails?.invoiceNumber || invoiceId,
      });
      setKhqrImageUrl(mockUrl);
    }
  };

  /**
   * Handle payment verification
   */
  const handleVerifyPayment = async (): Promise<void> => {
    try {
      const response = await fetch("/api/payments/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          invoiceNumber: paymentDetails?.invoiceNumber || invoiceId,
          totalAmount: paymentDetails?.totalAmount || 0,
        }),
      });

      if (!response.ok) {
        throw new Error("Payment verification failed");
      }

      const data = await response.json();

      if (data.success) {
        showSnackbar("Payment verified successfully!", "success");
        // Payment status will be updated via useKHQRPayment hook
      } else {
        throw new Error(data.message || "Payment verification failed");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Verification failed";
      throw new Error(message);
    }
  };

  /**
   * Handle payment cancellation
   */
  const handleCancel = () => {
    cancelPayment();
    showSnackbar("Payment cancelled", "warning");
    // Optionally redirect after delay
    setTimeout(() => {
      window.history.back();
    }, 2000);
  };

  /**
   * Handle payment status changes
   */
  const handleStatusChange = (newStatus: "PENDING" | "PAID" | "EXPIRED" | "CANCELLED") => {
    switch (newStatus) {
      case "PAID":
        showSnackbar("Payment completed successfully!", "success");
        // Update order status in database
        updateOrderStatus("PAID");
        // Redirect after delay
        setTimeout(() => {
          window.location.href = `/orders/${invoiceId}/confirmation`;
        }, 2000);
        break;

      case "EXPIRED":
        showSnackbar("Payment QR code has expired. Please create a new payment.", "warning");
        break;

      case "CANCELLED":
        showSnackbar("Payment transaction cancelled.", "info");
        break;

      case "PENDING":
        // No action needed
        break;
    }
  };

  /**
   * Handle payment errors
   */
  const handlePaymentError = (error: Error) => {
    console.error("Payment error:", error);
    showSnackbar(`Payment error: ${error.message}`, "error");
  };

  /**
   * Update order status in database
   */
  const updateOrderStatus = async (orderStatus: string) => {
    try {
      await fetch(`/api/orders/${invoiceId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          status: orderStatus,
          paidAt: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error("Error updating order status:", error);
    }
  };

  /**
   * Show snackbar notification
   */
  const showSnackbar = (message: string, severity: "success" | "error" | "warning" | "info") => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  /**
   * Close snackbar
   */
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  /**
   * Get authentication token
   */
  const getAuthToken = (): string => {
    // Get from your auth store or localStorage
    return localStorage.getItem("authToken") || "";
  };

  if (isLoading || !paymentDetails) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          backgroundColor: "#f5f5f5",
        }}
      >
        <div>Loading payment details...</div>
      </Box>
    );
  }

  return (
    <>
      <KHQRPaymentPage
        invoiceNumber={paymentDetails.invoiceNumber}
        totalAmount={paymentDetails.totalAmount}
        khqrImageUrl={khqrImageUrl}
        onVerifyPayment={handleVerifyPayment}
        onCancel={handleCancel}
        initialStatus="PENDING"
        onStatusChange={handleStatusChange}
        autoCheckPayment={true}
        autoCheckInterval={5000}
      />

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
