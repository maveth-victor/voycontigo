import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { BottomNav } from "@/components/BottomNav";
import { MapPin, Clock, UserPlus, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/history")({
  component: HistoryPage,
});

type HistRow = { id: number; latitude: number; longitude: number; recorded_at: string };

type PendingReq = {
  id: string;
  requester_id: string;
  created_at: string;
  requester?: { full_name: string | null; email: string | null };
};

function HistoryPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<HistRow[]>([]);
  const [pending, setPending] = useState<PendingReq[]>([]);

  const loadPending = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("contacts")
      .select("id,requester_id,created_at")
      .eq("addressee_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (!data) return setPending([]);
    const enriched = await Promise.all(
      data.map(async (c) => {
        const { data: p } = await supabase
          .from("profiles")
          .select("full_name,email")
          .eq("id", c.requester_id)
          .maybeSingle();
        return { ...c, requester: p ?? undefined } as PendingReq;
      }),
    );
    setPending(enriched);
  };

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
    loadPending();
    const ch = supabase
      .channel("history-contacts-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contacts" },
        () => loadPending(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const accept = async (id: string, name: string) => {
    const { error } = await supabase.from("contacts").update({ status: "accepted" }).eq("id", id);
    if (error) return toast.error("No se pudo aceptar");
    toast.success(`Ahora eres contacto de ${name}`);
  };
  const reject = async (id: string) => {
    const { error } = await supabase.from("contacts").delete().eq("id", id);
    if (error) return toast.error("No se pudo rechazar");
    toast.success("Solicitud rechazada");
  };

  return (
    <div className="min-h-[100dvh] pb-24" style={{ background: "var(--gradient-soft)" }}>
      <header className="px-4 pt-6 pb-4 max-w-md mx-auto">
        <h1 className="text-2xl font-bold">Historial</h1>
        <p className="text-sm text-muted-foreground">Solicitudes y ubicaciones recientes</p>
      </header>
      <div className="max-w-md mx-auto px-4 space-y-6">
        {pending.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
              Solicitudes de contacto
            </h2>
            <div className="space-y-2">
              {pending.map((p) => {
                const name = p.requester?.full_name ?? p.requester?.email ?? "Alguien";
                return (
                  <div
                    key={p.id}
                    className="bg-card rounded-2xl p-3 flex items-center gap-3"
                    style={{ boxShadow: "var(--shadow-card)" }}
                  >
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold shrink-0"
                      style={{ background: "var(--gradient-brand)" }}
                    >
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate flex items-center gap-1">
                        <UserPlus className="w-3 h-3 text-primary" /> {name} desea agregarte
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {new Date(p.created_at).toLocaleString()} · Pendiente
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" onClick={() => accept(p.id, name)}>
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="outline" onClick={() => reject(p.id)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
            Ubicaciones (últimos 7 días)
          </h2>
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
        </section>
      </div>
      <BottomNav />
    </div>
  );
}