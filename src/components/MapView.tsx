import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const COLOR_ME = "#2563eb";
const COLOR_CONTACT = "#16a34a";
const COLOR_SOS = "#dc2626";
const COLOR_OFF = "#d4d4d8";

const userIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:9999px;background:${COLOR_ME};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});
const contactIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:9999px;background:${COLOR_CONTACT};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});
const sosIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:22px;height:22px;border-radius:9999px;background:${COLOR_SOS};border:3px solid white;box-shadow:0 0 0 6px rgba(220,38,38,0.3)"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

type Loc = {
  user_id: string;
  username: string;
  latitude: number;
  longitude: number;
  updated_at: string;
};

function Recenter({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, map.getZoom() < 13 ? 14 : map.getZoom());
  }, [center, map]);
  return null;
}

export function MapView({ center }: { center: [number, number] | null }) {
  const { user } = useAuth();
  const [locations, setLocations] = useState<Loc[]>([]);
  const [offline, setOffline] = useState<Array<{ id: string; name: string }>>([]);
  const [sosCoords, setSosCoords] = useState<Array<{ id: string; lat: number; lng: number; username: string }>>([]);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const { data } = await supabase.from("locations").select("*");
      if (data) setLocations(data as Loc[]);

      // Contactos autorizados sin coordenadas registradas -> "Ubicación no disponible"
      const { data: cs } = await supabase
        .from("contacts")
        .select("contact_id")
        .eq("user_id", user.id);
      const withCoords = new Set((data ?? []).map((l) => l.user_id));
      const missing = (cs ?? []).map((c) => c.contact_id).filter((id) => !withCoords.has(id));
      if (missing.length === 0) {
        setOffline([]);
      } else {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id,full_name")
          .in("id", missing);
        setOffline((profs ?? []).map((p) => ({ id: p.id, name: p.full_name ?? "Usuario" })));
      }
    };
    load();

    const ch = supabase
      .channel("locations-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "locations" },
        () => load(),
      )
      .subscribe();

    const loadSos = async () => {
      const { data } = await supabase
        .from("sos_alerts")
        .select("id,user_id,latitude,longitude,resolved")
        .eq("resolved", false);
      if (!data) return;
      const enriched = await Promise.all(
        data
          .filter((s) => s.latitude && s.longitude)
          .map(async (s) => {
            const { data: p } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", s.user_id)
              .maybeSingle();
            return { id: s.id, lat: s.latitude!, lng: s.longitude!, username: p?.full_name ?? "Usuario" };
          }),
      );
      setSosCoords(enriched);
    };
    loadSos();

    const ch2 = supabase
      .channel("sos-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sos_alerts" },
        () => loadSos(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
      supabase.removeChannel(ch2);
    };
  }, [user]);

  const initial = useMemo<[number, number]>(() => center ?? [19.4326, -99.1332], [center]);

  return (
    <div className="relative h-full w-full">
    <MapContainer
      center={initial}
      zoom={14}
      className="h-full w-full"
      style={{ background: "var(--color-muted)" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Recenter center={center} />
      {locations.map((l) => {
        const isMe = l.user_id === user?.id;
        const online = Date.now() - new Date(l.updated_at).getTime() < 2 * 60 * 1000;
        return (
          <Marker
            key={l.user_id}
            position={[l.latitude, l.longitude]}
            icon={isMe ? userIcon : contactIcon}
          >
            <Popup>
              <div className="text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex w-7 h-7 rounded-full items-center justify-center text-[11px] font-bold text-white"
                    style={{ background: isMe ? COLOR_ME : COLOR_CONTACT }}
                  >
                    {(l.username ?? "U").slice(0, 2).toUpperCase()}
                  </span>
                  <span className="font-semibold">{l.username}</span>
                </div>
                <div className="text-xs">
                  Estado:{" "}
                  <span style={{ color: online ? COLOR_CONTACT : COLOR_SOS }}>
                    {online ? "En línea" : "Desconectado"}
                  </span>
                </div>
                <div className="text-xs">
                  Última ubicación: {l.latitude.toFixed(5)}, {l.longitude.toFixed(5)}
                </div>
                <div className="text-xs opacity-70">
                  Actualizado: {new Date(l.updated_at).toLocaleString()}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
      {sosCoords.map((s) => (
        <Marker key={s.id} position={[s.lat, s.lng]} icon={sosIcon}>
          <Popup>
            <div className="text-sm">
              <div className="font-semibold text-destructive">🚨 SOS</div>
              <div>{s.username}</div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>

      <div
        className="absolute z-[1000] rounded-xl border border-border bg-card/95 backdrop-blur px-3 py-2 shadow-lg pointer-events-none max-w-[45vw]"
        style={{ bottom: 15, right: 15 }}
      >
        <div className="text-[10px] font-bold tracking-wider text-muted-foreground mb-1.5">
          LEYENDA
        </div>
        <ul className="space-y-1">
          {[
            { c: COLOR_ME, t: "Mi ubicación" },
            { c: COLOR_CONTACT, t: "Persona agregada" },
            { c: COLOR_SOS, t: "Alerta / emergencia" },
            { c: COLOR_OFF, t: "Ubicación no disponible" },
          ].map((i) => (
            <li key={i.t} className="flex items-center gap-2 text-[11px] leading-none">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 border border-white"
                style={{ background: i.c }}
              />
              <span className="truncate">{i.t}</span>
            </li>
          ))}
        </ul>
        {offline.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border">
            <div className="text-[10px] text-muted-foreground mb-1">Sin ubicación</div>
            <ul className="space-y-0.5">
              {offline.slice(0, 4).map((o) => (
                <li key={o.id} className="flex items-center gap-2 text-[11px] leading-none">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 border border-white"
                    style={{ background: COLOR_OFF }}
                  />
                  <span className="truncate">{o.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}