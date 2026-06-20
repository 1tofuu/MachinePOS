import { paymentService } from "./services/paymentService.js";

let intervalId: NodeJS.Timeout | null = null;

export function startScheduler(intervalMs: number = 10000): void {
  if (intervalId) return;

  console.log(`⏱️ Background expiration scheduler started (interval: ${intervalMs}ms)`);
  
  // Run immediately on start
  paymentService.checkExpirations().catch((err) => {
    console.error("Error in immediate background expiration check:", err);
  });

  intervalId = setInterval(async () => {
    try {
      await paymentService.checkExpirations();
    } catch (err) {
      console.error("Error in background expiration scheduler:", err);
    }
  }, intervalMs);
}

export function stopScheduler(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("⏱️ Background expiration scheduler stopped");
  }
}
