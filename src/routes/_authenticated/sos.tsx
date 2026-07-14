import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { AlertTriangle, MapPin, Shield } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useLocationTracker } from "@/hooks/use-location-tracker";

export const Route = createFileRoute("/_authenticated/sos")({
  component: SosPage,
});

function SosPage() {
  const { user } = useAuth();
  const { coords } = useLocationTracker();
  const [sending, setSending] = useState(false);

  const trigger = async () => {
    if (!user) return;
    setSending(true);
    const { error } = await supabase.from("sos_alerts").insert({
      user_id: user.id,
      latitude: coords?.latitude,
      longitude: coords?.longitude,
      message: "Alerta SOS de emergencia",
    });
    setSending(false);
    if (error) return toast.error(error.message);
    toast.success("Alerta SOS enviada a tus contactos");
  };

  return (
    <div className="min-h-[100dvh] pb-24" style={{ background: "var(--gradient-soft)" }}>
      <header className="px-4 pt-6 pb-4 max-w-md mx-auto">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-destructive" /> SOS
        </h1>
        <p className="text-sm text-muted-foreground">Envía una alerta inmediata a todos tus contactos</p>
      </header>

      <div className="max-w-md mx-auto px-4 space-y-4">
        <div className="p-4 rounded-2xl bg-card border border-border text-sm space-y-2">
          <div className="flex items-center gap-2 text-primary font-semibold">
            <MapPin className="w-4 h-4" /> Tu ubicación actual
          </div>
          <div className="text-muted-foreground">
            {coords ? `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}` : "Obteniendo ubicación GPS..."}
          </div>
        </div>

        <button
          onClick={trigger}
          disabled={sending}
          className="w-full aspect-square max-w-xs mx-auto rounded-full flex flex-col items-center justify-center text-white font-bold gap-3 active:scale-95 transition-transform disabled:opacity-60"
          style={{
            background: "oklch(0.6 0.24 25)",
            boxShadow: "0 0 0 12px oklch(0.6 0.24 25 / 0.15), 0 20px 60px -20px oklch(0.6 0.24 25 / 0.6)",
          }}
        >
          <AlertTriangle className="w-16 h-16" />
          <span className="text-2xl">{sending ? "Enviando..." : "PEDIR AYUDA"}</span>
          <span className="text-xs opacity-80">Mantén pulsado para confirmar</span>
        </button>

        <div className="p-3 rounded-2xl bg-primary/5 border border-primary/20 flex items-start gap-2 text-xs">
          <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div>
            Al presionar, tus contactos aceptados y el administrador recibirán una notificación con tu nombre y ubicación actual.
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}