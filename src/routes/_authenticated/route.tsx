import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Shield,
  MapPin,
  Camera,
  Wifi,
  WifiOff,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

type PermState = "idle" | "checking" | "granted" | "denied";

function AuthenticatedLayout() {
  const [permsGranted, setPermsGranted] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("safetrack-perms") === "1";
  });

  if (!permsGranted) {
    return <PermissionsGate onGranted={() => setPermsGranted(true)} />;
  }

  return (
    <>
      <SosNotifier />
      <Outlet />
    </>
  );
}

function SosNotifier() {
  useEffect(() => {
    const ch = supabase
      .channel("sos-notify")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "sos_alerts" },
        async (payload) => {
          const row = payload.new as { user_id: string };
          const { data: me } = await supabase.auth.getUser();
          if (!me.user || me.user.id === row.user_id) return;
          const { data: p } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", row.user_id)
            .maybeSingle();
          const name = p?.full_name ?? "Un contacto";
          const msg = `Alerta: ${name} necesita ayuda`;
          toast.error(msg);
          if (
            typeof window !== "undefined" &&
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            new Notification("VoyContigo SOS", { body: msg });
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);
  return null;
}

function PermissionsGate({ onGranted }: { onGranted: () => void }) {
  const [loc, setLoc] = useState<PermState>("idle");
  const [cam, setCam] = useState<PermState>("idle");
  const [notif, setNotif] = useState<PermState>(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return "denied";
    return Notification.permission === "granted"
      ? "granted"
      : Notification.permission === "denied"
        ? "denied"
        : "idle";
  });
  const [net, setNet] = useState<PermState>(
    typeof navigator !== "undefined" && navigator.onLine ? "granted" : "denied",
  );

  useEffect(() => {
    const on = () => setNet("granted");
    const off = () => setNet("denied");
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const askLocation = () => {
    if (!("geolocation" in navigator)) return setLoc("denied");
    setLoc("checking");
    navigator.geolocation.getCurrentPosition(
      () => setLoc("granted"),
      () => setLoc("denied"),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const askCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) return setCam("denied");
    setCam("checking");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((t) => t.stop());
      setCam("granted");
    } catch {
      setCam("denied");
    }
  };

  const askNotif = async () => {
    if (!("Notification" in window)) return setNotif("denied");
    setNotif("checking");
    try {
      const r = await Notification.requestPermission();
      setNotif(r === "granted" ? "granted" : "denied");
    } catch {
      setNotif("denied");
    }
  };

  const retryNet = () => {
    setNet(navigator.onLine ? "granted" : "denied");
    if (!navigator.onLine) {
      toast.error("Sin internet. Activa los datos móviles o reinicia la señal Wi-Fi.");
    }
  };

  // Cámara es OPCIONAL: se pide permiso pero no bloquea el ingreso.
  const allGranted =
    loc === "granted" && net === "granted" && notif === "granted";
  const anyDenied =
    loc === "denied" || net === "denied" || notif === "denied";

  const handleEnter = () => {
    localStorage.setItem("safetrack-perms", "1");
    onGranted();
  };

  return (
    <div
      className="min-h-[100dvh] w-full flex items-center justify-center px-4 py-8"
      style={{ background: "var(--gradient-soft)" }}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-card border border-border p-6 space-y-5"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: "var(--gradient-brand)" }}
          >
            <Shield className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">Permisos necesarios</h1>
            <p className="text-xs text-muted-foreground">
              VoyContigo necesita los siguientes accesos para protegerte.
            </p>
          </div>
        </div>

        <PermRow
          icon={<MapPin className="w-5 h-5" />}
          title="Ubicación GPS"
          desc="Para compartir tu posición con tus contactos de confianza."
          state={loc}
          onAction={askLocation}
          actionLabel="Permitir ubicación"
        />
        <PermRow
          icon={<Camera className="w-5 h-5" />}
          title="Cámara (opcional)"
          desc="Solo se usa para fotos de evidencia y reseñas. Puedes entrar sin aceptarla."
          state={cam}
          onAction={askCamera}
          actionLabel="Permitir cámara"
        />
        <PermRow
          icon={<Shield className="w-5 h-5" />}
          title="Notificaciones"
          desc="Para avisarte al instante cuando un contacto envía una alerta SOS."
          state={notif}
          onAction={askNotif}
          actionLabel="Permitir notificaciones"
        />
        <PermRow
          icon={net === "granted" ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
          title="Conexión a internet"
          desc={
            net === "granted"
              ? "Conectado correctamente."
              : "Sin internet. Activa tus datos móviles o reinicia la señal Wi-Fi."
          }
          state={net}
          onAction={retryNet}
          actionLabel="Reintentar conexión"
          customIcon
        />

        {anyDenied && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-3 text-xs text-destructive flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold">Permisos necesarios</div>
              Sin estos accesos no podrás usar VoyContigo. Acéptalos desde la
              configuración del dispositivo y vuelve a intentarlo.
            </div>
          </div>
        )}

        <Button
          className="w-full h-11 text-base gap-2"
          disabled={!allGranted}
          onClick={handleEnter}
        >
          {allGranted ? (
            <>
              <CheckCircle2 className="w-5 h-5" /> Entrar a VoyContigo
            </>
          ) : (
            "Conceda los permisos necesarios"
          )}
        </Button>
      </div>
    </div>
  );
}

function PermRow({
  icon,
  title,
  desc,
  state,
  onAction,
  actionLabel,
  customIcon,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  state: PermState;
  onAction: () => void;
  actionLabel: string;
  customIcon?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border p-3 flex items-start gap-3">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          state === "granted"
            ? "bg-primary/10 text-primary"
            : state === "denied"
              ? "bg-destructive/10 text-destructive"
              : "bg-muted text-muted-foreground"
        }`}
      >
        {customIcon ? icon : icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="font-semibold text-sm">{title}</div>
          {state === "granted" && (
            <CheckCircle2 className="w-4 h-4 text-primary" />
          )}
          {state === "denied" && (
            <AlertTriangle className="w-4 h-4 text-destructive" />
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
        {state !== "granted" && (
          <Button
            size="sm"
            variant={state === "denied" ? "destructive" : "outline"}
            className="mt-2 gap-1 h-8"
            onClick={onAction}
          >
            {state === "checking" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : state === "denied" ? (
              <RefreshCw className="w-3.5 h-3.5" />
            ) : null}
            {state === "denied" ? "Reintentar" : actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
