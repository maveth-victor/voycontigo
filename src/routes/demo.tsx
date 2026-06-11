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

type Tab = "map" | "contacts" | "history" | "sos" | "forum" | "admin";

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
        {tab === "contacts" && (
          <ContactsPanel contacts={contacts} setContacts={setContacts} />
        )}
        {tab === "history" && <HistoryPanel />}
        {tab === "sos" && <SosPanel me={me} onTriggerSos={triggerSos} sosActive={!!sos} />}
        {tab === "forum" && <ForumPanel />}
        {tab === "admin" && <AdminPanel contactsCount={contacts.length} sosActive={!!sos} />}
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
    </div>
  );
}

function ContactsPanel({
  contacts,
  setContacts,
}: {
  contacts: DemoMarker[];
  setContacts: React.Dispatch<React.SetStateAction<DemoMarker[]>>;
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