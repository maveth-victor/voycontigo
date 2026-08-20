import { useEffect, useState } from "react";
import { Camera, Save, Settings, X, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useT } from "@/hooks/use-lang";

type Form = {
  full_name: string;
  phone: string;
  email: string;
  address: string;
  avatar_url: string;
  birth_date: string;
  blood_type: string;
  medical_notes: string;
};

const EMPTY: Form = {
  full_name: "", phone: "", email: "", address: "",
  avatar_url: "", birth_date: "", blood_type: "", medical_notes: "",
};

export function ProfileSettingsSheet({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const { t } = useT();
  const [form, setForm] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: e }] = await Promise.all([
        supabase.from("profiles").select("full_name,phone,email,address,avatar_url").eq("id", user.id).maybeSingle(),
        supabase.from("emergency_profiles").select("birth_date,blood_type,medical_notes").eq("user_id", user.id).maybeSingle(),
      ]);
      setForm({
        full_name: p?.full_name ?? "",
        phone: p?.phone ?? "",
        email: p?.email ?? user.email ?? "",
        address: (p as { address?: string | null } | null)?.address ?? "",
        avatar_url: (p as { avatar_url?: string | null } | null)?.avatar_url ?? "",
        birth_date: e?.birth_date ?? "",
        blood_type: e?.blood_type ?? "",
        medical_notes: e?.medical_notes ?? "",
      });
      setLoading(false);
    })();
  }, [user?.id]);

  const onAvatar = (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    if (f.size > 400_000) return toast.error("La imagen debe pesar menos de 400 KB");
    const r = new FileReader();
    r.onload = () => set("avatar_url", r.result as string);
    r.readAsDataURL(f);
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error: pe } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name.trim() || (user.email ?? "Usuario"),
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        avatar_url: form.avatar_url || null,
      })
      .eq("id", user.id);
    const { error: ee } = await supabase.from("emergency_profiles").upsert({
      user_id: user.id,
      birth_date: form.birth_date || null,
      blood_type: form.blood_type.trim() || null,
      medical_notes: form.medical_notes.trim() || null,
    });
    setSaving(false);
    if (pe || ee) return toast.error(pe?.message ?? ee?.message ?? "No se pudo guardar");
    toast.success(t("profileSaved"));
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-card border border-border rounded-t-3xl sm:rounded-3xl p-5 space-y-3"
        style={{ boxShadow: "var(--shadow-card)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Settings className="w-4 h-4" /> {t("configureProfile")}
          </h3>
          <button onClick={onClose} aria-label="Cerrar" className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Cargando perfil...</div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer relative">
                <input type="file" accept="image/*" className="hidden" onChange={(e) => onAvatar(e.target.files)} />
                {form.avatar_url ? (
                  <img src={form.avatar_url} alt="Foto de perfil" className="w-16 h-16 rounded-full object-cover" />
                ) : (
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-primary-foreground font-bold text-xl"
                    style={{ background: "var(--gradient-brand)" }}
                  >
                    {(form.full_name || "?").charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  <Camera className="w-3 h-3" />
                </span>
              </label>
              <div className="text-xs text-muted-foreground">{t("tapPhoto")}</div>
            </div>

            {([
              { k: "full_name" as const, label: t("fullName") },
              { k: "phone" as const, label: t("phone"), type: "tel", ph: "+51 9XX XXX XXX" },
              { k: "email" as const, label: t("email"), type: "email", disabled: true },
              { k: "address" as const, label: t("address") },
              { k: "birth_date" as const, label: t("birthDate"), type: "date" },
              { k: "blood_type" as const, label: t("bloodType"), ph: "O+" },
            ]).map((f) => (
              <div key={f.k} className="space-y-1">
                <label className="text-xs text-muted-foreground">{f.label}</label>
                <Input
                  type={f.type ?? "text"}
                  placeholder={f.ph}
                  disabled={f.disabled}
                  value={form[f.k]}
                  onChange={(e) => set(f.k, e.target.value)}
                />
              </div>
            ))}

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t("medicalNotes")}</label>
              <textarea
                value={form.medical_notes}
                onChange={(e) => set("medical_notes", e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              />
            </div>

            <div className="flex items-start gap-2 text-[11px] text-muted-foreground p-3 rounded-xl bg-primary/5 border border-primary/20">
              <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
              <span>{t("medicalPrivate")}</span>
            </div>

            <Button onClick={save} disabled={saving} className="w-full gap-2">
              <Save className="w-4 h-4" /> {saving ? "Guardando..." : t("saveProfile")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
