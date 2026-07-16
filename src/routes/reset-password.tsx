import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({ ssr: false, component: ResetPage });

function ResetPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setReady(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((e) => {
      if (e === "PASSWORD_RECOVERY" || e === "SIGNED_IN") setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Contraseña actualizada");
    navigate({ to: "/map" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--gradient-soft)" }}>
      <div className="w-full max-w-md bg-card rounded-2xl p-6" style={{ boxShadow: "var(--shadow-card)" }}>
        <h1 className="text-2xl font-bold mb-1">Nueva contraseña</h1>
        <p className="text-sm text-muted-foreground mb-4">
          {ready ? "Ingresa tu nueva contraseña." : "Abre este enlace desde el correo de recuperación."}
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pw">Nueva contraseña</Label>
            <Input id="pw" type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={busy || !ready}>
            {busy ? "Guardando..." : "Guardar contraseña"}
          </Button>
        </form>
      </div>
    </div>
  );
}
