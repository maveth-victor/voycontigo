import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, AlertTriangle, MessagesSquare } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/grupo")({
  component: GrupoPage,
});

type Msg = { id: string; author: string; text: string; t: string; kind: "text" | "sos" };

function GrupoPage() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<{ id: string; name: string }[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([
    { id: "m0", author: "Sistema", text: "Bienvenido a tu grupo VoyContigo. Aquí puedes chatear y pedir ayuda al grupo.", t: "", kind: "text" },
  ]);
  const [text, setText] = useState("");
  const me = user?.email?.split("@")[0] ?? "Yo";

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("contacts")
        .select("*")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
      if (!data) return;
      const ids = data.map((c) => (c.requester_id === user.id ? c.addressee_id : c.requester_id));
      if (ids.length === 0) return;
      const { data: profs } = await supabase.from("profiles").select("id,full_name").in("id", ids);
      setContacts((profs ?? []).map((p) => ({ id: p.id, name: p.full_name ?? "?" })));
    })();
  }, [user]);

  const nowT = () => new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });

  const send = () => {
    const v = text.trim();
    if (!v) return;
    setMsgs((m) => [...m, { id: `m${Date.now()}`, author: me, text: v, t: nowT(), kind: "text" }]);
    setText("");
  };

  const groupSos = async () => {
    setMsgs((m) => [...m, { id: `s${Date.now()}`, author: me, text: "🚨 ¡Necesito ayuda! Revisen mi ubicación.", t: nowT(), kind: "sos" }]);
    if (user) {
      await supabase.from("sos_alerts").insert({ user_id: user.id, message: "Alerta al grupo VoyContigo" });
    }
    toast.error("Alerta enviada al grupo");
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try { new Notification("VoyContigo SOS", { body: `${me} necesita ayuda del grupo` }); } catch {}
    }
  };

  return (
    <div className="min-h-[100dvh] pb-24 flex flex-col" style={{ background: "var(--gradient-soft)" }}>
      <header className="px-4 pt-6 pb-3 max-w-md mx-auto w-full">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessagesSquare className="w-6 h-6 text-primary" /> Grupo
        </h1>
        <p className="text-sm text-muted-foreground">
          {contacts.length} contacto{contacts.length === 1 ? "" : "s"} en tu grupo
        </p>
      </header>

      <div className="max-w-md mx-auto w-full px-4 flex-1 flex flex-col gap-3">
        <div className="flex-1 overflow-y-auto space-y-2 p-3 rounded-2xl bg-card border border-border min-h-[300px]">
          {msgs.map((m) => (
            <div key={m.id} className={`p-2.5 rounded-2xl text-sm max-w-[85%] ${
              m.kind === "sos" ? "bg-destructive/10 border border-destructive/40 text-destructive" :
              m.author === me ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"
            }`}>
              <div className="text-[10px] font-semibold opacity-70">{m.author} {m.t}</div>
              <div>{m.text}</div>
            </div>
          ))}
        </div>

        <Button variant="destructive" className="gap-2" onClick={groupSos}>
          <AlertTriangle className="w-4 h-4" /> Pedir ayuda al grupo
        </Button>

        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2 pb-2">
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribe al grupo..." />
          <Button type="submit" size="icon"><Send className="w-4 h-4" /></Button>
        </form>
      </div>
      <BottomNav />
    </div>
  );
}