import { createFileRoute, Outlet, redirect, useRouter } from "@tanstack/react-router";
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
  Bell,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import logo from "@/assets/voycontigo-logo.png.asset.json";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Nunca lanzar errores crudos aquí: cualquier fallo de red o de token
    // haría aparecer la pantalla de "esta página no cargó".
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) return { user: data.session.user };
    } catch {
      /* ignorar y reintentar con getUser */
    }
    try {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data.user) return { user: data.user };
    } catch {
      /* sin sesión válida */
    }
    throw redirect({ to: "/auth" });
  },
  component: AuthenticatedLayout,
});


type PermState = "idle" | "checking" | "granted" | "denied" | "postponed";

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
  const router = useRouter();
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
          const openMap = () => router.navigate({ to: "/map" });
          toast.error(msg, {
            description: "Emergencia activa. Abre el mapa para ver su ubicación.",
            duration: 15000,
            action: { label: "Ver mapa", onClick: openMap },
          });
          if (
            typeof window !== "undefined" &&
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            const n = new Notification("VoyContigo SOS", {
              body: `${msg}. Toca para ver su ubicación en el mapa.`,
              tag: `sos-${row.user_id}`,
            });
            n.onclick = () => {
              window.focus();
              openMap();
              n.close();
            };
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [router]);
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
      toast.success("Cámara permitida");
    } catch {
      setCam("denied");
      toast.error("Cámara denegada (opcional)");
    }
  };

  const askNotif = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotif("denied");
      toast.error("Este dispositivo no soporta notificaciones");
      return;
    }
    setNotif("checking");
    try {
      const r = await Notification.requestPermission();
      if (r === "granted") {
        setNotif("granted");
        toast.success("Notificaciones activadas");
        try {
          new Notification("VoyContigo", { body: "Notificaciones activadas correctamente" });
        } catch {}
      } else {
        setNotif("denied");
        toast.error("Notificaciones denegadas (opcional)");
      }
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

  // Solo GPS e Internet son obligatorios. Cámara y notificaciones son opcionales
  // y se pueden posponer para entrar directamente al aplicativo.
  const requiredReady = loc === "granted" && net === "granted";
  const camReady = cam === "granted" || cam === "postponed" || cam === "denied";
  const notifReady = notif === "granted" || notif === "postponed" || notif === "denied";
  const canEnter = requiredReady && camReady && notifReady;
  const requiredMissing = loc !== "granted" || net !== "granted";

  const handleEnter = () => {
    if (!requiredReady) {
      toast.error("GPS e internet son obligatorios para usar VoyContigo");
      return;
    }
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
          <img src={logo.url} alt="VoyContigo" className="w-14 h-14 object-contain" />
          <div>
            <h1 className="text-lg font-bold leading-tight">Permisos de VoyContigo</h1>
            <p className="text-xs text-muted-foreground">
              Solo GPS e internet son obligatorios. Los demás son opcionales.
            </p>
          </div>
        </div>

        <PermRow
          icon={<MapPin className="w-5 h-5" />}
          title="Ubicación GPS (obligatorio)"
          desc="Necesario para compartir tu posición con tus contactos de confianza."
          state={loc}
          onAction={askLocation}
          actionLabel="Permitir ubicación"
          required
        />
        <PermRow
          icon={<Camera className="w-5 h-5" />}
          title="Cámara (opcional)"
          desc="Para fotos de evidencia y reseñas. Puedes posponerlo y entrar igual."
          state={cam}
          onAction={askCamera}
          actionLabel="Permitir cámara"
          onPostpone={() => setCam("postponed")}
        />
        <PermRow
          icon={<Bell className="w-5 h-5" />}
          title="Notificaciones (opcional)"
          desc="Para avisarte al instante cuando un contacto envía una alerta SOS."
          state={notif}
          onAction={askNotif}
          actionLabel="Permitir notificaciones"
          onPostpone={() => setNotif("postponed")}
        />
        <PermRow
          icon={net === "granted" ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
          title="Conexión a internet (obligatorio)"
          desc={
            net === "granted"
              ? "Conectado correctamente."
              : "Sin internet. Activa tus datos móviles o reinicia la señal Wi-Fi."
          }
          state={net}
          onAction={retryNet}
          actionLabel="Reintentar conexión"
          customIcon
          required
        />

        {requiredMissing && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-3 text-xs text-destructive flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold">Faltan permisos obligatorios</div>
              GPS e internet son necesarios para rastrear ubicación. Actívalos
              desde la configuración del dispositivo.
            </div>
          </div>
        )}

        <Button
          className="w-full h-11 text-base gap-2"
          disabled={!canEnter}
          onClick={handleEnter}
        >
          {canEnter ? (
            <>
              <CheckCircle2 className="w-5 h-5" /> Entrar a VoyContigo
            </>
          ) : (
            "Acepta o pospón los permisos"
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
  onPostpone,
  required,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  state: PermState;
  onAction: () => void;
  actionLabel: string;
  customIcon?: boolean;
  onPostpone?: () => void;
  required?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border p-3 flex items-start gap-3">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          state === "granted"
            ? "bg-primary/10 text-primary"
            : state === "postponed"
              ? "bg-muted text-muted-foreground"
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
          {state === "postponed" && (
            <Clock className="w-4 h-4 text-muted-foreground" />
          )}
          {state === "denied" && (
            <AlertTriangle className="w-4 h-4 text-destructive" />
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
        {state !== "granted" && state !== "postponed" && (
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={state === "denied" ? "destructive" : "default"}
              className="gap-1 h-8"
              onClick={onAction}
            >
              {state === "checking" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : state === "denied" ? (
                <RefreshCw className="w-3.5 h-3.5" />
              ) : null}
              {state === "denied" ? "Reintentar" : actionLabel}
            </Button>
            {onPostpone && !required && state !== "checking" && (
              <Button
                size="sm"
                variant="ghost"
                className="gap-1 h-8"
                onClick={onPostpone}
              >
                <Clock className="w-3.5 h-3.5" /> Posponer
              </Button>
            )}
          </div>
        )}
        {state === "postponed" && onPostpone && (
          <Button
            size="sm"
            variant="outline"
            className="mt-2 gap-1 h-8"
            onClick={onAction}
          >
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
