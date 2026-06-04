import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const userIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:9999px;background:oklch(0.52 0.21 290);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});
const contactIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:9999px;background:oklch(0.55 0.2 255);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});
const sosIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:22px;height:22px;border-radius:9999px;background:oklch(0.6 0.24 25);border:3px solid white;box-shadow:0 0 0 6px oklch(0.6 0.24 25 / 0.3)"></div>`,
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
  const [sosCoords, setSosCoords] = useState<Array<{ id: string; lat: number; lng: number; username: string }>>([]);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const { data } = await supabase.from("locations").select("*");
      if (data) setLocations(data as Loc[]);
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
      {locations.map((l) => (
        <Marker
          key={l.user_id}
          position={[l.latitude, l.longitude]}
          icon={l.user_id === user?.id ? userIcon : contactIcon}
        >
          <Popup>
            <div className="text-sm">
              <div className="font-semibold">{l.username}</div>
              <div className="text-xs opacity-70">
                {new Date(l.updated_at).toLocaleString()}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
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
  );
}