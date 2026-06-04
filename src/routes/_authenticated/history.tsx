import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { BottomNav } from "@/components/BottomNav";
import { MapPin, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/history")({
  component: HistoryPage,
});

type HistRow = { id: number; latitude: number; longitude: number; recorded_at: string };

function HistoryPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<HistRow[]>([]);

  useEffect(() => {
    if (!user) return;
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    supabase
      .from("location_history")
      .select("id,latitude,longitude,recorded_at")
      .eq("user_id", user.id)
      .gte("recorded_at", since)
      .order("recorded_at", { ascending: false })
      .limit(500)
      .then(({ data }) => setRows((data as HistRow[]) ?? []));
  }, [user]);

  return (
    <div className="min-h-[100dvh] pb-24" style={{ background: "var(--gradient-soft)" }}>
      <header className="px-4 pt-6 pb-4 max-w-md mx-auto">
        <h1 className="text-2xl font-bold">Historial</h1>
        <p className="text-sm text-muted-foreground">Últimos 7 días</p>
      </header>
      <div className="max-w-md mx-auto px-4">
        <div className="bg-card rounded-2xl divide-y divide-border" style={{ boxShadow: "var(--shadow-card)" }}>
          {rows.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">Sin registros aún</div>
          )}
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3 p-3">
              <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
                <MapPin className="w-4 h-4 text-accent-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">
                  {r.latitude.toFixed(5)}, {r.longitude.toFixed(5)}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {new Date(r.recorded_at).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}