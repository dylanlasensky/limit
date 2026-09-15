import React, { useState } from "react";
import { Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { clearPrivateState } from "@/lib/storage";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
export default function AccountDeletion() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false),
    [deleting, setDeleting] = useState(false),
    [error, setError] = useState("");
  const remove = async () => {
    if (deleting) return;
    setDeleting(true);
    setError("");
    try {
      const { data } = await base44.functions.invoke("deleteAccount", { confirm: true });
      if (!data?.ok) throw new Error("Account deletion did not finish. Please retry.");
      clearPrivateState(user?.id);
      logout();
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message || "Account deletion failed.");
      setDeleting(false);
    }
  };
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-900/70 text-sm font-bold text-red-500"
      >
        <Trash2 className="h-4 w-4" />
        Delete account
      </button>
      <Drawer
        open={open}
        onOpenChange={(value) => {
          if (!deleting) setOpen(value);
        }}
        dismissible={!deleting}
      >
        <DrawerContent>
          <div className="mx-auto w-full max-w-md px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <DrawerHeader className="px-0">
              <DrawerTitle>Delete your LIMIT account?</DrawerTitle>
              <DrawerDescription>
                This permanently removes your logged exercises, workout history, weights, dietary
                metrics, meal data, and profile. This cannot be undone.
              </DrawerDescription>
            </DrawerHeader>
            <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
              Export anything you want to keep before continuing. Deleting the app alone does not
              delete your account. See the{" "}
              <a href="/privacy" className="underline">
                privacy information
              </a>{" "}
              for uploaded files and service retention.
            </p>
            {error && (
              <p
                role="alert"
                className="mb-3 rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
              >
                {error}
              </p>
            )}
            <button
              disabled={deleting}
              onClick={remove}
              className="h-12 w-full rounded-xl bg-red-600 font-bold text-white"
            >
              {deleting ? "Deleting account…" : "Permanently delete account"}
            </button>
            <button
              disabled={deleting}
              onClick={() => setOpen(false)}
              className="mt-2 h-12 w-full font-bold"
            >
              Keep my account
            </button>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
