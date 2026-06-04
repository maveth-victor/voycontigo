import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/contacts")({
  component: ContactsPage,
});

type ContactRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  other?: { id: string; full_name: string; email: string | null };
};

function ContactsPage() {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<ContactRow[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("contacts")
      .select("*")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
    if (!data) return;
    const enriched = await Promise.all(
      data.map(async (c) => {
        const otherId = c.requester_id === user.id ? c.addressee_id : c.requester_id;
        const { data: p } = await supabase
          .from("profiles")
          .select("id,full_name,email")
          .eq("id", otherId)
          .maybeSingle();
        return { ...c, other: p ?? undefined } as ContactRow;
      }),
    );
    setItems(enriched);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("contacts-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "contacts" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const sendRequest = async () => {
    if (!user || !email.trim()) return;
    setBusy(true);
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();
    if (!profile) {
      setBusy(false);
      return toast.error("No se encontró un usuario con ese correo");
    }
    if (profile.id === user.id) {
      setBusy(false);
      return toast.error("No puedes agregarte a ti mismo");
    }
    const { error } = await supabase
      .from("contacts")
      .insert({ requester_id: user.id, addressee_id: profile.id });
    setBusy(false);
    if (error) return toast.error("Ya existe una solicitud con ese contacto");
    setEmail("");
    toast.success("Solicitud enviada");
  };

  const accept = async (id: string) => {
    await supabase.from("contacts").update({ status: "accepted" }).eq("id", id);
    toast.success("Contacto aceptado");
  };
  const remove = async (id: string) => {
    await supabase.from("contacts").delete().eq("id", id);
  };

  const pendingIn = items.filter((c) => c.status === "pending" && c.addressee_id === user?.id);
  const pendingOut = items.filter((c) => c.status === "pending" && c.requester_id === user?.id);
  const accepted = items.filter((c) => c.status === "accepted");

  return (
    <div className="min-h-[100dvh] pb-24" style={{ background: "var(--gradient-soft)" }}>
      <header className="px-4 pt-6 pb-4 max-w-md mx-auto">
        <h1 className="text-2xl font-bold">Contactos</h1>
        <p className="text-sm text-muted-foreground">Personas autorizadas para ver tu ubicación</p>
      </header>

      <div className="max-w-md mx-auto px-4 space-y-6">
        <div className="bg-card rounded-2xl p-4" style={{ boxShadow: "var(--shadow-card)" }}>
          <label className="text-sm font-medium">Añadir contacto por correo</label>
          <div className="flex gap-2 mt-2">
            <Input
              type="email"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button onClick={sendRequest} disabled={busy}>
              <UserPlus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {pendingIn.length > 0 && (
          <Section title="Solicitudes recibidas">
            {pendingIn.map((c) => (
              <Row key={c.id} name={c.other?.full_name ?? "?"} email={c.other?.email ?? ""}>
                <Button size="icon" variant="default" onClick={() => accept(c.id)}>
                  <Check className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="outline" onClick={() => remove(c.id)}>
                  <X className="w-4 h-4" />
                </Button>
              </Row>
            ))}
          </Section>
        )}

        {pendingOut.length > 0 && (
          <Section title="Solicitudes enviadas">
            {pendingOut.map((c) => (
              <Row key={c.id} name={c.other?.full_name ?? "?"} email={c.other?.email ?? ""}>
                <span className="text-xs text-muted-foreground">Pendiente</span>
                <Button size="icon" variant="outline" onClick={() => remove(c.id)}>
                  <X className="w-4 h-4" />
                </Button>
              </Row>
            ))}
          </Section>
        )}

        <Section title="Mis contactos">
          {accepted.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8 flex flex-col items-center gap-2">
              <Users className="w-8 h-8 opacity-40" />
              Aún no tienes contactos
            </div>
          ) : (
            accepted.map((c) => (
              <Row key={c.id} name={c.other?.full_name ?? "?"} email={c.other?.email ?? ""}>
                <Button size="icon" variant="outline" onClick={() => remove(c.id)}>
                  <X className="w-4 h-4" />
                </Button>
              </Row>
            ))
          )}
        </Section>
      </div>
      <BottomNav />
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

function Row({ name, email, children }: { name: string; email: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 p-3">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-primary-foreground font-semibold"
        style={{ background: "var(--gradient-brand)" }}
      >
        {name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{name}</div>
        <div className="text-xs text-muted-foreground truncate">{email}</div>
      </div>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}