import { useCallback, useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Crosshair, Phone, MessageCircle, Navigation, X, MapPin, Footprints, User } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const COLOR_ME = "#2563eb";
const COLOR_CONTACT = "#16a34a";
const COLOR_SOS = "#dc2626";
const COLOR_OFF = "#d4d4d8";

const dot = (color: string, size: number, pulse = false) =>
  new L.DivIcon({
    className: "",
    html: `<div style="box-sizing:border-box;width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:3px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.45)${pulse ? `,0 0 0 8px ${color}55` : ""}"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });

const userIcon = dot(COLOR_ME, 24);
const contactIcon = dot(COLOR_CONTACT, 24);
const sosIcon = dot(COLOR_SOS, 28, true);

type Loc = {
  user_id: string;
  username: string;
  latitude: number;
  longitude: number;
  updated_at: string;
};

type Person = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
};

const ONLINE_MS = 2 * 60 * 1000;

const haversine = (a: [number, number], b: [number, number]) => {
  const R = 6371000;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const la1 = (a[0] * Math.PI) / 180;
  const la2 = (b[0] * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const fmtDist = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`);

const bearingLabel = (a: [number, number], b: [number, number]) => {
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const la1 = (a[0] * Math.PI) / 180;
  const la2 = (b[0] * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(la2);
  const x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLng);
  const deg = (Math.atan2(y, x) * 180) / Math.PI;
  const dirs = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  return dirs[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
};

const isValid = (lat: unknown, lng: unknown): boolean =>
  typeof lat === "number" &&
  typeof lng === "number" &&
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  !(lat === 0 && lng === 0) &&
  lat >= -90 &&
  lat <= 90 &&
  lng >= -180 &&
  lng <= 180;

function MapController({
  center,
  recenterKey,
  followTarget,
}: {
  center: [number, number] | null;
  recenterKey: number;
  followTarget: [number, number] | null;
}) {
  const map = useMap();
  const [followed, setFollowed] = useState(false);

  useEffect(() => {
    if (!center) return;
    if (!followed) {
      map.setView(center, 16);
      setFollowed(true);
    }
  }, [center, followed, map]);

  useEffect(() => {
    if (followTarget) map.setView(followTarget, Math.max(map.getZoom(), 16), { animate: true });
  }, [followTarget?.[0], followTarget?.[1], map]);

  useEffect(() => {
    if (recenterKey > 0 && center) map.setView(center, 16, { animate: true });
  }, [recenterKey, center, map]);

  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 250);
    return () => clearTimeout(t);
  }, [map]);

  return null;
}

