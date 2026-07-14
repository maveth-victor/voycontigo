import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Star, Send, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/foro")({
  component: ForoPage,
});

type Review = { id: string; author: string; place: string; rating: number; text: string; when: string };

const SEED: Review[] = [
  { id: "r1", author: "María P.", place: "Bodega Don José – San Isidro", rating: 5, text: "Muy amable, me dejaron esperar dentro cuando estaba lloviendo. 100% recomendado como zona segura.", when: "Hace 2 h" },
  { id: "r2", author: "Luis A.", place: "Farmacia InkaFarma – Miraflores", rating: 4, text: "Personal atento las 24 h, buena iluminación. Ideal como punto de encuentro.", when: "Ayer" },
];

function ForoPage() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>(SEED);
  const [place, setPlace] = useState("");
  const [text, setText] = useState("");
  const [rating, setRating] = useState(5);

  const submit = () => {
    if (!place.trim() || !text.trim()) return toast.error("Completa lugar y reseña");
    setReviews((rs) => [
      { id: `r${Date.now()}`, author: user?.email?.split("@")[0] ?? "Tú", place: place.trim(), rating, text: text.trim(), when: "Ahora" },
      ...rs,
    ]);
    setPlace("");
    setText("");
    setRating(5);
    toast.success("Reseña publicada");
  };

  return (
    <div className="min-h-[100dvh] pb-24" style={{ background: "var(--gradient-soft)" }}>
      <header className="px-4 pt-6 pb-4 max-w-md mx-auto">
        <h1 className="text-2xl font-bold">Foro peruano</h1>
        <p className="text-sm text-muted-foreground">Reseñas de lugares y zonas seguras</p>
      </header>
      <div className="max-w-md mx-auto px-4 space-y-4">
        <div className="p-3 rounded-2xl bg-card border border-border space-y-3">
          <Input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Nombre del lugar (ej. Bodega, Farmacia...)" />
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
          <Button className="w-full gap-2" onClick={submit}>
            <Send className="w-4 h-4" /> Publicar reseña
          </Button>
        </div>

        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="p-3 rounded-2xl bg-card border border-border space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold" style={{ background: "var(--gradient-brand)" }}>
                  {r.author[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{r.author}</div>
                  <div className="text-[11px] text-muted-foreground">{r.when}</div>
                </div>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className={`w-4 h-4 ${n <= r.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                  ))}
                </div>
              </div>
              <div className="text-xs text-primary font-semibold flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {r.place}
              </div>
              <p className="text-sm text-foreground/90">{r.text}</p>
            </div>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}