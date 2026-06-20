import { paymentService } from "./services/paymentService.js";
let intervalId = null;
export function startScheduler(intervalMs = 10000) {
    if (intervalId)
        return;
    console.log(`⏱️ Background expiration scheduler started (interval: ${intervalMs}ms)`);
    // Run immediately on start
    paymentService.checkExpirations().catch((err) => {
        console.error("Error in immediate background expiration check:", err);
    });
    intervalId = setInterval(async () => {
        try {
            await paymentService.checkExpirations();
        }
        catch (err) {
            console.error("Error in background expiration scheduler:", err);
        }
    }, intervalMs);
}
export function stopScheduler() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        console.log("⏱️ Background expiration scheduler stopped");
    }
}
