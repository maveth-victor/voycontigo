import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PlayCircle } from "lucide-react";
import logo from "@/assets/voycontigo-logo.png.asset.json";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const authErrorMessage = (error: { message?: string; code?: string; status?: number } | null) => {
    const code = error?.code ?? "";
    const msg = (error?.message ?? "").toLowerCase();
    if (code === "invalid_credentials" || msg.includes("invalid login credentials"))
      return "Correo o contraseña incorrectos. Verifica tus datos o usa \"¿Olvidaste tu contraseña?\".";
    if (code === "email_not_confirmed" || msg.includes("email not confirmed"))
      return "Tu correo aún no está confirmado. Revisa tu bandeja de entrada.";
    if (code === "user_not_found" || msg.includes("user not found"))
      return "No existe una cuenta con ese correo. Regístrate primero.";
    if (code === "user_already_exists" || msg.includes("already registered"))
      return "Ese correo ya tiene una cuenta. Inicia sesión con tu contraseña.";
    if (code === "over_email_send_rate_limit" || msg.includes("rate limit"))
      return "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
    if (msg.includes("failed to fetch") || msg.includes("network") || error?.status === 0)
      return "Error de conexión. Revisa tu internet e inténtalo otra vez.";
    if (error?.status && error.status >= 500)
      return "El servicio de autenticación no responde. Inténtalo en unos segundos.";
    return error?.message ?? "No se pudo iniciar sesión.";
  };
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  // Persistir el ref del enlace de invitación para que sobreviva a
  // recargas, confirmación de email o cambio de pestaña login/signup.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref && ref.length > 10) {
      try {
        localStorage.setItem("voycontigo:invite_ref", ref);
      } catch {}
    }
  }, []);

  const getRefId = () => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref && ref.length > 10) return ref;
    try {
      const saved = localStorage.getItem("voycontigo:invite_ref");
      return saved && saved.length > 10 ? saved : null;
    } catch {
      return null;
    }
  };

  if (!loading && user) {
    // Si el usuario ya está autenticado y llega con ?ref, procesar antes de salir
    const ref = getRefId();
    if (ref && ref !== user.id) {
      supabase.rpc("create_contact_invite", { _inviter_id: ref }).then(({ error }) => {
        if (!error) {
          try { localStorage.removeItem("voycontigo:invite_ref"); } catch {}
          toast.success("Tienes una nueva solicitud de contacto en Historial");
        }
      });
    }
    return <Navigate to="/map" />;
  }

  const linkInviter = async (newUserId: string) => {
    const inviter = getRefId();
    if (!inviter || inviter === newUserId) return;
    // Crea una solicitud PENDIENTE del invitador hacia el nuevo usuario
    // usando una función SECURITY DEFINER que valida auth.uid().
    try {
      const { error } = await supabase.rpc("create_contact_invite", {
        _inviter_id: inviter,
      });
      if (error) return;
      toast.success("Tienes una nueva solicitud de contacto en Historial");
      // Limpiar ?ref del URL y del almacenamiento
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("ref");
        window.history.replaceState({}, "", url.toString());
        try { localStorage.removeItem("voycontigo:invite_ref"); } catch {}
      }
    } catch {
      // Un fallo al vincular la invitación nunca debe bloquear el acceso.
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    let data: Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>["data"] | null = null;
    try {
      const res = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (res.error) {
        setBusy(false);
        return toast.error(authErrorMessage(res.error as any));
      }
      data = res.data;
    } catch (err: any) {
      setBusy(false);
      return toast.error(authErrorMessage({ message: err?.message }));
    }
    setBusy(false);
    if (!data?.session) {
      return toast.error("No se pudo crear la sesión. Vuelve a intentarlo.");
    }
    if (data.user) await linkInviter(data.user.id);
    toast.success("Bienvenido a VoyContigo");
    navigate({ to: "/map" });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      return toast.error("Ingresa tu número telefónico");
    }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/map`,
        data: { full_name: fullName, phone },
      },
    });
    if (error) {
      setBusy(false);
      return toast.error(authErrorMessage(error as any));
    }
    if (!data.session) {
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (signInErr) {
        setBusy(false);
        return toast.error(authErrorMessage(signInErr as any));
      }
      if (signInData.user) await linkInviter(signInData.user.id);
    } else if (data.user) {
      await linkInviter(data.user.id);
    }
    setBusy(false);
    toast.success("Cuenta creada. Bienvenido a VoyContigo");
    navigate({ to: "/map" });
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{ background: "var(--gradient-soft)" }}
    >
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <img
            src={logo.url}
            alt="VoyContigo"
            className="mx-auto w-24 h-24 object-contain"
          />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">VoyContigo</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Seguridad y rastreo en tiempo real
            </p>
          </div>
        </div>

        <div className="bg-card rounded-2xl p-6" style={{ boxShadow: "var(--shadow-card)" }}>
          <Tabs defaultValue="login">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
              <TabsTrigger value="signup">Registrarse</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Correo</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Entrando..." : "Entrar"}
                </Button>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline w-full text-center"
                  onClick={async () => {
                    if (!email) return toast.error("Ingresa tu correo primero");
                    const { error } = await supabase.auth.resetPasswordForEmail(email, {
                      redirectTo: `${window.location.origin}/reset-password`,
                    });
                    if (error) return toast.error(error.message);
                    toast.success("Te enviamos un correo para restablecer tu contraseña");
                  }}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="fullname">Nombre completo</Label>
                  <Input id="fullname" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Número telefónico (obligatorio)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    required
                    placeholder="Ej. 987654321"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email2">Correo</Label>
                  <Input id="email2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password2">Contraseña</Label>
                  <Input id="password2" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Creando..." : "Crear cuenta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        <Link
          to="/demo"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-card border border-border text-sm font-medium hover:bg-accent transition-colors"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <PlayCircle className="w-4 h-4 text-primary" />
          Ver demo sin registrarse
        </Link>
      </div>
    </div>
  );
}