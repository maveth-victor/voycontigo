import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X, UserPlus, Users, Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/contacts")({
  component: ContactsPage,
});

type Person = { id: string; full_name: string | null; email: string | null };
type Accepted = { id: string; contact_id: string; other?: Person };
type Pending = { id: string; created_at: string; other?: Person; direction: "in" | "out" };

function ContactsPage() {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState<Accepted[]>([]);
  const [pending, setPending] = useState<Pending[]>([]);

  const load = async () => {
    if (!user) return;
    const { data: cts } = await supabase.from("contacts").select("id,contact_id");
    const ids = (cts ?? []).map((c) => c.contact_id);
    const profilesMap = new Map<string, Person>();
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles").select("id,full_name,email").in("id", ids);
      (profs ?? []).forEach((p) => profilesMap.set(p.id, p as Person));
    }
    setAccepted((cts ?? []).map((c) => ({
      id: c.id, contact_id: c.contact_id, other: profilesMap.get(c.contact_id),
    })));

    const { data: reqs } = await supabase
      .from("contact_requests")
      .select("id,sender_id,receiver_id,created_at,status")
      .eq("status", "pending");
    const otherIds = (reqs ?? []).map((r) =>
      r.sender_id === user.id ? r.receiver_id : r.sender_id,
    );
    const map2 = new Map<string, Person>();
    if (otherIds.length) {
      const { data: profs } = await supabase
        .from("profiles").select("id,full_name,email").in("id", otherIds);
      (profs ?? []).forEach((p) => map2.set(p.id, p as Person));
    }
    setPending((reqs ?? []).map((r) => {
      const otherId = r.sender_id === user.id ? r.receiver_id : r.sender_id;
      return {
        id: r.id,
        created_at: r.created_at,
        other: map2.get(otherId),
        direction: r.sender_id === user.id ? "out" : "in",
      };
    }));
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("contacts-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "contacts" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "contact_requests" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const sendRequest = async () => {
    if (!user || !email.trim()) return;
    const target = email.trim().toLowerCase();
    if (target === (user.email ?? "").toLowerCase()) {
      return toast.error("No puedes agregarte a ti mismo");
    }
    setBusy(true);
    const { data, error } = await supabase.rpc("send_contact_request_by_email", { _email: target });
    setBusy(false);
    if (error) return toast.error("No se pudo enviar la solicitud");
    const res = data as { ok: boolean; kind?: string; error?: string } | null;
    if (!res?.ok) {
      const msg =
        res?.error === "self" ? "No puedes agregarte a ti mismo" :
        res?.error === "already_contact" ? "Este usuario ya forma parte de tus contactos." :
        res?.error === "already_pending" ? "Ya existe una solicitud pendiente con este usuario." :
        "No se pudo enviar la solicitud";
      return toast.error(msg);
    }
    setEmail("");
    if (res.kind === "invite_email") {
      toast.success("El correo no está registrado. Enviamos una invitación; cuando se registre aparecerá como solicitud automáticamente.");
    } else {
      toast.success("Solicitud enviada. La verá en Solicitudes.");
    }
    load();
  };

  const accept = async (id: string) => {
    const { error } = await supabase.from("contact_requests").update({ status: "accepted" }).eq("id", id);
    if (error) return toast.error("No se pudo aceptar");
    toast.success("Contacto aceptado");
  };
  const rejectReq = async (id: string) => {
    await supabase.from("contact_requests").update({ status: "rejected" }).eq("id", id);
  };
  const removeContact = async (id: string) => {
    const row = accepted.find((a) => a.id === id);
    if (!row || !user) return;
    await supabase.from("contacts").delete().eq("user_id", user.id).eq("contact_id", row.contact_id);
    await supabase.from("contacts").delete().eq("user_id", row.contact_id).eq("contact_id", user.id);
  };

  const appUrl = typeof window !== "undefined" ? window.location.origin : "https://voycontigo.app";
  const inviteText = (n: string) =>
    `Hola! ${n} te invita a VoyContigo, una app para cuidarse entre familia y amigos. ` +
    `Ábrelo aquí para instalarlo y registrarte: ${appUrl}/auth?ref=${user?.id ?? ""} ` +
    `Al registrarte podrás aceptar los permisos y agregarme como contacto de confianza.`;

  const sendWhatsappInvite = (phoneRaw?: string) => {
    const inviter = user?.email?.split("@")[0] ?? "Un amigo";
    const text = encodeURIComponent(inviteText(inviter));
    const digits = (phoneRaw ?? invitePhone).replace(/[^0-9]/g, "");
    const withCountry = digits.length === 9 ? `51${digits}` : digits;
    const url = withCountry ? `https://wa.me/${withCountry}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, "_blank", "noopener");
    toast.success("Abriendo WhatsApp para enviar el enlace");
  };

  const shareInvite = async () => {
    const inviter = user?.email?.split("@")[0] ?? "Un amigo";
    const text = inviteText(inviter);
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: "VoyContigo", text, url: `${appUrl}/auth?ref=${user?.id ?? ""}` });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Enlace copiado al portapapeles");
    } catch { toast.error("No se pudo copiar el enlace"); }
  };

  const pendingIn = pending.filter((p) => p.direction === "in");
  const pendingOut = pending.filter((p) => p.direction === "out");

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
            <Input type="email" placeholder="correo@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button onClick={sendRequest} disabled={busy}><UserPlus className="w-4 h-4" /></Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Si el correo ya está registrado le llega una solicitud. Si no, guardamos una invitación y aparecerá automáticamente cuando se registre.
          </p>

          <div className="mt-4 border-t border-border pt-4">
            <label className="text-sm font-medium">¿Prefieres invitar por WhatsApp?</label>
            <div className="flex gap-2 mt-2">
              <Input type="tel" inputMode="tel" placeholder="Celular (ej. 987654321)" value={invitePhone} onChange={(e) => setInvitePhone(e.target.value)} />
              <Button onClick={() => sendWhatsappInvite()} className="gap-1"><Send className="w-4 h-4" /> WhatsApp</Button>
            </div>
            <Button variant="outline" size="sm" className="mt-2 w-full" onClick={shareInvite}>
              Copiar / compartir enlace del aplicativo
            </Button>
          </div>
        </div>

        {pendingIn.length > 0 && (
          <Section title="Solicitudes recibidas">
            {pendingIn.map((c) => (
              <Row key={c.id} name={c.other?.full_name ?? "?"} email={c.other?.email ?? ""}>
                <Button size="icon" onClick={() => accept(c.id)}><Check className="w-4 h-4" /></Button>
                <Button size="icon" variant="outline" onClick={() => rejectReq(c.id)}><X className="w-4 h-4" /></Button>
              </Row>
            ))}
          </Section>
        )}

        {pendingOut.length > 0 && (
          <Section title="Solicitudes enviadas">
            {pendingOut.map((c) => (
              <Row key={c.id} name={c.other?.full_name ?? "?"} email={c.other?.email ?? ""}>
                <span className="text-xs text-muted-foreground">Pendiente</span>
                <Button size="icon" variant="outline" onClick={() => rejectReq(c.id)}><X className="w-4 h-4" /></Button>
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
                <Button size="icon" variant="outline" onClick={() => removeContact(c.id)}><X className="w-4 h-4" /></Button>
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
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">{title}</h2>
      <div className="bg-card rounded-2xl divide-y divide-border" style={{ boxShadow: "var(--shadow-card)" }}>{children}</div>
    </section>
  );
}

function Row({ name, email, children }: { name: string; email: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 p-3">
      <div className="w-10 h-10 rounded-full flex items-center justify-center text-primary-foreground font-semibold" style={{ background: "var(--gradient-brand)" }}>
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
