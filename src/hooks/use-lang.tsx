import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "es" | "en" | "qu" | "pt" | "fr" | "el";

export const LANGS: { code: Lang; label: string; name: string }[] = [
  { code: "es", label: "ES", name: "Español" },
  { code: "en", label: "EN", name: "English" },
  { code: "qu", label: "QU", name: "Runa Simi (Quechua)" },
  { code: "pt", label: "PT", name: "Português" },
  { code: "fr", label: "FR", name: "Français" },
  { code: "el", label: "ÉL", name: "Ελληνικά" },
];

const ES: Record<string, string> = {
  tabMap: "Mapa",
  tabContacts: "Contactos",
  tabGroup: "Grupo",
  tabSos: "SOS",
  tabForum: "Foro",
  tabPremium: "Premium",
  tabHistory: "Historial",
  tabAdmin: "Admin",
  logout: "Salir",
  adminTitle: "Panel administrativo",
  adminSubtitle: "Monitoreo global",
  configureProfile: "Configurar perfil",
  saveProfile: "Guardar perfil",
  language: "Idioma",
  languageHint: "El idioma seleccionado se guarda en este dispositivo.",
  activeUsers: "Usuarios activos",
  active: "Activo",
  inactive: "Inactivo",
  fullName: "Nombre completo",
  phone: "Teléfono",
  email: "Correo electrónico",
  address: "Dirección",
  birthDate: "Fecha de nacimiento",
  bloodType: "Tipo de sangre",
  medicalNotes: "Notas médicas / emergencia",
  medicalPrivate: "Información privada: solo tú y tus contactos autorizados pueden verla.",
  tapPhoto: "Toca la foto para cambiarla",
  profileSaved: "Perfil guardado correctamente",
  emergencyContacts: "Contactos de emergencia",
  authorizedContact: "Contacto autorizado",
  emergencyLines: "Líneas de emergencia",
  emergencyButton: "BOTÓN DE EMERGENCIA",
  alertState: "Estado: ALERTA",
  normalState: "Estado: normal",
  sosSent: "Alerta SOS enviada a tus contactos",
  noContacts: "Aún no tienes contactos autorizados",
  callAction: "Llamar",
  messageAction: "Mensaje",
};

const OVERRIDES: Partial<Record<Lang, Record<string, string>>> = {
  en: {
    tabMap: "Map", tabContacts: "Contacts", tabGroup: "Group", tabForum: "Forum",
    tabHistory: "History", logout: "Sign out",
    adminTitle: "Admin panel", adminSubtitle: "Global monitoring",
    configureProfile: "Edit profile", saveProfile: "Save profile", language: "Language",
    languageHint: "The selected language is stored on this device.",
    activeUsers: "Active users", active: "Active", inactive: "Inactive",
    fullName: "Full name", phone: "Phone", email: "Email", address: "Address",
    birthDate: "Date of birth", bloodType: "Blood type",
    medicalNotes: "Medical / emergency notes",
    medicalPrivate: "Private info: only you and your authorized contacts can see it.",
    tapPhoto: "Tap the photo to change it", profileSaved: "Profile saved successfully",
    emergencyContacts: "Emergency contacts", authorizedContact: "Authorized contact",
    emergencyLines: "Emergency lines", emergencyButton: "EMERGENCY BUTTON",
    alertState: "Status: ALERT", normalState: "Status: normal",
    sosSent: "SOS alert sent to your contacts", noContacts: "You have no authorized contacts yet",
    callAction: "Call", messageAction: "Message",
  },
  pt: {
    tabMap: "Mapa", tabContacts: "Contatos", tabGroup: "Grupo", tabForum: "Fórum",
    tabHistory: "Histórico", logout: "Sair",
    adminTitle: "Painel administrativo", adminSubtitle: "Monitoramento global",
    configureProfile: "Configurar perfil", saveProfile: "Salvar perfil", language: "Idioma",
    activeUsers: "Usuários ativos", active: "Ativo", inactive: "Inativo",
    emergencyContacts: "Contatos de emergência", emergencyLines: "Linhas de emergência",
    emergencyButton: "BOTÃO DE EMERGÊNCIA", callAction: "Ligar", messageAction: "Mensagem",
  },
  fr: {
    tabMap: "Carte", tabContacts: "Contacts", tabGroup: "Groupe", tabForum: "Forum",
    tabHistory: "Historique", logout: "Quitter",
    adminTitle: "Panneau d'administration", adminSubtitle: "Surveillance globale",
    configureProfile: "Configurer le profil", saveProfile: "Enregistrer", language: "Langue",
    activeUsers: "Utilisateurs actifs", active: "Actif", inactive: "Inactif",
    emergencyContacts: "Contacts d'urgence", emergencyLines: "Numéros d'urgence",
    emergencyButton: "BOUTON D'URGENCE", callAction: "Appeler", messageAction: "Message",
  },
  qu: {
    tabMap: "Mapa", tabContacts: "Riqsisqakuna", tabGroup: "Huñu", tabForum: "Rimanakuy",
    tabHistory: "Ñawpaq", logout: "Lloqsiy",
    adminTitle: "Kamachiq panel", activeUsers: "Kawsaq runakuna",
    active: "Kawsachkan", inactive: "Samachkan",
    configureProfile: "Willakuyta allichay", saveProfile: "Waqaychay",
    emergencyButton: "YANAPAY ÑITINA", callAction: "Waqyay", messageAction: "Willay",
  },
  el: {
    tabMap: "Χάρτης", tabContacts: "Επαφές", tabGroup: "Ομάδα", tabForum: "Φόρουμ",
    tabHistory: "Ιστορικό", logout: "Έξοδος",
    adminTitle: "Πίνακας διαχείρισης", activeUsers: "Ενεργοί χρήστες",
    active: "Ενεργός", inactive: "Ανενεργός",
    configureProfile: "Ρύθμιση προφίλ", saveProfile: "Αποθήκευση",
    emergencyButton: "ΚΟΥΜΠΙ ΕΚΤΑΚΤΗΣ ΑΝΑΓΚΗΣ", callAction: "Κλήση", messageAction: "Μήνυμα",
  },
};

const STORAGE_KEY = "voycontigo-lang";

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: string, vars?: Record<string, string | number>) => string;
}

const Ctx = createContext<LangCtx>({ lang: "es", setLang: () => {}, t: (k) => ES[k] ?? k });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("es");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (saved && LANGS.some((l) => l.code === saved)) setLangState(saved);
    } catch {}
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch {}
  };

  const t = (k: string, vars?: Record<string, string | number>) => {
    let s = OVERRIDES[lang]?.[k] ?? ES[k] ?? k;
    if (vars) for (const [vk, vv] of Object.entries(vars)) s = s.replace(`{${vk}}`, String(vv));
    return s;
  };

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export const useT = () => useContext(Ctx);
