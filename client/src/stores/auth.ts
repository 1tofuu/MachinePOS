import { create } from "zustand";
import { persist } from "zustand/middleware";
import { API_URL } from "@/config/env";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "cashier";
}

interface AuthState {
  user: User | null;
  token: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      signIn: async (email, password) => {
        const response = await fetch(`${API_URL}/api/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
          let errMsg = "Invalid email or password";
          try {
            const errData = await response.json();
            errMsg = errData.message || errMsg;
          } catch {}
          throw new Error(errMsg);
        }

        const data = await response.json();
        
        set({
          user: data.user,
          token: data.token,
        });

        // Sync settings store userRole!
        try {
          const { useSettingsStore } = await import("./settings");
          useSettingsStore.getState().setUserRole(data.user.role);
        } catch (e) {
          console.error("Failed to sync user role", e);
        }
      },
      signOut: () => {
        const token = useAuthStore.getState().token;
        if (token) {
          fetch(`${API_URL}/api/auth/logout`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }).catch(() => {});
        }

        set({ user: null, token: null });
        
        // Reset role in settings store to a safe default
        try {
          import("./settings").then(({ useSettingsStore }) => {
            useSettingsStore.getState().setUserRole("cashier");
          });
        } catch {}
      },
    }),
    { name: "ip-auth" },
  ),
);
