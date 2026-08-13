import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export type Coords = { latitude: number; longitude: number; accuracy?: number } | null;

const isValidCoord = (lat: number, lng: number) =>
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  !(lat === 0 && lng === 0) &&
  lat >= -90 &&
  lat <= 90 &&
  lng >= -180 &&
  lng <= 180;

export function useLocationTracker() {
  const { user } = useAuth();
  const [coords, setCoords] = useState<Coords>(null);
  const [permission, setPermission] = useState<"granted" | "denied" | "prompt" | "unknown">("unknown");
  const lastPushRef = useRef<number>(0);
  const bestRef = useRef<{ accuracy: number; time: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    if (!("geolocation" in navigator)) {
      setPermission("denied");
      toast.error("Tu dispositivo no soporta geolocalización");
      return;
    }

    let watchId: number | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const pushLocation = async (lat: number, lng: number) => {
      const now = Date.now();
      if (now - lastPushRef.current < 9000) return;
      lastPushRef.current = now;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      const username = profile?.full_name ?? user.email ?? "Usuario";

      await supabase.from("locations").upsert({
        user_id: user.id,
        username,
        latitude: lat,
        longitude: lng,
        updated_at: new Date().toISOString(),
      });
      await supabase.from("location_history").insert({
        user_id: user.id,
        latitude: lat,
        longitude: lng,
      });
    };

    const handleSuccess = (pos: GeolocationPosition) => {
      setPermission("granted");
      const { latitude, longitude, accuracy } = pos.coords;
      if (!isValidCoord(latitude, longitude)) return;

      const acc = Number.isFinite(accuracy) ? accuracy : 9999;
      const now = Date.now();
      const best = bestRef.current;
      // Descarta lecturas mucho menos precisas (p. ej. IP/wifi) si ya tenemos un fix reciente y mejor
      if (best && now - best.time < 30000 && acc > best.accuracy * 2.5 && acc > 100) return;
      bestRef.current = { accuracy: acc, time: now };

      setCoords({ latitude, longitude, accuracy: acc });
      pushLocation(latitude, longitude);
    };

    const handleError = (err: GeolocationPositionError) => {
      if (err.code === err.PERMISSION_DENIED) {
        setPermission("denied");
        toast.error("Permiso de ubicación denegado");
      }
    };

    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 20000,
    });

    watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 30000,
    });

    intervalId = setInterval(() => {
      navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 20000,
      });
    }, 10000);

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [user]);

  return { coords, permission };
}