import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { BottomNav } from "@/components/BottomNav";
import { Users, MapPin, AlertTriangle, History, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

function AdminPage() {
  const { role, loading } = useAuth();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);

  const load = async () => {
    const [p, l, a] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("locations").select("*").order("updated_at", { ascending: false }),
      supabase.from("sos_alerts").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setProfiles(p.data ?? []);
    setLocations(l.data ?? []);
    setAlerts(a.data ?? []);
  };

  useEffect(() => {
    if (role !== "admin") return;
    load();
    const ch = supabase
      .channel("admin-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "locations" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "sos_alerts" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [role]);

  if (loading) return null;
  if (role !== "admin") return <Navigate to="/map" />;

  const resolve = async (id: string) => {
    await supabase.from("sos_alerts").update({ resolved: true }).eq("id", id);
  };

  const connected = locations.filter(
    (l) => Date.now() - new Date(l.updated_at).getTime() < 60_000,
  );

  return (
    <div className="min-h-[100dvh] pb-24" style={{ background: "var(--gradient-soft)" }}>
      <header className="px-4 pt-6 pb-4 max-w-md mx-auto">
        <h1 className="text-2xl font-bold">Panel administrativo</h1>
        <p className="text-sm text-muted-foreground">Monitoreo global</p>
      </header>

      <div className="max-w-md mx-auto px-4 space-y-6">
        <div className="grid grid-cols-3 gap-3">
          <Stat icon={Users} label="Usuarios" value={profiles.length} />
          <Stat icon={MapPin} label="En línea" value={connected.length} />
          <Stat icon={AlertTriangle} label="Alertas" value={alerts.filter((a) => !a.resolved).length} />
        </div>

        <Section title="Alertas SOS activas">
          {alerts.filter((a) => !a.resolved).length === 0 ? (
            <Empty text="Sin alertas activas" />
          ) : (
            alerts
              .filter((a) => !a.resolved)
              .map((a) => {
                const p = profiles.find((p) => p.id === a.user_id);
                return (
                  <div key={a.id} className="p-3 flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-destructive-foreground"
                      style={{ background: "oklch(0.6 0.24 25)" }}
                    >
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{p?.full_name ?? "Usuario"}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(a.created_at).toLocaleString()}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => resolve(a.id)}>
                      Resolver
                    </Button>
                  </div>
                );
              })
          )}
        </Section>

        <Section title="Historial de alertas SOS">
          {alerts.length === 0 ? (
            <Empty text="Aún no se han registrado alertas" />
          ) : (
            alerts.map((a) => {
              const p = profiles.find((p) => p.id === a.user_id);
              return (
                <div key={`h-${a.id}`} className="p-3 flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${a.resolved ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}
                  >
                    {a.resolved ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <History className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {p?.full_name ?? "Usuario"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleString()} ·{" "}
                      {a.resolved ? "Resuelta" : "Activa"}
                    </div>
                    {typeof a.latitude === "number" && typeof a.longitude === "number" && (
                      <div className="text-[11px] text-muted-foreground">
                        {a.latitude.toFixed(4)}, {a.longitude.toFixed(4)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </Section>

        <Section title="Ubicaciones compartidas">
          {locations.length === 0 ? (
            <Empty text="Sin ubicaciones" />
          ) : (
            locations.map((l) => (
              <div key={l.user_id} className="p-3 flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-primary-foreground font-semibold"
                  style={{ background: "var(--gradient-brand)" }}
                >
                  {(l.username ?? "?").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{l.username}</div>
                  <div className="text-xs text-muted-foreground">
                    {l.latitude.toFixed(4)}, {l.longitude.toFixed(4)} ·{" "}
                    {new Date(l.updated_at).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </Section>

        <Section title="Usuarios registrados">
          {profiles.map((p) => (
            <div key={p.id} className="p-3 flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-secondary-foreground font-semibold"
                style={{ background: "oklch(0.55 0.2 255)" }}
              >
                {(p.full_name ?? "?").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{p.full_name}</div>
                <div className="text-xs text-muted-foreground truncate">{p.email}</div>
              </div>
            </div>
          ))}
        </Section>
      </div>
      <BottomNav />
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="bg-card rounded-2xl p-3 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
      <Icon className="w-5 h-5 mx-auto text-primary" />
      <div className="text-2xl font-bold mt-1">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
        {title}
      </h2>
      <div className="bg-card rounded-2xl divide-y divide-border" style={{ boxShadow: "var(--shadow-card)" }}>
        {children}
      </div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="p-6 text-center text-sm text-muted-foreground">{text}</div>;
}