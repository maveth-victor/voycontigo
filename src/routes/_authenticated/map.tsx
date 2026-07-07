import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { useLocationTracker } from "@/hooks/use-location-tracker";
import { BottomNav } from "@/components/BottomNav";
import { SosButton } from "@/components/SosButton";
import { Shield, MapPin } from "lucide-react";

const MapView = lazy(() =>
  import("@/components/MapView").then((m) => ({ default: m.MapView })),
);

export const Route = createFileRoute("/_authenticated/map")({
  component: MapPage,
});

function MapPage() {
  const { coords, permission } = useLocationTracker();
  const center = coords ? ([coords.latitude, coords.longitude] as [number, number]) : null;

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-background">
      <header
        className="absolute top-0 inset-x-0 z-30 px-4 pt-3 pb-3"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
      >
        <div
          className="max-w-md mx-auto flex items-center gap-2 px-4 py-2 rounded-2xl bg-card/90 backdrop-blur"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "var(--gradient-brand)" }}
          >
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <div className="font-semibold leading-tight">VoyContigo</div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {permission === "granted"
                ? coords
                  ? `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`
                  : "Obteniendo ubicación..."
                : permission === "denied"
                  ? "Permiso denegado"
                  : "Solicitando permiso..."}
            </div>
          </div>
        </div>
      </header>

      <div className="absolute inset-0 pb-20">
        <ClientOnly fallback={<div className="h-full w-full bg-muted" />}>
          <Suspense fallback={<div className="h-full w-full bg-muted" />}>
            <MapView center={center} />
          </Suspense>
        </ClientOnly>
      </div>

      <SosButton coords={coords} />
      <BottomNav />
    </div>
  );
}