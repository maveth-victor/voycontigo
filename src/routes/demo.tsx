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
  Star,
  MessageSquare,
  Camera,
  Send,
  X,
  UserPlus,
  User as UserIcon,
  Navigation,
  Route as RouteIcon,
  Settings,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { DemoMarker } from "@/components/DemoMap";

const DemoMap = lazy(() =>
  import("@/components/DemoMap").then((m) => ({ default: m.DemoMap })),
);

export const Route = createFileRoute("/demo")({
  ssr: false,
  component: DemoPage,
});

type Tab = "map" | "contacts" | "tracking" | "history" | "sos" | "forum" | "admin";

type Review = {
  id: string;
  author: string;
  place: string;
  rating: number;
  text: string;
  photos: string[];
  when: string;
};

const seedReviews: Review[] = [
  {
    id: "r1",
    author: "María López",
    place: "Parque México, Condesa",
    rating: 5,
    text: "Lugar muy seguro de día, bien iluminado y con vigilancia. Ideal para caminar.",
    photos: [],
    when: "Hoy 13:20",
  },
  {
    id: "r2",
    author: "Carlos Pérez",
    place: "Av. Reforma 222, CDMX",
    rating: 4,
    text: "Mucha gente y cámaras. Por la noche prefiero ir acompañado.",
    photos: [],
    when: "Ayer 20:05",
  },
  {
    id: "r3",
    author: "Ana Torres",
    place: "Coyoacán, CDMX",
    rating: 5,
    text: "Ambiente familiar, me sentí muy tranquila. Recomendado 100%.",
    photos: [],
    when: "Lun 18:40",
  },
];

const baseContacts: DemoMarker[] = [
  { id: "c1", name: "María López", kind: "contact", lat: -12.0480, lng: -77.0410, updated: "hace 12 s" },
  { id: "c2", name: "Carlos Pérez", kind: "contact", lat: -12.0510, lng: -77.0380, updated: "hace 8 s" },
  { id: "c3", name: "Ana Torres", kind: "contact", lat: -12.0440, lng: -77.0455, updated: "hace 5 s" },
];

const historyLog = [
  { t: "Hoy 14:32", place: "Av. Reforma 222, CDMX", lat: 19.4326, lng: -99.1582 },
  { t: "Hoy 13:10", place: "Parque México, Condesa", lat: 19.4108, lng: -99.1719 },
  { t: "Ayer 19:45", place: "Roma Norte, CDMX", lat: 19.4156, lng: -99.1633 },
  { t: "Ayer 09:12", place: "Polanco, CDMX", lat: 19.4338, lng: -99.1900 },
  { t: "Lun 18:20", place: "Coyoacán, CDMX", lat: 19.3467, lng: -99.1618 },
];

type DemoProfile = {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  bloodType: string;
  birthdate: string;
  emergencyNote: string;
  avatar: string | null;
};

const defaultProfile: DemoProfile = {
  fullName: "Tú (Demo)",
  phone: "+51 987 654 321",
  email: "demo@safetrack.app",
  address: "Av. Arequipa 1234, Lince, Lima",
  bloodType: "O+",
  birthdate: "1995-08-12",
  emergencyNote: "Alergia a la penicilina. Contactar a María López.",
  avatar: null,
};

function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(s)));
}

function bearingLabel(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dy = b.lat - a.lat;
  const dx = b.lng - a.lng;
  const deg = (Math.atan2(dx, dy) * 180) / Math.PI;
  const dirs = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  return dirs[Math.round(((deg + 360) % 360) / 45) % 8];
}

const streetSets: Record<string, string[]> = {
  c1: ["Av. Insurgentes Sur", "Av. Álvaro Obregón", "Calle Orizaba"],
  c2: ["Paseo de la Reforma", "Av. Juárez", "Eje Central"],
  c3: ["Av. México", "Parque México", "Av. Michoacán"],
};

function streetsFor(id: string): string[] {
  return (
    streetSets[id] ?? ["Av. Reforma", "Av. Insurgentes", "Calle Génova"]
  );
}

