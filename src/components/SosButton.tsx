import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function SosButton({ coords }: { coords: { latitude: number; longitude: number } | null }) {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);

  const trigger = async () => {
    if (!user) return;
    setSending(true);
    const { error } = await supabase.from("sos_alerts").insert({
      user_id: user.id,
      latitude: coords?.latitude,
      longitude: coords?.longitude,
      message: "Alerta de emergencia activada",
    });
    setSending(false);
    if (error) return toast.error(error.message);
    toast.success("Alerta SOS enviada");
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          aria-label="Botón SOS de emergencia"
          className="fixed z-40 right-4 bottom-24 w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-lg active:scale-95 transition-transform"
          style={{
            background: "oklch(0.6 0.24 25)",
            boxShadow: "0 0 0 8px oklch(0.6 0.24 25 / 0.2), 0 10px 30px -10px oklch(0.6 0.24 25 / 0.6)",
          }}
        >
          <AlertTriangle className="w-7 h-7" />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Enviar alerta SOS?</AlertDialogTitle>
          <AlertDialogDescription>
            Se notificará a tus contactos y administradores con tu ubicación actual.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={trigger} disabled={sending}>
            {sending ? "Enviando..." : "Enviar SOS"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}