import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import {
  Shield,
  MapPin,
  Map as MapIcon,
  Users,
  History as HistoryIcon,
  ShieldCheck,
  ArrowLeft,
  Siren,
  CheckCircle2,
  Clock,
  Phone,
  MessageCircle,
  AlertTriangle,
  HeartPulse,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { DemoMarker } from "@/components/DemoMap";

const DemoMap = lazy(() =>
  import("@/components/DemoMap").then((m) => ({ default: m.DemoMap })),
);

export const Route = createFileRoute("/demo")({
  ssr: false,
  component: DemoPage,
});

type Tab = "map" | "contacts" | "history" | "sos" | "admin";

const baseContacts: DemoMarker[] = [
  { id: "c1", name: "María López", kind: "contact", lat: 19.4339, lng: -99.1410, updated: "hace 12 s" },
  { id: "c2", name: "Carlos Pérez", kind: "contact", lat: 19.4280, lng: -99.1290, updated: "hace 8 s" },
  { id: "c3", name: "Ana Torres", kind: "contact", lat: 19.4365, lng: -99.1355, updated: "hace 5 s" },
];

const historyLog = [
  { t: "Hoy 14:32", place: "Av. Reforma 222, CDMX", lat: 19.4326, lng: -99.1582 },
  { t: "Hoy 13:10", place: "Parque México, Condesa", lat: 19.4108, lng: -99.1719 },
  { t: "Ayer 19:45", place: "Roma Norte, CDMX", lat: 19.4156, lng: -99.1633 },
  { t: "Ayer 09:12", place: "Polanco, CDMX", lat: 19.4338, lng: -99.1900 },
  { t: "Lun 18:20", place: "Coyoacán, CDMX", lat: 19.3467, lng: -99.1618 },
];

function DemoPage() {
  const [tab, setTab] = useState<Tab>("map");
  const [me, setMe] = useState({ lat: 19.4326, lng: -99.1332 });
  const [contacts, setContacts] = useState(baseContacts);
  const [sos, setSos] = useState<DemoMarker | null>(null);
  const [tick, setTick] = useState(0);

  // Simulate live movement every 2s
  useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => t + 1);
      setMe((p) => ({
        lat: p.lat + (Math.random() - 0.5) * 0.0008,
        lng: p.lng + (Math.random() - 0.5) * 0.0008,
      }));
      setContacts((cs) =>
        cs.map((c) => ({
          ...c,
          lat: c.lat + (Math.random() - 0.5) * 0.0006,
          lng: c.lng + (Math.random() - 0.5) * 0.0006,
        })),
      );
    }, 2000);
    return () => clearInterval(id);
  }, []);

  const markers = useMemo<DemoMarker[]>(() => {
    const all: DemoMarker[] = [
      { id: "me", name: "Tú (Demo)", kind: "me", lat: me.lat, lng: me.lng, updated: "ahora" },
      ...contacts,
    ];
    if (sos) all.push(sos);
    return all;
  }, [me, contacts, sos, tick]);

  const triggerSos = () => {
    setSos({
      id: "sos1",
      name: "Alerta SOS · Tú",
      kind: "sos",
      lat: me.lat,
      lng: me.lng,
      updated: new Date().toLocaleTimeString(),
    });
    toast.error("🚨 Alerta SOS enviada a tus contactos");
    setTimeout(() => setSos(null), 8000);
  };

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-background">
      {/* Header */}
      <header
        className="absolute top-0 inset-x-0 z-30 px-4 pt-3 pb-3"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
      >
        <div
          className="max-w-md mx-auto flex items-center gap-2 px-3 py-2 rounded-2xl bg-card/95 backdrop-blur"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <Link
            to="/auth"
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted text-muted-foreground"
            aria-label="Volver"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "var(--gradient-brand)" }}
          >
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold leading-tight truncate">
              SafeTrack · Demo
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3" />
              {me.lat.toFixed(4)}, {me.lng.toFixed(4)}
            </div>
          </div>
          <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-primary/10 text-primary">
            DEMO
          </span>
        </div>
      </header>

      {/* Content */}
      <div className="absolute inset-0 pt-[88px] pb-20">
        {tab === "map" && (
          <ClientOnly fallback={<div className="h-full w-full bg-muted" />}>
            <Suspense fallback={<div className="h-full w-full bg-muted" />}>
              <DemoMap markers={markers} />
            </Suspense>
          </ClientOnly>
        )}
        {tab === "contacts" && <ContactsPanel contacts={contacts} />}
        {tab === "history" && <HistoryPanel />}
        {tab === "admin" && <AdminPanel contactsCount={contacts.length} sosActive={!!sos} />}
      </div>

      {/* SOS button */}
      {tab === "map" && (
        <button
          onClick={triggerSos}
          className="fixed right-5 bottom-24 z-40 w-16 h-16 rounded-full flex items-center justify-center text-white font-bold"
          style={{
            background: "oklch(0.6 0.24 25)",
            boxShadow: "0 10px 30px -8px oklch(0.6 0.24 25 / 0.6)",
          }}
        >
          <Siren className="w-7 h-7" />
        </button>
      )}

      {/* Bottom Nav (demo) */}
      <nav
        className="fixed bottom-0 inset-x-0 z-50 bg-card/95 backdrop-blur border-t border-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="max-w-md mx-auto flex items-center justify-around px-2 py-2">
          {[
            { id: "map" as Tab, icon: MapIcon, label: "Mapa" },
            { id: "contacts" as Tab, icon: Users, label: "Contactos" },
            { id: "history" as Tab, icon: HistoryIcon, label: "Historial" },
            { id: "admin" as Tab, icon: ShieldCheck, label: "Admin" },
          ].map(({ id, icon: Icon, label }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function ContactsPanel({ contacts }: { contacts: DemoMarker[] }) {
  return (
    <div className="h-full overflow-y-auto px-4 py-4">
      <div className="max-w-md mx-auto space-y-3">
        <h2 className="text-lg font-semibold">Contactos autorizados</h2>
        {contacts.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border"
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
              style={{ background: "var(--gradient-brand)" }}
            >
              {c.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{c.name}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {c.lat.toFixed(4)}, {c.lng.toFixed(4)} · {c.updated}
              </div>
            </div>
            <CheckCircle2 className="w-5 h-5 text-primary" />
          </div>
        ))}
        <div className="text-xs text-muted-foreground text-center pt-2">
          En la app real puedes enviar y aceptar solicitudes por correo.
        </div>
      </div>
    </div>
  );
}

function HistoryPanel() {
  return (
    <div className="h-full overflow-y-auto px-4 py-4">
      <div className="max-w-md mx-auto space-y-3">
        <h2 className="text-lg font-semibold">Historial (últimos 7 días)</h2>
        {historyLog.map((h, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-3 rounded-2xl bg-card border border-border"
          >
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{h.place}</div>
              <div className="text-xs text-muted-foreground">
                {h.t} · {h.lat.toFixed(4)}, {h.lng.toFixed(4)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminPanel({
  contactsCount,
  sosActive,
}: {
  contactsCount: number;
  sosActive: boolean;
}) {
  return (
    <div className="h-full overflow-y-auto px-4 py-4">
      <div className="max-w-md mx-auto space-y-4">
        <h2 className="text-lg font-semibold">Panel administrativo</h2>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Conectados", value: contactsCount + 1 },
            { label: "Ubicaciones", value: 248 },
            { label: "Alertas", value: sosActive ? 1 : 0 },
          ].map((s) => (
            <div
              key={s.label}
              className="p-3 rounded-2xl bg-card border border-border text-center"
            >
              <div className="text-2xl font-bold text-primary">{s.value}</div>
              <div className="text-[10px] text-muted-foreground uppercase">
                {s.label}
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Usuarios activos
          </h3>
          {["Tú (Demo)", "María López", "Carlos Pérez", "Ana Torres"].map((n) => (
            <div
              key={n}
              className="flex items-center justify-between p-3 rounded-xl bg-card border border-border"
            >
              <span className="text-sm">{n}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                En línea
              </span>
            </div>
          ))}
        </div>
        {sosActive && (
          <div className="p-3 rounded-2xl border border-destructive/40 bg-destructive/5">
            <div className="flex items-center gap-2 text-destructive font-semibold">
              <Siren className="w-4 h-4" /> Alerta SOS activa
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Tú (Demo) — recibida ahora
            </div>
          </div>
        )}
      </div>
    </div>
  );
}