export function MapView({ center }: { center: [number, number] | null }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [locations, setLocations] = useState<Loc[]>([]);
  const [contactProfiles, setContactProfiles] = useState<Record<string, Person>>({});
  const [sosUserIds, setSosUserIds] = useState<Set<string>>(new Set());
  const [recenterKey, setRecenterKey] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [followId, setFollowId] = useState<string | null>(null);
  const [dailyMeters, setDailyMeters] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    if (!user) return;

    const { data: cs, error: cErr } = await supabase
      .from("contacts")
      .select("contact_id")
      .eq("user_id", user.id);
    if (cErr) console.error("[map] contacts", cErr);
    const contactIds = (cs ?? []).map((c) => c.contact_id);

    if (contactIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,full_name,phone,email")
        .in("id", contactIds);
      const map: Record<string, Person> = {};
      (profs ?? []).forEach((p) => {
        map[p.id] = p as Person;
      });
      setContactProfiles(map);
    } else {
      setContactProfiles({});
    }

    const ids = [user.id, ...contactIds];
    const { data, error } = await supabase
      .from("locations")
      .select("user_id,username,latitude,longitude,updated_at")
      .in("user_id", ids);
    if (error) {
      console.error("[map] locations", error);
      return;
    }
    setLocations(((data ?? []) as Loc[]).filter((l) => isValid(l.latitude, l.longitude)));
  }, [user]);

  const loadSos = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("sos_alerts")
      .select("user_id,resolved")
      .eq("resolved", false);
    if (error) {
      console.error("[map] sos", error);
      return;
    }
    setSosUserIds(new Set((data ?? []).map((s) => s.user_id)));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    load();
    loadSos();

    const ch = supabase
      .channel("map-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "locations" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "contacts" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "sos_alerts" }, () => loadSos())
      .subscribe();

    const poll = setInterval(() => {
      load();
      loadSos();
    }, 15000);

    return () => {
      supabase.removeChannel(ch);
      clearInterval(poll);
    };
  }, [user, load, loadSos]);

  // Mi marcador siempre refleja el GPS actual (fallback: última fila en BD)
  const myDbLoc = locations.find((l) => l.user_id === user?.id);
  const myPos: [number, number] | null = center
    ? center
    : myDbLoc
      ? [myDbLoc.latitude, myDbLoc.longitude]
      : null;

  const contactLocs = useMemo(
    () => locations.filter((l) => l.user_id !== user?.id),
    [locations, user],
  );

  const initial = useMemo<[number, number]>(
    () => myPos ?? [-12.0464, -77.0428],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const noContactLocations = contactLocs.length === 0;

  const followLoc = useMemo(
    () => (followId ? contactLocs.find((l) => l.user_id === followId) ?? null : null),
    [followId, contactLocs],
  );
  const followTarget: [number, number] | null = followLoc
    ? [followLoc.latitude, followLoc.longitude]
    : null;

  const selectedLoc = selectedId ? contactLocs.find((l) => l.user_id === selectedId) ?? null : null;
  const selectedProfile = selectedId ? contactProfiles[selectedId] : undefined;

  // Distancia recorrida hoy: solo si el historial del contacto está disponible
  useEffect(() => {
    if (!selectedId) return;
    let cancel = false;
    (async () => {
      const since = new Date();
      since.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("location_history")
        .select("latitude,longitude,recorded_at")
        .eq("user_id", selectedId)
        .gte("recorded_at", since.toISOString())
        .order("recorded_at", { ascending: true });
      if (cancel || !data || data.length < 2) return;
      let total = 0;
      for (let i = 1; i < data.length; i++) {
        const a = data[i - 1];
        const b = data[i];
        if (!isValid(a.latitude, a.longitude) || !isValid(b.latitude, b.longitude)) continue;
        const d = haversine([a.latitude, a.longitude], [b.latitude, b.longitude]);
        if (d < 5000) total += d;
      }
      setDailyMeters((prev) => ({ ...prev, [selectedId]: total }));
    })();
    return () => {
      cancel = true;
    };
  }, [selectedId]);

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={initial}
        zoom={myPos ? 16 : 12}
        className="h-full w-full"
        style={{ background: "var(--color-muted)" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController center={myPos} recenterKey={recenterKey} followTarget={followTarget} />

        {myPos && (
          <Marker
            position={myPos}
            icon={sosUserIds.has(user?.id ?? "") ? sosIcon : userIcon}
            zIndexOffset={1000}
          >
            <Popup>
              <div className="text-sm space-y-1">
                <div className="font-semibold" style={{ color: COLOR_ME }}>
                  🔵 Mi ubicación
                </div>
                <div className="text-xs">
                  📍 {myPos[0].toFixed(5)}, {myPos[1].toFixed(5)}
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {contactLocs.map((l) => {
          const online = Date.now() - new Date(l.updated_at).getTime() < ONLINE_MS;
          const isSos = sosUserIds.has(l.user_id);
          return (
            <Marker
              key={l.user_id}
              position={[l.latitude, l.longitude]}
              icon={isSos ? sosIcon : contactIcon}
              zIndexOffset={isSos ? 900 : 500}
              eventHandlers={{ click: () => setSelectedId(l.user_id) }}
            >
              <Popup>
                <div className="text-sm space-y-1">
                  <div className="font-semibold">
                    👤 {contactProfiles[l.user_id]?.full_name ?? l.username ?? "Contacto"}
                  </div>
                  <div className="text-xs" style={{ color: online ? COLOR_CONTACT : COLOR_OFF }}>
                    {online ? "🟢 En línea" : "⚪ Última ubicación conocida"}
                  </div>
                  {isSos && (
                    <div className="text-xs font-semibold" style={{ color: COLOR_SOS }}>
                      🚨 Alerta SOS activa
                    </div>
                  )}
                  <div className="text-xs">
                    📍 {l.latitude.toFixed(5)}, {l.longitude.toFixed(5)}
                  </div>
                  <div className="text-xs opacity-70">
                    🕐 {new Date(l.updated_at).toLocaleString()}
                  </div>
                  <button
                    type="button"
                    className="text-xs font-semibold text-primary underline"
                    onClick={() => setSelectedId(l.user_id)}
                  >
                    Ver detalle
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {followId && (
        <div
          className="absolute z-[1100] left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-card/95 backdrop-blur border border-border px-3 py-1.5 shadow-lg"
          style={{ top: 90 }}
        >
          <Navigation className="w-3.5 h-3.5 text-primary" />
          <span className="text-[11px] font-medium">
            Siguiendo a {contactProfiles[followId]?.full_name ?? "contacto"}
            {!followLoc && " · Ubicación no disponible"}
          </span>
          <button
            type="button"
            className="text-[11px] font-semibold text-destructive"
            onClick={() => setFollowId(null)}
          >
            Dejar de seguir
          </button>
        </div>
      )}

      {selectedId && (
        <div className="absolute inset-0 z-[1200] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Cerrar"
            className="absolute inset-0 bg-black/40"
            onClick={() => setSelectedId(null)}
          />
          <div
            className="relative w-full max-w-sm rounded-3xl bg-card p-4 space-y-3"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-primary-foreground text-lg font-semibold"
                style={{ background: "var(--gradient-brand)" }}
              >
                {(selectedProfile?.full_name ?? selectedLoc?.username ?? "C").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">
                  {selectedProfile?.full_name ?? selectedLoc?.username ?? "Contacto"}
                </div>
                <div className="text-xs text-muted-foreground">Contacto autorizado</div>
              </div>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setSelectedId(null)}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-muted/60 p-3 text-center">
                <div className="text-[10px] font-semibold tracking-wider text-muted-foreground">
                  LEJOS DE TI
                </div>
                <div className="text-xl font-bold text-primary">
                  {myPos && selectedLoc
                    ? fmtDist(haversine(myPos, [selectedLoc.latitude, selectedLoc.longitude]))
                    : "—"}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {myPos && selectedLoc
                    ? `rumbo ${bearingLabel(myPos, [selectedLoc.latitude, selectedLoc.longitude])}`
                    : "Ubicación no disponible"}
                </div>
              </div>
              <div className="rounded-2xl bg-muted/60 p-3">
                <div className="text-[10px] font-semibold tracking-wider text-muted-foreground">
                  ÚLTIMA UBICACIÓN CONOCIDA
                </div>
                {selectedLoc ? (
                  <>
                    <div className="text-xs font-semibold text-primary flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {selectedLoc.latitude.toFixed(5)}, {selectedLoc.longitude.toFixed(5)}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {Date.now() - new Date(selectedLoc.updated_at).getTime() < ONLINE_MS
                        ? "🟢 En línea"
                        : `⚪ ${new Date(selectedLoc.updated_at).toLocaleString()}`}
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-muted-foreground">Sin ubicación</div>
                )}
              </div>
            </div>

            {dailyMeters[selectedId] !== undefined && (
              <div className="rounded-2xl bg-muted/60 p-3">
                <div className="text-[10px] font-semibold tracking-wider text-muted-foreground flex items-center gap-1">
                  <Footprints className="w-3 h-3" /> DISTANCIA RECORRIDA HOY
                </div>
                <div className="text-xl font-bold text-primary">
                  {fmtDist(dailyMeters[selectedId])}
                </div>
              </div>
            )}

            <div className="rounded-2xl bg-muted/60 p-3 space-y-1">
              <div className="text-[10px] font-semibold tracking-wider text-muted-foreground">
                PERFIL
              </div>
              <div className="text-xs flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-muted-foreground" /> Relación:{" "}
                <span className="font-medium">Contacto autorizado</span>
              </div>
              {selectedProfile?.phone && (
                <div className="text-xs flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground" /> Teléfono:{" "}
                  <span className="font-medium">{selectedProfile.phone}</span>
                </div>
              )}
              {selectedProfile?.email && (
                <div className="text-xs flex items-center gap-2">
                  <MessageCircle className="w-3.5 h-3.5 text-muted-foreground" /> Email:{" "}
                  <span className="font-medium truncate">{selectedProfile.email}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 h-10 rounded-xl border border-border text-xs font-medium flex items-center justify-center gap-1"
                onClick={() => {
                  if (!selectedProfile?.phone) {
                    toast.error("Este contacto no tiene número registrado");
                    return;
                  }
                  window.location.href = `tel:${selectedProfile.phone.replace(/\s/g, "")}`;
                }}
              >
                <Phone className="w-4 h-4" /> Llamar
              </button>
              <button
                type="button"
                className="flex-1 h-10 rounded-xl border border-border text-xs font-medium flex items-center justify-center gap-1"
                onClick={() => {
                  setSelectedId(null);
                  navigate({ to: "/grupo" });
                }}
              >
                <MessageCircle className="w-4 h-4" /> Mensaje
              </button>
              <button
                type="button"
                className="flex-1 h-10 rounded-xl text-xs font-medium text-primary-foreground flex items-center justify-center gap-1"
                style={{ background: "var(--gradient-brand)" }}
                onClick={() => {
                  if (!selectedLoc) {
                    toast.error("Ubicación no disponible");
                    return;
                  }
                  setFollowId(selectedId);
                  setSelectedId(null);
                }}
              >
                <Navigation className="w-4 h-4" /> Seguir en vivo
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setRecenterKey((k) => k + 1)}
        aria-label="Centrar en mi ubicación"
        className="absolute z-[1000] w-11 h-11 rounded-full bg-card shadow-lg border border-border flex items-center justify-center active:scale-95 transition"
        style={{ bottom: 130, right: 15 }}
      >
        <Crosshair className="w-5 h-5 text-primary" />
      </button>

      {noContactLocations && (
        <div
          className="absolute z-[1000] max-w-[70vw] rounded-xl bg-card/95 backdrop-blur border border-border px-3 py-2 text-[11px] text-muted-foreground shadow-lg"
          style={{ top: 90, left: 15 }}
        >
          Las personas agregadas aparecerán aquí cuando compartan su ubicación.
        </div>
      )}

      <div
        className="absolute z-[1000] rounded-xl border border-border bg-card/95 backdrop-blur px-3 py-2 shadow-lg pointer-events-none"
        style={{ bottom: 15, right: 15 }}
      >
        <div className="text-[10px] font-bold tracking-wider text-muted-foreground mb-1.5">
          LEYENDA
        </div>
        <ul className="space-y-1">
          {[
            { c: COLOR_ME, t: "Mi ubicación" },
            { c: COLOR_CONTACT, t: "Persona agregada" },
            { c: COLOR_SOS, t: "Alerta" },
            { c: COLOR_OFF, t: "Sin ubicación" },
          ].map((i) => (
            <li key={i.t} className="flex items-center gap-2 text-[11px] leading-none">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 border border-white"
                style={{ background: i.c }}
              />
              <span>{i.t}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
