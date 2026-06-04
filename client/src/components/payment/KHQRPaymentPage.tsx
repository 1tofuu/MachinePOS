import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Button,
  Grid,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Divider,
  Stack,
} from "@mui/material";
import { CheckCircle, Error, Schedule, Cancel, QrCode2 } from "@mui/icons-material";

type PaymentStatus = "PENDING" | "PAID" | "EXPIRED" | "CANCELLED";

interface KHQRPaymentPageProps {
  invoiceNumber: string;
  totalAmount: number;
  khqrImageUrl?: string;
  onVerifyPayment: () => Promise<void>;
  onCancel: () => void;
  initialStatus?: PaymentStatus;
  onStatusChange?: (status: PaymentStatus) => void;
  autoCheckPayment?: boolean;
  autoCheckInterval?: number;
}

const KHQRPaymentPage: React.FC<KHQRPaymentPageProps> = ({
  invoiceNumber,
  totalAmount,
  khqrImageUrl,
  onVerifyPayment,
  onCancel,
  initialStatus = "PENDING",
  onStatusChange,
  autoCheckPayment = true,
  autoCheckInterval = 5000,
}) => {
  const [status, setStatus] = useState<PaymentStatus>(initialStatus);
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes in seconds
  const [isVerifying, setIsVerifying] = useState(false);
  const [openCancelDialog, setOpenCancelDialog] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Countdown timer effect
  useEffect(() => {
    if (status === "PAID" || status === "CANCELLED") return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setStatus("EXPIRED");
          onStatusChange?.("EXPIRED");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status, onStatusChange]);

  // Auto-check payment status
  useEffect(() => {
    if (!autoCheckPayment || status !== "PENDING") return;

    const checkInterval = setInterval(async () => {
      try {
        // This would call your payment verification API
        // For now, this is a placeholder that can be implemented
      } catch (error) {
        console.error("Error checking payment status:", error);
      }
    }, autoCheckInterval);

    return () => clearInterval(checkInterval);
  }, [autoCheckPayment, status, autoCheckInterval]);

  const handleVerifyPayment = useCallback(async () => {
    setIsVerifying(true);
    setVerifyError(null);

    try {
      await onVerifyPayment();
      setStatus("PAID");
      onStatusChange?.("PAID");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to verify payment";
      setVerifyError(errorMessage);
      console.error("Payment verification error:", error);
    } finally {
      setIsVerifying(false);
    }
  }, [onVerifyPayment, onStatusChange]);

  const handleCancelClick = () => {
    setOpenCancelDialog(true);
  };

  const handleCancelConfirm = () => {
    setOpenCancelDialog(false);
    setStatus("CANCELLED");
    onStatusChange?.("CANCELLED");
    onCancel();
  };

  const handleCancelClose = () => {
    setOpenCancelDialog(false);
  };

  // Format time display
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  // Get status color and icon
  const getStatusConfig = (paymentStatus: PaymentStatus) => {
    switch (paymentStatus) {
      case "PAID":
        return {
          color: "success" as const,
          icon: <CheckCircle />,
          label: "Payment Successful",
        };
      case "EXPIRED":
        return {
          color: "error" as const,
          icon: <Schedule />,
          label: "Payment Expired",
        };
      case "CANCELLED":
        return {
          color: "warning" as const,
          icon: <Cancel />,
          label: "Payment Cancelled",
        };
      case "PENDING":
      default:
        return {
          color: "info" as const,
          icon: <QrCode2 />,
          label: "Awaiting Payment",
        };
    }
  };

  const statusConfig = getStatusConfig(status);

  // Timer color based on time remaining
  const getTimerColor = () => {
    if (timeLeft < 60) return "#d32f2f"; // Red
    if (timeLeft < 300) return "#f57c00"; // Orange
    return "#1976d2"; // Blue
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        backgroundColor: "#f5f5f5",
        padding: 2,
      }}
    >
      <Card
        sx={{
          maxWidth: 500,
          width: "100%",
          boxShadow: 3,
        }}
      >
        {/* Header */}
        <CardHeader
          title="KHQR Payment"
          subheader="Scan QR code to complete payment"
          titleTypographyProps={{ align: "center", variant: "h5" }}
          subheaderTypographyProps={{ align: "center" }}
          sx={{ pb: 2 }}
        />

        <Divider />

        <CardContent>
          <Stack spacing={3}>
            {/* Status Chip */}
            <Box sx={{ display: "flex", justifyContent: "center" }}>
              <Chip
                icon={statusConfig.icon}
                label={statusConfig.label}
                color={statusConfig.color}
                size="medium"
                sx={{ minWidth: 200 }}
              />
            </Box>

            {/* Invoice Number */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "#f9f9f9",
                padding: 2,
                borderRadius: 1,
              }}
            >
              <Typography variant="body2" color="textSecondary">
                Invoice Number:
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600, fontFamily: "monospace" }}>
                {invoiceNumber}
              </Typography>
            </Box>

            {/* Total Amount */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "#f9f9f9",
                padding: 2,
                borderRadius: 1,
              }}
            >
              <Typography variant="body2" color="textSecondary">
                Total Amount:
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  color: "#1976d2",
                }}
              >
                ${totalAmount.toFixed(2)}
              </Typography>
            </Box>

            {/* KHQR QR Code */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "#f0f0f0",
                borderRadius: 2,
                padding: 3,
                minHeight: 300,
              }}
            >
              {khqrImageUrl ? (
                <Box
                  component="img"
                  src={khqrImageUrl}
                  alt="KHQR Code"
                  sx={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    borderRadius: 1,
                  }}
                />
              ) : (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                  }}
                >
                  <QrCode2 sx={{ fontSize: 60, color: "#ccc" }} />
                  <Typography color="textSecondary">KHQR Code will appear here</Typography>
                </Box>
              )}
            </Box>

            {/* Countdown Timer */}
            {status === "PENDING" && (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <Typography variant="body2" color="textSecondary">
                  Time Remaining:
                </Typography>
                <Box
                  sx={{
                    position: "relative",
                    display: "inline-flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <CircularProgress
                    variant="determinate"
                    value={(timeLeft / (15 * 60)) * 100}
                    size={80}
                    sx={{
                      color: getTimerColor(),
                    }}
                  />
                  <Box
                    sx={{
                      position: "absolute",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: 700,
                        color: getTimerColor(),
                        fontFamily: "monospace",
                      }}
                    >
                      {formatTime(timeLeft)}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            )}

            {/* Status Messages */}
            {status === "PAID" && (
              <Alert severity="success">
                Payment received successfully! Thank you for your transaction.
              </Alert>
            )}

            {status === "EXPIRED" && (
              <Alert severity="error">
                Payment QR code has expired. Please start a new transaction.
              </Alert>
            )}

            {status === "CANCELLED" && (
              <Alert severity="warning">This transaction has been cancelled.</Alert>
            )}

            {/* Error Alert */}
            {verifyError && <Alert severity="error">{verifyError}</Alert>}

            {/* Action Buttons */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  onClick={handleVerifyPayment}
                  disabled={status !== "PENDING" || isVerifying}
                  sx={{
                    py: 1.5,
                    fontWeight: 600,
                  }}
                >
                  {isVerifying ? (
                    <>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      Verifying...
                    </>
                  ) : (
                    "Verify Payment"
                  )}
                </Button>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Button
                  fullWidth
                  variant="outlined"
                  color="error"
                  onClick={handleCancelClick}
                  disabled={status !== "PENDING"}
                  sx={{
                    py: 1.5,
                    fontWeight: 600,
                  }}
                >
                  Cancel
                </Button>
              </Grid>
            </Grid>

            {/* Additional Info */}
            {status === "PAID" && (
              <Typography variant="caption" color="textSecondary" sx={{ textAlign: "center" }}>
                A receipt has been sent to your email. Your transaction ID is {invoiceNumber}
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={openCancelDialog} onClose={handleCancelClose}>
        <DialogTitle>Cancel Payment</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to cancel this payment? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelClose} color="primary">
            No, Keep It
          </Button>
          <Button onClick={handleCancelConfirm} color="error" variant="contained">
            Yes, Cancel Payment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default KHQRPaymentPage;
