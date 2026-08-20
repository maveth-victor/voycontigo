import { Link, useRouterState } from "@tanstack/react-router";
import { Map, Users, History, Shield, LogOut, MessagesSquare, AlertTriangle, MessageSquare, Crown } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useT } from "@/hooks/use-lang";

export function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { role, signOut } = useAuth();
  const { t } = useT();

  const items: Array<{ to: string; icon: typeof Map; label: string }> = [
    { to: "/map", icon: Map, label: t("tabMap") },
    { to: "/contacts", icon: Users, label: t("tabContacts") },
    { to: "/grupo", icon: MessagesSquare, label: t("tabGroup") },
    { to: "/sos", icon: AlertTriangle, label: t("tabSos") },
    { to: "/foro", icon: MessageSquare, label: t("tabForum") },
    { to: "/premium", icon: Crown, label: t("tabPremium") },
    { to: "/history", icon: History, label: t("tabHistory") },
  ];
  if (role === "admin") items.push({ to: "/admin", icon: Shield, label: t("tabAdmin") });

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 bg-card/95 backdrop-blur border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="max-w-3xl mx-auto flex items-center justify-around px-1 py-2 overflow-x-auto">
        {items.map(({ to, icon: Icon, label }) => {
          const active = path === to;
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl transition-colors shrink-0 ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className={`w-5 h-5 ${to === "/sos" ? "text-destructive" : ""}`} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => signOut()}
          className="flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl text-muted-foreground shrink-0"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[10px] font-medium">{t("logout")}</span>
        </button>
      </div>
    </nav>
  );
}