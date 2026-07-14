import { createFileRoute } from "@tanstack/react-router";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Crown, Shield, MapPin, Radio, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/premium")({
  component: PremiumPage,
});

const ITEMS = [
  { id: "prem", icon: Crown, name: "VoyContigo Premium", desc: "Historial ilimitado, alertas prioritarias, sin anuncios.", price: 19.9, badge: "Más popular" },
  { id: "fam", icon: Users, name: "VoyContigo Familiar", desc: "Hasta 6 miembros con rastreo y alertas compartidas.", price: 34.9 },
  { id: "grp", icon: Users, name: "Grupos ilimitados", desc: "Crea todos los grupos de chat que necesites.", price: 9.9 },
  { id: "gps", icon: MapPin, name: "Llavero GPS", desc: "Dispositivo físico para mochila o llaves con SOS integrado.", price: 89.0 },
  { id: "band", icon: Radio, name: "Panic Band Pro", desc: "Pulsera con botón de pánico conectada por Bluetooth.", price: 129.0 },
  { id: "shield", icon: Shield, name: "Zonas Seguras Pro", desc: "Notificaciones al entrar/salir de zonas seguras.", price: 14.9 },
];

function formatSol(n: number) {
  return `S/ ${n.toFixed(2).replace(/\.00$/, "")}`;
}

function PremiumPage() {
  return (
    <div className="min-h-[100dvh] pb-24" style={{ background: "var(--gradient-soft)" }}>
      <header className="px-4 pt-6 pb-4 max-w-md mx-auto">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Crown className="w-6 h-6 text-primary" /> Acciones Premium
        </h1>
        <p className="text-sm text-muted-foreground">Precios en soles peruanos (S/).</p>
      </header>
      <div className="max-w-md mx-auto px-4 space-y-3">
        {ITEMS.map((it) => (
          <div key={it.id} className="flex items-start gap-3 p-3 rounded-2xl bg-card border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0" style={{ background: "var(--gradient-brand)" }}>
              <it.icon className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="font-semibold text-sm truncate">{it.name}</div>
                {it.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold shrink-0">{it.badge}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{it.desc}</p>
              <div className="flex items-center justify-between mt-2">
                <div className="text-base font-bold text-primary">{formatSol(it.price)}</div>
                <Button size="sm" onClick={() => toast.success(`Pedido: ${it.name}`, { description: `Total: ${formatSol(it.price)}` })}>
                  Comprar
                </Button>
              </div>
            </div>
          </div>
        ))}
        <p className="text-[11px] text-muted-foreground text-center pt-2">
          Envío gratuito a Lima Metropolitana en compras mayores a S/ 80.
        </p>
      </div>
      <BottomNav />
    </div>
  );
}