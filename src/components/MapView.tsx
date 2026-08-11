import { useCallback, useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Crosshair } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const COLOR_ME = "#2563eb";
const COLOR_CONTACT = "#16a34a";
const COLOR_SOS = "#dc2626";
const COLOR_OFF = "#d4d4d8";

const dot = (color: string, size: number, pulse = false) =>
  new L.DivIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:3px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.45)${pulse ? `,0 0 0 8px ${color}55` : ""}"></div>`,
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
}: {
  center: [number, number] | null;
  recenterKey: number;
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
  const [locations, setLocations] = useState<Loc[]>([]);
  const [contactNames, setContactNames] = useState<Record<string, string>>({});
  const [sosUserIds, setSosUserIds] = useState<Set<string>>(new Set());
  const [recenterKey, setRecenterKey] = useState(0);

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
        .select("id,full_name")
        .in("id", contactIds);
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p) => {
        map[p.id] = p.full_name ?? "Contacto";
      });
      setContactNames(map);
    } else {
      setContactNames({});
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
        <MapController center={myPos} recenterKey={recenterKey} />

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
          const online = Date.now() - new Date(l.updated_at).getTime() < 2 * 60 * 1000;
          const isSos = sosUserIds.has(l.user_id);
          return (
            <Marker
              key={l.user_id}
              position={[l.latitude, l.longitude]}
              icon={isSos ? sosIcon : contactIcon}
              zIndexOffset={isSos ? 900 : 500}
            >
              <Popup>
                <div className="text-sm space-y-1">
                  <div className="font-semibold">
                    👤 {contactNames[l.user_id] ?? l.username ?? "Contacto"}
                  </div>
                  <div className="text-xs" style={{ color: online ? COLOR_CONTACT : COLOR_SOS }}>
                    {online ? "🟢 En línea" : "⚪ Desconectado"}
                  </div>
                  {isSos && <div className="text-xs font-semibold" style={{ color: COLOR_SOS }}>🚨 Alerta SOS activa</div>}
                  <div className="text-xs">
                    📍 {l.latitude.toFixed(5)}, {l.longitude.toFixed(5)}
                  </div>
                  <div className="text-xs opacity-70">
                    🕐 {new Date(l.updated_at).toLocaleString()}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

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
