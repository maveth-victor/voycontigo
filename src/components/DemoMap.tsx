import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const meIcon = new L.DivIcon({
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

export type DemoMarker = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  kind: "me" | "contact" | "sos";
  updated: string;
};

function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export function DemoMap({ markers }: { markers: DemoMarker[] }) {
  const me = markers.find((m) => m.kind === "me");
  const initial = useMemo<[number, number]>(
    () => (me ? [me.lat, me.lng] : [19.4326, -99.1332]),
    [],
  );
  const [center, setCenter] = useState<[number, number]>(initial);
  useEffect(() => {
    if (me) setCenter([me.lat, me.lng]);
  }, [me?.lat, me?.lng]);

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
      {markers.map((m) => (
        <Marker
          key={m.id}
          position={[m.lat, m.lng]}
          icon={m.kind === "me" ? meIcon : m.kind === "sos" ? sosIcon : contactIcon}
        >
          <Popup>
            <div className="text-sm">
              <div className="font-semibold">
                {m.kind === "sos" ? "🚨 " : ""}
                {m.name}
              </div>
              <div className="text-xs opacity-70">{m.updated}</div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}