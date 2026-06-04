import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export type Coords = { latitude: number; longitude: number } | null;

export function useLocationTracker() {
  const { user } = useAuth();
  const [coords, setCoords] = useState<Coords>(null);
  const [permission, setPermission] = useState<"granted" | "denied" | "prompt" | "unknown">("unknown");
  const lastPushRef = useRef<number>(0);

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
      const { latitude, longitude } = pos.coords;
      setCoords({ latitude, longitude });
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
    });

    watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      maximumAge: 5000,
    });

    intervalId = setInterval(() => {
      navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
        enableHighAccuracy: true,
        maximumAge: 5000,
      });
    }, 10000);

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [user]);

  return { coords, permission };
}