import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Boxes, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuthStore } from "@/stores/auth";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "At least 6 characters"),
});
type FormValues = z.infer<typeof schema>;

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — InventoryPro" },
      { name: "description", content: "Sign in to your InventoryPro dashboard." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const signIn = useAuthStore((s) => s.signIn);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "panbunheng58@gmail.com", password: "112233" },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await signIn(values.email, values.password);
      toast.success("Welcome back, Pan Bunheng");
      navigate({ to: "/" });
    } catch (e: any) {
      toast.error(e.message || "Invalid email or password");
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left: form */}
      <div className="flex items-center justify-center bg-background px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="mb-8 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-semibold">InventoryPro</div>
              <div className="text-xs text-muted-foreground">Enterprise Hub</div>
            </div>
          </div>

          <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to manage your store, orders, and inventory.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className="pl-10"
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button type="button" className="text-xs text-primary hover:underline">
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="pl-10 pr-10"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox defaultChecked /> Keep me signed in
            </label>

            <Button type="submit" className="h-11 w-full text-base" disabled={isSubmitting}>
              {isSubmitting ? "Signing in…" : "Sign in"}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Demo account is pre-filled. This frontend uses mock auth.
            </p>
          </form>
        </motion.div>
      </div>

      {/* Right: brand panel */}
      <div className="relative hidden overflow-hidden lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-sidebar to-[oklch(0.3_0.06_180)]" />
        <div className="absolute inset-0 opacity-30 [background:radial-gradient(circle_at_30%_20%,oklch(0.75_0.17_160)_0%,transparent_45%)]" />
        <div className="relative flex h-full flex-col justify-between p-12 text-sidebar-foreground">
          <div className="flex items-center gap-2">
            <Boxes className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold">InventoryPro</span>
          </div>
          <div>
            <h2 className="text-4xl font-semibold leading-tight">
              Run your store with the calm of a great dashboard.
            </h2>
            <p className="mt-4 max-w-md text-sm text-sidebar-foreground/70">
              POS, inventory, kitchen, customers, and reporting — built with the care of Stripe,
              the focus of Linear, and the polish of Shopify Admin.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-6 text-sm">
              {[
                { k: "12k+", v: "Daily orders" },
                { k: "99.99%", v: "Uptime" },
                { k: "<200ms", v: "POS latency" },
              ].map((s) => (
                <div key={s.v}>
                  <div className="text-2xl font-semibold text-primary">{s.k}</div>
                  <div className="text-xs text-sidebar-foreground/60">{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
