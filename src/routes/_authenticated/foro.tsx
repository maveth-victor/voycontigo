import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Star, Send, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/foro")({
  component: ForoPage,
});

type Review = {
  id: string;
  user_id: string;
  place: string;
  rating: number;
  text: string;
  category: string | null;
  risk_level: string | null;
  created_at: string;
  author?: { full_name: string | null; email: string | null };
};

function ForoPage() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [place, setPlace] = useState("");
  const [text, setText] = useState("");
  const [rating, setRating] = useState(5);
  const [category, setCategory] = useState("Zona segura");
  const [risk, setRisk] = useState("Bajo");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("forum_reviews")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (!data) return;
    const ids = Array.from(new Set(data.map((r) => r.user_id)));
    const { data: profs } = ids.length
      ? await supabase.from("profiles").select("id,full_name,email").in("id", ids)
      : { data: [] as any[] };
    const map = new Map((profs ?? []).map((p) => [p.id, p]));
    setReviews(
      data.map((r) => ({
        ...(r as any),
        author: map.get(r.user_id) ?? undefined,
      })),
    );
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("forum-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "forum_reviews" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const submit = async () => {
    if (!user) return;
    if (!place.trim() || !text.trim()) return toast.error("Completa lugar y reseña");
    setBusy(true);
    const { error } = await supabase.from("forum_reviews").insert({
      user_id: user.id,
      place: place.trim(),
      rating,
      text: text.trim(),
      category,
      risk_level: risk,
    });
    setBusy(false);
    if (error) return toast.error("No se pudo publicar");
    setPlace("");
    setText("");
    setRating(5);
    toast.success("Reseña publicada");
  };

  const fmtWhen = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" });
  };

  return (
    <div className="min-h-[100dvh] pb-24" style={{ background: "var(--gradient-soft)" }}>
      <header className="px-4 pt-6 pb-4 max-w-md mx-auto">
        <h1 className="text-2xl font-bold">Foro peruano</h1>
        <p className="text-sm text-muted-foreground">
          Reseñas globales de todos los usuarios de VoyContigo
        </p>
      </header>
      <div className="max-w-md mx-auto px-4 space-y-4">
        <div className="p-3 rounded-2xl bg-card border border-border space-y-3">
          <Input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Nombre del lugar (ej. Bodega, Farmacia...)" />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-2 rounded-xl bg-muted/50 border border-border text-sm"
            >
              <option>Zona segura</option>
              <option>Farmacia</option>
              <option>Bodega</option>
              <option>Comisaría</option>
              <option>Otro</option>
            </select>
            <select
              value={risk}
              onChange={(e) => setRisk(e.target.value)}
              className="px-3 py-2 rounded-xl bg-muted/50 border border-border text-sm"
            >
              <option>Bajo</option>
              <option>Medio</option>
              <option>Alto</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Tu calificación</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)} type="button">
                  <Star className={`w-6 h-6 ${n <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="Cuenta tu experiencia..."
            className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border text-sm outline-none resize-none focus:ring-2 focus:ring-primary/40"
          />
          <Button className="w-full gap-2" onClick={submit} disabled={busy}>
            <Send className="w-4 h-4" /> {busy ? "Publicando..." : "Publicar reseña"}
          </Button>
        </div>

        <div className="space-y-3">
          {reviews.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-8">
              Aún no hay reseñas. ¡Sé el primero!
            </div>
          )}
          {reviews.map((r) => {
            const name = r.author?.full_name ?? r.author?.email?.split("@")[0] ?? "Usuario";
            return (
              <div key={r.id} className="p-3 rounded-2xl bg-card border border-border space-y-2">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold"
                    style={{ background: "var(--gradient-brand)" }}
                  >
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{name}</div>
                    <div className="text-[11px] text-muted-foreground">{fmtWhen(r.created_at)}</div>
                  </div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={`w-4 h-4 ${n <= r.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="text-xs text-primary font-semibold flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {r.place}
                </div>
                {(r.category || r.risk_level) && (
                  <div className="flex gap-2 text-[10px]">
                    {r.category && (
                      <span className="px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
                        {r.category}
                      </span>
                    )}
                    {r.risk_level && (
                      <span
                        className={`px-2 py-0.5 rounded-full ${
                          r.risk_level === "Alto"
                            ? "bg-destructive/15 text-destructive"
                            : r.risk_level === "Medio"
                              ? "bg-yellow-500/15 text-yellow-700"
                              : "bg-green-500/15 text-green-700"
                        }`}
                      >
                        Riesgo {r.risk_level}
                      </span>
                    )}
                  </div>
                )}
                <p className="text-sm text-foreground/90 whitespace-pre-wrap">{r.text}</p>
              </div>
            );
          })}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}