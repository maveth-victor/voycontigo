import { Link, useRouterState } from "@tanstack/react-router";
import { Map, Users, History, Shield, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { role, signOut } = useAuth();

  const items: Array<{ to: string; icon: typeof Map; label: string }> = [
    { to: "/map", icon: Map, label: "Mapa" },
    { to: "/contacts", icon: Users, label: "Contactos" },
    { to: "/history", icon: History, label: "Historial" },
  ];
  if (role === "admin") items.push({ to: "/admin", icon: Shield, label: "Admin" });

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 bg-card/95 backdrop-blur border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="max-w-md mx-auto flex items-center justify-around px-2 py-2">
        {items.map(({ to, icon: Icon, label }) => {
          const active = path === to;
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => signOut()}
          className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-muted-foreground"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[10px] font-medium">Salir</span>
        </button>
      </div>
    </nav>
  );
}