const contactDetails: Record<
  string,
  { phone: string; email: string; address: string; dailyMeters: number; relation: string }
> = {
  c1: {
    phone: "+51 987 112 233",
    email: "maria.lopez@safetrack.app",
    address: "Av. Larco 345, Miraflores, Lima",
    dailyMeters: 4820,
    relation: "Familiar",
  },
  c2: {
    phone: "+51 956 778 991",
    email: "carlos.perez@safetrack.app",
    address: "Jr. de la Unión 880, Cercado de Lima",
    dailyMeters: 7310,
    relation: "Amigo",
  },
  c3: {
    phone: "+51 934 455 667",
    email: "ana.torres@safetrack.app",
    address: "Av. Pardo y Aliaga 120, San Isidro, Lima",
    dailyMeters: 2640,
    relation: "Compañera de trabajo",
  },
};

function detailsFor(id: string) {
  return (
    contactDetails[id] ?? {
      phone: "+51 900 000 000",
      email: "contacto@safetrack.app",
      address: "Ubicación no registrada",
      dailyMeters: 1500 + (id.charCodeAt(0) % 50) * 100,
      relation: "Contacto",
    }
  );
}

function DemoPage() {
  const [tab, setTab] = useState<Tab>("map");
  const [me, setMe] = useState({ lat: -12.0464, lng: -77.0428 });
  const [contacts, setContacts] = useState(baseContacts);
  const [sos, setSos] = useState<DemoMarker | null>(null);
  const [sosContactId, setSosContactId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [selectedUser, setSelectedUser] = useState<DemoMarker | null>(null);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [profile, setProfile] = useState<DemoProfile>(defaultProfile);
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [trails, setTrails] = useState<Record<string, [number, number][]>>(() =>
    Object.fromEntries(baseContacts.map((c) => [c.id, [[c.lat, c.lng]]])),
  );

  // Simulate live movement every 2s
  useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => t + 1);
      setMe((p) => ({
        lat: p.lat + (Math.random() - 0.5) * 0.0008,
        lng: p.lng + (Math.random() - 0.5) * 0.0008,
      }));
      setContacts((cs) =>
        cs.map((c) => {
          const next = {
            ...c,
            lat: c.lat + (Math.random() - 0.5) * 0.0006,
            lng: c.lng + (Math.random() - 0.5) * 0.0006,
          };
          setTrails((tr) => {
            const prev = tr[c.id] ?? [[c.lat, c.lng] as [number, number]];
            const updated = [...prev, [next.lat, next.lng] as [number, number]].slice(-40);
            return { ...tr, [c.id]: updated };
          });
          return next;
        }),
      );
    }, 2000);
    return () => clearInterval(id);
  }, []);

  const markers = useMemo<DemoMarker[]>(() => {
    const all: DemoMarker[] = [
      { id: "me", name: "Tú (Demo)", kind: "me", lat: me.lat, lng: me.lng, updated: "ahora" },
      ...contacts.map((c) =>
        c.id === sosContactId ? { ...c, kind: "sos" as const, updated: "¡SOS ahora!" } : c,
      ),
    ];
    if (sos) all.push(sos);
    return all;
  }, [me, contacts, sos, sosContactId, tick]);

  // Pedir permiso de notificaciones del navegador en la demo
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, []);

  const triggerContactSos = (contactId: string) => {
    const c = contacts.find((x) => x.id === contactId);
    if (!c) return;
    setSosContactId(contactId);
    const msg = `Alerta: ${c.name} necesita ayuda`;
    toast.error(`🚨 ${msg}`, {
      description: "Toca el punto rojo en el mapa para ver su ubicación.",
      duration: 8000,
    });
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        new Notification("🚨 SOS SafeTrack", {
          body: msg,
          tag: `sos-${contactId}`,
        });
      } catch {}
    }
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try { navigator.vibrate?.([200, 100, 200, 100, 400]); } catch {}
    }
    setTimeout(() => setSosContactId((cur) => (cur === contactId ? null : cur)), 12000);
  };

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
          <div className="relative h-full w-full">
            <ClientOnly fallback={<div className="h-full w-full bg-muted" />}>
              <Suspense fallback={<div className="h-full w-full bg-muted" />}>
                <DemoMap markers={markers} />
              </Suspense>
            </ClientOnly>
            <MapLegend
              markers={markers}
              me={me}
              onSelect={(m) => setSelectedUser(m)}
              onSosContact={triggerContactSos}
              sosContactId={sosContactId}
            />
          </div>
        )}
        {tab === "contacts" && (
          <ContactsPanel
            contacts={contacts}
            setContacts={setContacts}
            onOpen={(c) => setSelectedUser(c)}
          />
        )}
        {tab === "history" && <HistoryPanel />}
        {tab === "sos" && <SosPanel me={me} onTriggerSos={triggerSos} sosActive={!!sos} />}
        {tab === "forum" && <ForumPanel />}
        {tab === "tracking" && (
          <TrackingPanel
            contacts={contacts}
            onTrack={(id) => setTrackingId(id)}
          />
        )}
        {tab === "admin" && (
          <AdminPanel
            contactsCount={contacts.length}
            sosActive={!!sos}
            contacts={contacts}
            onOpenUser={(c) => setSelectedUser(c)}
            onConfigureProfile={() => setShowProfileEditor(true)}
            profile={profile}
          />
        )}
      </div>

      {/* Bottom Nav (demo) */}
      <nav
        className="fixed bottom-0 inset-x-0 z-50 bg-card/95 backdrop-blur border-t border-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="max-w-md mx-auto flex items-center justify-around px-2 py-2">
          {[
            { id: "map" as Tab, icon: MapIcon, label: "Mapa" },
            { id: "contacts" as Tab, icon: Users, label: "Contactos" },
            { id: "tracking" as Tab, icon: Navigation, label: "Seguir" },
            { id: "sos" as Tab, icon: Siren, label: "SOS" },
            { id: "forum" as Tab, icon: MessageSquare, label: "Foro" },
            { id: "history" as Tab, icon: HistoryIcon, label: "Historial" },
            { id: "admin" as Tab, icon: ShieldCheck, label: "Admin" },
          ].map(({ id, icon: Icon, label }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl transition-colors ${
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

      {selectedUser && (
        <UserProfileSheet
          user={selectedUser}
          me={me}
          onClose={() => setSelectedUser(null)}
        />
      )}
      {trackingId && (
        <TrackingView
          contact={contacts.find((c) => c.id === trackingId)!}
          trail={trails[trackingId] ?? []}
          onClose={() => setTrackingId(null)}
        />
      )}
      {showProfileEditor && (
        <ProfileEditorSheet
          profile={profile}
          onSave={(p) => {
            setProfile(p);
            setShowProfileEditor(false);
            toast.success("Perfil actualizado");
          }}
          onClose={() => setShowProfileEditor(false)}
        />
      )}
    </div>
  );
}

function MapLegend({
  markers,
  me,
  onSelect,
  onSosContact,
  sosContactId,
}: {
  markers: DemoMarker[];
  me: { lat: number; lng: number };
  onSelect: (m: DemoMarker) => void;
  onSosContact: (contactId: string) => void;
  sosContactId: string | null;
}) {
  const items = markers.filter((m) => m.kind !== "me");
  return (
    <div className="absolute left-3 bottom-3 z-[400] max-w-[15rem] rounded-2xl bg-card/95 backdrop-blur border border-border p-3 space-y-2"
      style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="text-[11px] font-semibold uppercase text-muted-foreground">
        Leyenda
      </div>
      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow" />
          Tú
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow" />
          Contactos
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow" />
          Alerta SOS
        </div>
      </div>
      {items.length > 0 && (
        <div className="pt-1 border-t border-border space-y-1 max-h-32 overflow-y-auto">
          {items.map((m) => (
            <div
              key={m.id}
              className="w-full flex items-center justify-between gap-1 px-1 py-1 rounded-lg hover:bg-muted"
            >
              <button
                onClick={() => onSelect(m)}
                className="flex items-center gap-2 min-w-0 flex-1 text-left"
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    m.kind === "sos" ? "bg-red-500 animate-pulse" : "bg-emerald-500"
                  }`}
                />
                <span className="text-xs truncate">{m.name}</span>
                <span className="text-[10px] text-muted-foreground shrink-0 ml-auto">
                  {haversineMeters(me, m)} m
                </span>
              </button>
              {m.kind !== "sos" && sosContactId !== m.id && (
                <button
                  onClick={() => onSosContact(m.id)}
                  title={`Simular SOS de ${m.name}`}
                  className="shrink-0 w-6 h-6 rounded-md bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white flex items-center justify-center"
                >
                  <Siren className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UserProfileSheet({
  user,
  me,
  onClose,
}: {
  user: DemoMarker;
  me: { lat: number; lng: number };
  onClose: () => void;
}) {
  const dist = haversineMeters(me, user);
  const dir = bearingLabel(me, user);
  const info = detailsFor(user.id);
  const distKm = (dist / 1000).toFixed(2);
  const dailyKm = (info.dailyMeters / 1000).toFixed(2);
  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative z-[10000] w-full max-w-md max-h-[90vh] overflow-y-auto bg-card border border-border rounded-t-3xl sm:rounded-3xl p-5 space-y-4"
        style={{ boxShadow: "var(--shadow-card)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
            style={{ background: "var(--gradient-brand)" }}
          >
            {user.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{user.name}</div>
            <div className="text-xs text-muted-foreground capitalize">
              {user.kind === "sos" ? "Alerta de emergencia" : "Contacto autorizado"}
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 rounded-xl bg-muted/50 text-center">
            <div className="text-[10px] uppercase text-muted-foreground">Lejos de ti</div>
            <div className="text-lg font-bold text-primary">{dist} m</div>
            <div className="text-[10px] text-muted-foreground">{distKm} km</div>
          </div>
          <div className="p-3 rounded-xl bg-muted/50 text-center">
            <div className="text-[10px] uppercase text-muted-foreground">Dirección</div>
            <div className="text-lg font-bold text-primary flex items-center justify-center gap-1">
              <Navigation className="w-4 h-4" /> {dir}
            </div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-1">
          <div className="text-[10px] uppercase text-muted-foreground flex items-center gap-1">
            <RouteIcon className="w-3 h-3" /> Distancia recorrida hoy
          </div>
          <div className="text-2xl font-bold text-primary">{dailyKm} km</div>
          <div className="text-[11px] text-muted-foreground">
            {info.dailyMeters.toLocaleString()} metros acumulados durante el día
          </div>
        </div>

        <div className="p-3 rounded-xl bg-muted/50 space-y-2">
          <div className="text-[10px] uppercase text-muted-foreground">Perfil</div>
          <div className="grid grid-cols-1 gap-1 text-sm">
            <div className="flex items-center gap-2">
              <UserIcon className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Relación:</span>
              <span className="font-medium">{info.relation}</span>
            </div>
            <a href={`tel:${info.phone.replace(/\s/g, "")}`} className="flex items-center gap-2 hover:text-primary">
              <Phone className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Teléfono:</span>
              <span className="font-medium">{info.phone}</span>
            </a>
            <div className="flex items-center gap-2">
              <MessageCircle className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium truncate">{info.email}</span>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
              <span className="text-muted-foreground">Dirección:</span>
              <span className="font-medium">{info.address}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 gap-2" onClick={() => toast.info(`Llamando a ${user.name} (demo)`)}>
            <Phone className="w-4 h-4" /> Llamar
          </Button>
          <Button className="flex-1 gap-2" onClick={() => toast.info(`Mensaje a ${user.name} (demo)`)}>
            <MessageCircle className="w-4 h-4" /> Mensaje
          </Button>
        </div>
      </div>
    </div>
  );
}

function ProfileEditorSheet({
  profile,
  onSave,
  onClose,
}: {
  profile: DemoProfile;
  onSave: (p: DemoProfile) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<DemoProfile>(profile);
  const set = <K extends keyof DemoProfile>(k: K, v: DemoProfile[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onAvatar = (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => set("avatar", r.result as string);
    r.readAsDataURL(f);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-card border border-border rounded-t-3xl sm:rounded-3xl p-5 space-y-3"
        style={{ boxShadow: "var(--shadow-card)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Settings className="w-4 h-4" /> Configurar perfil
          </h3>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <label className="cursor-pointer relative">
            <input type="file" accept="image/*" className="hidden" onChange={(e) => onAvatar(e.target.files)} />
            {form.avatar ? (
              <img src={form.avatar} alt="avatar" className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl"
                style={{ background: "var(--gradient-brand)" }}
              >
                {form.fullName[0]}
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <Camera className="w-3 h-3" />
            </span>
          </label>
          <div className="text-xs text-muted-foreground">
            Toca la foto para cambiarla
          </div>
        </div>

        {[
          { k: "fullName" as const, label: "Nombre completo" },
          { k: "phone" as const, label: "Teléfono", type: "tel" },
          { k: "email" as const, label: "Correo", type: "email" },
          { k: "address" as const, label: "Dirección" },
          { k: "birthdate" as const, label: "Fecha de nacimiento", type: "date" },
          { k: "bloodType" as const, label: "Tipo de sangre" },
        ].map((f) => (
          <div key={f.k} className="space-y-1">
            <label className="text-xs text-muted-foreground">{f.label}</label>
            <Input
              type={f.type ?? "text"}
              value={form[f.k]}
              onChange={(e) => set(f.k, e.target.value)}
            />
          </div>
        ))}

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Notas médicas / emergencia</label>
          <textarea
            value={form.emergencyNote}
            onChange={(e) => set("emergencyNote", e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40 resize-none"
          />
        </div>

        <Button onClick={() => onSave(form)} className="w-full gap-2">
          <Save className="w-4 h-4" /> Guardar perfil
        </Button>
      </div>
    </div>
  );
}

function ContactsPanel({
  contacts,
  setContacts,
  onOpen,
}: {
  contacts: DemoMarker[];
  setContacts: React.Dispatch<React.SetStateAction<DemoMarker[]>>;
  onOpen: (c: DemoMarker) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const addContact = () => {
    if (!name.trim() || !phone.trim()) {
      toast.error("Completa nombre y teléfono");
      return;
    }
    if (!/^[+\d\s-]{7,}$/.test(phone.trim())) {
      toast.error("Teléfono no válido");
      return;
    }
    const newC: DemoMarker = {
      id: `c${Date.now()}`,
      name: name.trim(),
      kind: "contact",
      lat: 19.4326 + (Math.random() - 0.5) * 0.02,
      lng: -99.1332 + (Math.random() - 0.5) * 0.02,
      updated: "ahora",
    };
    setContacts((cs) => [...cs, newC]);
    toast.success(`${newC.name} agregado`);
    setName("");
    setPhone("");
    setShowForm(false);
  };

  return (
    <div className="h-full overflow-y-auto px-4 py-4">
      <div className="max-w-md mx-auto space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Contactos autorizados</h2>
          <Button
            size="sm"
            onClick={() => setShowForm((v) => !v)}
            className="gap-1"
          >
            {showForm ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            {showForm ? "Cerrar" : "Nuevo"}
          </Button>
        </div>

        {showForm && (
          <div
            className="rounded-2xl bg-card border border-border p-4 space-y-3"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <div className="text-sm font-semibold">Agregar contacto</div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Nombre</label>
              <Input
                placeholder="Ej. Laura Gómez"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Teléfono</label>
              <Input
                type="tel"
                inputMode="tel"
                placeholder="+52 55 1234 5678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <Button onClick={addContact} className="w-full gap-2">
              <UserPlus className="w-4 h-4" />
              Guardar contacto
            </Button>
          </div>
        )}

        {contacts.map((c) => (
          <button
            key={c.id}
            onClick={() => onOpen(c)}
            className="w-full text-left flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:border-primary/40 transition-colors"
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
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
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
  contacts,
  onOpenUser,
  onConfigureProfile,
  profile,
}: {
  contactsCount: number;
  sosActive: boolean;
  contacts: DemoMarker[];
  onOpenUser: (c: DemoMarker) => void;
  onConfigureProfile: () => void;
  profile: DemoProfile;
}) {
  return (
    <div className="h-full overflow-y-auto px-4 py-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Panel administrativo</h2>
          <Button size="sm" onClick={onConfigureProfile} className="gap-1">
            <Settings className="w-4 h-4" /> Perfil
          </Button>
        </div>

        <button
          onClick={onConfigureProfile}
          className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:border-primary/40 text-left"
        >
          {profile.avatar ? (
            <img src={profile.avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
              style={{ background: "var(--gradient-brand)" }}
            >
              {profile.fullName[0]}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{profile.fullName}</div>
            <div className="text-xs text-muted-foreground truncate">
              {profile.email} · {profile.phone}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>

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
          {contacts.map((c) => (
            <button
              key={c.id}
              onClick={() => onOpenUser(c)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-card border border-border hover:border-primary/40 text-left"
            >
              <span className="flex items-center gap-2 text-sm min-w-0">
                <UserIcon className="w-4 h-4 text-primary shrink-0" />
                <span className="truncate">{c.name}</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                En línea
              </span>
            </button>
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

function SosPanel({
  me,
  onTriggerSos,
  sosActive,
}: {
  me: { lat: number; lng: number };
  onTriggerSos: () => void;
  sosActive: boolean;
}) {
  const [sent, setSent] = useState(false);

  const handleSos = () => {
    onTriggerSos();
    setSent(true);
    setTimeout(() => setSent(false), 6000);
  };

  return (
    <div className="h-full overflow-y-auto px-4 py-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold">Pedir ayuda</h2>
          <p className="text-sm text-muted-foreground">
            En una emergencia, presiona el botón para alertar a tus contactos.
          </p>
        </div>

        <button
          onClick={handleSos}
          disabled={sent}
          className="w-full py-6 rounded-3xl flex flex-col items-center gap-2 text-white font-bold transition-all active:scale-[0.98] disabled:opacity-70"
          style={{
            background: sent
              ? "oklch(0.55 0.18 145)"
              : "oklch(0.6 0.24 25)",
            boxShadow: sent
              ? "0 10px 30px -8px oklch(0.55 0.18 145 / 0.5)"
              : "0 10px 30px -8px oklch(0.6 0.24 25 / 0.6)",
          }}
        >
          {sent ? (
            <CheckCircle2 className="w-10 h-10" />
          ) : (
            <Siren className="w-10 h-10" />
          )}
          <span className="text-lg">
            {sent ? "Alerta enviada" : "BOTÓN DE EMERGENCIA"}
          </span>
          <span className="text-xs font-normal opacity-90">
            {sent
              ? "Tus contactos han sido notificados"
              : "Mantén presionado 3 segundos en la app real"}
          </span>
        </button>

        {sosActive && (
          <div className="p-4 rounded-2xl border border-destructive/40 bg-destructive/5 space-y-2">
            <div className="flex items-center gap-2 text-destructive font-semibold">
              <AlertTriangle className="w-5 h-5" /> Alerta SOS activa
            </div>
            <div className="text-sm text-muted-foreground">
              Ubicación: {me.lat.toFixed(4)}, {me.lng.toFixed(4)}
            </div>
            <div className="text-xs text-muted-foreground">
              Enviada a {baseContacts.length} contactos
            </div>
          </div>
        )}

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Contactos de emergencia
          </h3>
          {baseContacts.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Phone className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{c.name}</div>
                <div className="text-xs text-muted-foreground">
                  Contacto autorizado
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center"
                  onClick={() => toast.info(`Llamando a ${c.name} (demo)` )}
                >
                  <Phone className="w-4 h-4" />
                </button>
                <button
                  className="w-9 h-9 rounded-xl bg-muted text-muted-foreground flex items-center justify-center"
                  onClick={() => toast.info(`Mensaje a ${c.name} (demo)` )}
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-primary" />
            Líneas de emergencia
          </h3>
          {[
            { name: "Emergencias", num: "911", desc: "Policía, bomberos, ambulancia" },
            { name: "Cruz Roja", num: "065", desc: "Atención médica de emergencia" },
            { name: "Denuncia anónima", num: "089", desc: "Denuncia segura y anónima" },
          ].map((line) => (
            <div
              key={line.num}
              className="flex items-center justify-between p-3 rounded-xl bg-muted/50"
            >
              <div>
                <div className="font-medium text-sm">{line.name}</div>
                <div className="text-xs text-muted-foreground">{line.desc}</div>
              </div>
              <button
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
                onClick={() => toast.info(`Llamando al ${line.num} (demo)` )}
              >
                {line.num}
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        <div className="text-xs text-muted-foreground text-center">
          Esta es una demostración. En la app real, la alerta comparte tu ubicación en tiempo real con tus contactos de confianza.
        </div>
      </div>
    </div>
  );
}

function Stars({
  value,
  onChange,
  size = 18,
}: {
  value: number;
  onChange?: (n: number) => void;
  size?: number;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        const Comp = onChange ? "button" : "span";
        return (
          <Comp
            key={n}
            type="button"
            onClick={onChange ? () => onChange(n) : undefined}
            className={onChange ? "cursor-pointer" : ""}
            aria-label={`${n} estrellas`}
          >
            <Star
              style={{ width: size, height: size }}
              className={filled ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}
            />
          </Comp>
        );
      })}
    </div>
  );
}

function ForumPanel() {
  const [reviews, setReviews] = useState<Review[]>(seedReviews);
  const [place, setPlace] = useState("");
  const [text, setText] = useState("");
  const [rating, setRating] = useState(5);
  const [photos, setPhotos] = useState<string[]>([]);

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files)
      .slice(0, 4 - photos.length)
      .forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          setPhotos((p) => [...p, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
  };

  const submit = () => {
    if (!place.trim() || !text.trim()) {
      toast.error("Agrega el lugar y tu reseña");
      return;
    }
    const r: Review = {
      id: `r${Date.now()}`,
      author: "Tú (Demo)",
      place: place.trim(),
      rating,
      text: text.trim(),
      photos,
      when: "Ahora",
    };
    setReviews((rs) => [r, ...rs]);
    setPlace("");
    setText("");
    setRating(5);
    setPhotos([]);
    toast.success("Reseña publicada");
  };

  const avg =
    reviews.length === 0
      ? 0
      : reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;

  return (
    <div className="h-full overflow-y-auto px-4 py-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Foro de reseñas</h2>
          <div className="flex items-center gap-1 text-sm">
            <Stars value={Math.round(avg)} />
            <span className="text-muted-foreground">({reviews.length})</span>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-card border border-border space-y-3">
          <div className="text-sm font-semibold">Califica un lugar</div>
          <input
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            placeholder="Nombre del lugar (p. ej. Parque México)"
            className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Tu calificación</span>
            <Stars value={rating} onChange={setRating} size={22} />
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="¿Cómo fue tu experiencia? ¿Te sentiste seguro?"
            rows={3}
            className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40 resize-none"
          />

          {photos.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {photos.map((src, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                  <img src={src} alt="foto" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <label className="flex-1 cursor-pointer">
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  onFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-muted text-sm font-medium">
                <Camera className="w-4 h-4" /> Subir fotos
              </div>
            </label>
            <Button onClick={submit} className="gap-2">
              <Send className="w-4 h-4" /> Publicar
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="p-3 rounded-2xl bg-card border border-border space-y-2">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold"
                  style={{ background: "var(--gradient-brand)" }}
                >
                  {r.author[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{r.author}</div>
                  <div className="text-[11px] text-muted-foreground">{r.when}</div>
                </div>
                <Stars value={r.rating} />
              </div>
              <div className="text-xs text-primary font-semibold flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {r.place}
              </div>
              <p className="text-sm text-foreground/90">{r.text}</p>
              {r.photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {r.photos.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt={`foto ${i + 1}`}
                      className="w-full aspect-square object-cover rounded-lg"
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}