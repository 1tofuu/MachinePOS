import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Activity, Clock, Edit2, KeyRound, Plus, Trash2, Mail, User } from "lucide-react";
import { io } from "socket.io-client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TableSkeleton } from "@/components/shared/Skeletons";
import { StatusPill } from "@/components/shared/StatusPill";
import { api } from "@/services/api/client";
import { queryKeys } from "@/services/api/queryKeys";
import { formatDate } from "@/lib/format";
import type { StaffStatus, StaffMember } from "@/services/api/types";
import { useTranslation } from "@/lib/i18n";
import { useSettingsStore } from "@/stores/settings";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_app/staff")({
  beforeLoad: () => {
    const { userRole } = useSettingsStore.getState();
    if (userRole === "cashier") {
      throw redirect({ to: "/pos" });
    }
  },
  head: () => ({ meta: [{ title: "Staff — InventoryPro" }] }),
  component: StaffPage,
});

const STATUS_VARIANT: Record<StaffStatus, "success" | "warning" | "muted"> = {
  active: "success",
  on_break: "warning",
  offline: "muted",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GMAIL_REGEX = /^[^\s@]+@gmail\.com$/;
const SOCKET_URL = "http://localhost:5001";

function StaffPage() {
  const queryClient = useQueryClient();
  const { t, language } = useTranslation();
  const { userRole } = useSettingsStore();
  const { data, isLoading } = useQuery({ queryKey: queryKeys.staff, queryFn: api.listStaff });
  const { data: loginHistory, isLoading: loadingHistory } = useQuery({
    queryKey: queryKeys.staffLoginHistory,
    queryFn: api.listStaffLoginHistory,
    enabled: userRole === "admin",
  });
  const [liveStaff, setLiveStaff] = useState<StaffMember[] | null>(null);

  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  // Form fields
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<"admin" | "manager" | "cashier">("cashier");
  const [formStatus, setFormStatus] = useState<StaffStatus>("offline");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (userRole !== "admin") return;

    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
    });

    socket.on("staff:status:list", (staff: StaffMember[]) => {
      setLiveStaff(staff);
      queryClient.invalidateQueries({ queryKey: queryKeys.staffLoginHistory });
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient, userRole]);

  const handleOpenAdd = () => {
    if (userRole !== "admin") {
      toast.error("Only Admins can register new staff members");
      return;
    }
    setEditingStaff(null);
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setFormRole("cashier");
    setFormStatus("offline");
    setIsFormOpen(true);
  };

  const handleOpenEdit = (member: StaffMember) => {
    if (userRole !== "admin") {
      toast.error("Only Admins can edit staff details");
      return;
    }
    setEditingStaff(member);
    setFormName(member.name);
    setFormEmail(member.email);
    setFormPassword("");
    setFormRole(member.role);
    setFormStatus(member.status);
    setIsFormOpen(true);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim() || !formEmail.trim() || (!editingStaff && !formPassword.trim())) {
      toast.error("Please fill out all required fields");
      return;
    }

    if (formName.trim().length < 2 || formName.trim().length > 15) {
      toast.error("Username must be 2-15 characters.");
      return;
    }

    if (!EMAIL_REGEX.test(formEmail.trim())) {
      toast.error("Invalid email format. Please enter a valid email address.");
      return;
    }

    if (!GMAIL_REGEX.test(formEmail.trim())) {
      toast.error("Staff email must end with @gmail.com.");
      return;
    }

    if (!editingStaff && formPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingStaff) {
        await api.updateStaff({
          ...editingStaff,
          name: formName.trim(),
          email: formEmail.trim(),
          role: formRole,
          status: formStatus,
        });
        toast.success(`Staff member "${formName}" updated successfully!`);
      } else {
        await api.createStaff({
          name: formName.trim(),
          email: formEmail.trim(),
          password: formPassword,
          role: formRole,
        });
        toast.success(`New staff member "${formName}" added successfully!`);
      }
      setIsFormOpen(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.staff });
    } catch (err) {
      toast.error("An error occurred while saving the staff member.");
    } finally {
      setIsSubmitting(false);
    }
  };
  const rows = liveStaff ?? data ?? [];

  const handleDeleteStaff = (id: string, name: string) => {
    if (userRole !== "admin") {
      toast.error("Only Admins can remove staff members");
      return;
    }
    toast.promise(api.deleteStaff(id), {
      loading: "Removing staff member...",
      success: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.staff });
        return `${name} has been removed from staff.`;
      },
      error: "Failed to remove staff member",
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("nav.staff")}
        description={language === "km" ? "គ្រប់គ្រងក្រុមការងារ តួនាទី និងការអនុញ្ញាតសិទ្ធិចូលប្រើប្រាស់។" : "Create staff logins and monitor live POS access."}
        actions={
          userRole === "admin" && (
            <Button onClick={handleOpenAdd}>
              <Plus className="mr-2 h-4 w-4" /> Add Staff
            </Button>
          )
        }
      />

      <Card className="overflow-hidden shadow-sm border">
        {isLoading ? (
          <div className="p-4"><TableSkeleton /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Hired</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border">
                          <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                            {s.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-foreground">{s.name}</div>
                          <div className="text-xs text-muted-foreground">{s.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize text-foreground font-medium">{s.role}</td>
                    <td className="px-4 py-3">
                      <StatusPill variant={STATUS_VARIANT[s.status]} className="capitalize font-semibold text-xs">
                        {s.status === "active" ? "online" : s.status.replace("_", " ")}
                      </StatusPill>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-medium">{formatDate(s.hireDate)}</td>
                    <td className="px-4 py-3 text-right">
                      {userRole === "admin" ? (
                        <div className="flex justify-end gap-1">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => handleOpenEdit(s)}
                            aria-label="Edit"
                          >
                            <Edit2 className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteStaff(s.id, s.name)}
                            aria-label="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic px-2">No actions</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ==================== CREATE / EDIT STAFF DIALOG ==================== */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md sm:rounded-2xl border-2 shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="bg-primary p-5 text-primary-foreground">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <User className="h-5 w-5" />
              {editingStaff ? "Edit Staff Details" : "Add New Staff Member"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveStaff} className="p-6 space-y-4">
            <div className="space-y-4">
              {/* Staff Name */}
              <div className="space-y-1.5">
                <Label htmlFor="staff-name" className="font-semibold text-xs">
                  Full Name *
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="staff-name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. John Doe"
                    minLength={2}
                    maxLength={15}
                    className="pl-9"
                    required
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">2-15 characters. This is the staff username.</p>
              </div>

              {/* Staff Email */}
              <div className="space-y-1.5">
                <Label htmlFor="staff-email" className="font-semibold text-xs">
                  Email Address *
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="staff-email"
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="e.g. cashier@gmail.com"
                    className="pl-9"
                    required
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">Only Gmail accounts are allowed.</p>
              </div>

              {!editingStaff && (
                <div className="space-y-1.5">
                  <Label htmlFor="staff-password" className="font-semibold text-xs">
                    Password *
                  </Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="staff-password"
                      type="password"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="pl-9"
                      minLength={6}
                      required
                    />
                  </div>
                </div>
              )}

              {/* Role select */}
              <div className="space-y-1.5">
                <Label className="font-semibold text-xs">Role *</Label>
                <Select 
                  value={formRole} 
                  onValueChange={(val: any) => setFormRole(val)}
                >
                  <SelectTrigger id="staff-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="cashier">Cashier</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editingStaff && (
                <div className="space-y-1.5">
                  <Label className="font-semibold text-xs">Status *</Label>
                  <Select 
                    value={formStatus} 
                    onValueChange={(val: any) => setFormStatus(val)}
                  >
                    <SelectTrigger id="staff-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Online</SelectItem>
                      <SelectItem value="on_break">On Break</SelectItem>
                      <SelectItem value="offline">Offline</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <DialogFooter className="pt-4 border-t gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6"
              >
                {isSubmitting ? "Saving..." : "Save Details"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {userRole === "admin" && (
        <Card className="overflow-hidden border shadow-sm">
          <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-3">
            <Activity className="h-4 w-4 text-primary" />
            <div className="font-semibold">Staff Login Monitoring</div>
          </div>
          {loadingHistory ? (
            <div className="p-4"><TableSkeleton /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                  <tr>
                    <th className="px-4 py-3 text-left">Staff</th>
                    <th className="px-4 py-3 text-left">Role</th>
                    <th className="px-4 py-3 text-left">Login Time</th>
                    <th className="px-4 py-3 text-left">Logout Time</th>
                    <th className="px-4 py-3 text-left">Session</th>
                  </tr>
                </thead>
                <tbody>
                  {(loginHistory ?? []).slice(0, 20).map((entry) => (
                    <tr key={entry.id} className="border-t border-border">
                      <td className="px-4 py-3">
                        <div className="font-semibold">{entry.name ?? "Deleted staff"}</div>
                        <div className="text-xs text-muted-foreground">{entry.email}</div>
                      </td>
                      <td className="px-4 py-3 capitalize">{entry.role ?? "-"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(entry.loginTime).toLocaleString()}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {entry.logoutTime ? new Date(entry.logoutTime).toLocaleString() : "Still online"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill variant={entry.status === "online" ? "success" : "muted"} className="capitalize font-semibold text-xs">
                          <Clock className="mr-1 h-3 w-3" />
                          {entry.status}
                        </StatusPill>
                      </td>
                    </tr>
                  ))}
                  {(loginHistory ?? []).length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                        No staff login activity yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
