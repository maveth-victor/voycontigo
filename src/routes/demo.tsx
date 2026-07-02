import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as React from "react";
import { ClientOnly } from "@tanstack/react-router";
import {
  Shield,
  MapPin,
  Map as MapIcon,
  Users,
  History as HistoryIcon,
  ShieldCheck,
  ArrowLeft,
  Siren,
  CheckCircle2,
  Clock,
  Phone,
  MessageCircle,
  AlertTriangle,
  HeartPulse,
  ChevronRight,
  Star,
  MessageSquare,
  Camera,
  Send,
  X,
  UserPlus,
  User as UserIcon,
  Navigation,
  Route as RouteIcon,
  Settings,
  Save,
} from "lucide-react";
import { Gamepad2, Languages, Store, Home, Cross, Crown, MessagesSquare, ShoppingBag, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { DemoMarker } from "@/components/DemoMap";

const DemoMap = lazy(() =>
  import("@/components/DemoMap").then((m) => ({ default: m.DemoMap })),
);

export const Route = createFileRoute("/demo")({
  ssr: false,
  component: DemoPage,
});

type Tab = "map" | "contacts" | "history" | "sos" | "forum" | "game" | "admin" | "premium" | "group";

// ============================================================================
// i18n: idiomas para TODA la app demo
// ============================================================================
type Lang = "es" | "en" | "qu" | "pt" | "fr" | "it" | "de";
const DICT: Record<Lang, Record<string, string>> = {} as Record<Lang, Record<string, string>>;
const _BASE_DICT: Partial<Record<Lang, Record<string, string>>> = {
  es: {
    appTitle: "SafeTrack · Demo",
    back: "Volver",
    demoBadge: "DEMO",
    tabMap: "Mapa",
    tabContacts: "Contactos",
    tabSos: "SOS",
    tabForum: "Foro",
    tabGame: "Juego",
    tabHistory: "Historial",
    tabAdmin: "Admin",
    language: "Idioma",
    legend: "Leyenda",
    you: "Tú",
    contacts: "Contactos",
    sosAlert: "Alerta SOS",
    authorizedContacts: "Contactos autorizados",
    new: "Nuevo",
    close: "Cerrar",
    addContact: "Agregar contacto",
    fullName: "Nombre",
    phone: "Teléfono",
    save: "Guardar contacto",
    realAppHint: "En la app real puedes enviar y aceptar solicitudes por correo.",
    history7: "Historial (últimos 7 días)",
    askHelp: "Pedir ayuda",
    emergencyHint: "En una emergencia, presiona el botón para alertar a tus contactos.",
    emergencyBtn: "BOTÓN DE EMERGENCIA",
    alertSent: "Alerta enviada",
    sentToParents: "Tus padres y contactos han sido notificados",
    holdHint: "Mantén presionado 3 segundos en la app real",
    sosActiveTitle: "Alerta SOS activa",
    sentTo: "Enviada a {n} contactos",
    emergencyContacts: "Contactos de emergencia",
    authorizedContact: "Contacto autorizado",
    emergencyLines: "Líneas de emergencia",
    demoFooter: "Esta es una demostración. En la app real, la alerta comparte tu ubicación en tiempo real con tus contactos de confianza.",
    safeZonesTitle: "Zonas seguras cercanas",
    safeZonesHint: "Tiendas, farmacias y vecinos voluntarios registrados para ofrecer refugio inmediato.",
    storeKind: "Tienda",
    pharmacyKind: "Farmacia",
    neighborKind: "Vecino voluntario",
    goNow: "Ir ahora",
    forumTitle: "Foro de reseñas",
    ratePlace: "Califica un lugar",
    yourRating: "Tu calificación",
    placePh: "Nombre del lugar (p. ej. Parque Kennedy)",
    expPh: "¿Cómo fue tu experiencia? ¿Te sentiste seguro?",
    uploadPhotos: "Subir fotos",
    publish: "Publicar",
    needPlace: "Agrega el lugar y tu reseña",
    published: "Reseña publicada",
    profile: "Perfil",
    adminTitle: "Panel administrativo",
    connected: "Conectados",
    locationsLbl: "Ubicaciones",
    alerts: "Alertas",
    activeUsers: "Usuarios activos",
    online: "En línea",
    sosReceived: "Tú (Demo) — recibida ahora",
    farFromYou: "Lejos de ti",
    lastDeparture: "Último lugar de partida",
    dailyDistance: "Distancia recorrida hoy",
    metersAccum: "{n} metros acumulados durante el día",
    profileLbl: "Perfil",
    relation: "Relación:",
    phoneLbl: "Teléfono:",
    emailLbl: "Email:",
    addressLbl: "Dirección:",
    call: "Llamar",
    message: "Mensaje",
    follow: "Seguir en vivo",
    needHelpToast: "Alerta: {name} necesita ayuda",
    redDotHint: "Toca el punto rojo en el mapa para ver su ubicación.",
    sosToContacts: "🚨 Alerta SOS enviada a tus contactos",
    gameTitle: "SafeTrack Runner",
    nextLevel: "Siguiente nivel",
    levelDone: "¡Nivel superado!",
    gameDone: "¡Felicidades, completaste el juego!",
    finalScore: "Puntaje final: {n}",
    playAgain: "Jugar de nuevo",
    gameOver: "Game Over",
    retry: "Reintentar",
    jump: "SALTAR",
    keyboardHint: "Controles: ←/→ para moverte · Espacio o ↑ para saltar",
    level: "Nivel",
  },
  en: {
    appTitle: "SafeTrack · Demo",
    back: "Back",
    demoBadge: "DEMO",
    tabMap: "Map",
    tabContacts: "Contacts",
    tabSos: "SOS",
    tabForum: "Forum",
    tabGame: "Game",
    tabHistory: "History",
    tabAdmin: "Admin",
    language: "Language",
    legend: "Legend",
    you: "You",
    contacts: "Contacts",
    sosAlert: "SOS Alert",
    authorizedContacts: "Authorized contacts",
    new: "New",
    close: "Close",
    addContact: "Add contact",
    fullName: "Name",
    phone: "Phone",
    save: "Save contact",
    realAppHint: "In the real app you can send and accept requests by email.",
    history7: "History (last 7 days)",
    askHelp: "Ask for help",
    emergencyHint: "In an emergency, press the button to alert your contacts.",
    emergencyBtn: "EMERGENCY BUTTON",
    alertSent: "Alert sent",
    sentToParents: "Your parents and contacts have been notified",
    holdHint: "Hold 3 seconds in the real app",
    sosActiveTitle: "Active SOS alert",
    sentTo: "Sent to {n} contacts",
    emergencyContacts: "Emergency contacts",
    authorizedContact: "Authorized contact",
    emergencyLines: "Emergency lines",
    demoFooter: "This is a demo. In the real app, the alert shares your live location with your trusted contacts.",
    safeZonesTitle: "Nearby safe zones",
    safeZonesHint: "Stores, pharmacies and volunteer neighbors registered to offer immediate shelter.",
    storeKind: "Store",
    pharmacyKind: "Pharmacy",
    neighborKind: "Volunteer neighbor",
    goNow: "Go now",
    forumTitle: "Reviews forum",
    ratePlace: "Rate a place",
    yourRating: "Your rating",
    placePh: "Place name (e.g. Kennedy Park)",
    expPh: "How was your experience? Did you feel safe?",
    uploadPhotos: "Upload photos",
    publish: "Publish",
    needPlace: "Add place and review",
    published: "Review published",
    profile: "Profile",
    adminTitle: "Admin panel",
    connected: "Connected",
    locationsLbl: "Locations",
    alerts: "Alerts",
    activeUsers: "Active users",
    online: "Online",
    sosReceived: "You (Demo) — received now",
    farFromYou: "Distance from you",
    lastDeparture: "Last departure point",
    dailyDistance: "Distance traveled today",
    metersAccum: "{n} meters accumulated today",
    profileLbl: "Profile",
    relation: "Relation:",
    phoneLbl: "Phone:",
    emailLbl: "Email:",
    addressLbl: "Address:",
    call: "Call",
    message: "Message",
    follow: "Live follow",
    needHelpToast: "Alert: {name} needs help",
    redDotHint: "Tap the red dot on the map to see their location.",
    sosToContacts: "🚨 SOS alert sent to your contacts",
    gameTitle: "SafeTrack Runner",
    nextLevel: "Next level",
    levelDone: "Level completed!",
    gameDone: "Congrats, you finished the game!",
    finalScore: "Final score: {n}",
    playAgain: "Play again",
    gameOver: "Game Over",
    retry: "Retry",
    jump: "JUMP",
    keyboardHint: "Controls: ←/→ to move · Space or ↑ to jump",
    level: "Level",
  },
  qu: {
    appTitle: "SafeTrack · Qhawana",
    back: "Kutiy",
    demoBadge: "QHAWANA",
    tabMap: "Mapa",
    tabContacts: "Riqsisqakuna",
    tabSos: "SOS",
    tabForum: "Rimaynin",
    tabGame: "Pukllay",
    tabHistory: "Ñawpaq",
    tabAdmin: "Kamachiq",
    language: "Simi",
    legend: "Sutichana",
    you: "Qam",
    contacts: "Riqsisqakuna",
    sosAlert: "SOS Willakuy",
    authorizedContacts: "Saqisqa riqsisqakuna",
    new: "Musuq",
    close: "Wisq'ay",
    addContact: "Riqsisqata yapay",
    fullName: "Suti",
    phone: "Telefonu",
    save: "Riqsisqata waqaychay",
    realAppHint: "Cheqaq aplikasyunpiqa email-warmi mañakuy atiwaqmi.",
    history7: "Ñawpaq ruwasqa (qanchis p'unchaw)",
    askHelp: "Yanapayta mañay",
    emergencyHint: "Sasachakuypi, riqsisqakunaman willanapaq ñit'iy.",
    emergencyBtn: "SASACHAKUY ÑIT'INA",
    alertSent: "Willakuy apachisqa",
    sentToParents: "Tayta-mamayki, riqsisqakuna willasqaña",
    holdHint: "Cheqaq aplikasyunpi 3 segundo hap'iy",
    sosActiveTitle: "SOS willakuy kachkan",
    sentTo: "{n} riqsisqakunaman apachisqa",
    emergencyContacts: "Sasachakuy riqsisqakuna",
    authorizedContact: "Saqisqa riqsisqa",
    emergencyLines: "Sasachakuy telefonukuna",
    demoFooter: "Kayqa qhawanallam. Cheqaq aplikasyunpiqa, willakuy kawsayniyki mama qhawasqaykita riqsisqaykiman willan.",
    safeZonesTitle: "Qaylla allin k'itikuna",
    safeZonesHint: "Qhatukuna, hampi qhatukuna, voluntario wasimasikuna chaski kanapaq qillqasqa.",
    storeKind: "Qhatu",
    pharmacyKind: "Hampi Qhatu",
    neighborKind: "Voluntario wasimasi",
    goNow: "Kunan riy",
    forumTitle: "Rimanakuy",
    ratePlace: "K'itita chaninchay",
    yourRating: "Chaniyki",
    placePh: "K'itip sutin (kikinraq Parque Kennedy)",
    expPh: "¿Imayna karqa? ¿Allinta karqankichu?",
    uploadPhotos: "Fotokunata wichachiy",
    publish: "Willay",
    needPlace: "K'itita, rimayniyki yapay",
    published: "Rimaynin willasqa",
    profile: "Runap willakuynin",
    adminTitle: "Kamachiq qhawana",
    connected: "Tinkisqakuna",
    locationsLbl: "K'itikuna",
    alerts: "Willakuykuna",
    activeUsers: "Llamkaq runakuna",
    online: "Kawsachkan",
    sosReceived: "Qam (Qhawana) — kunan chaskisqa",
    farFromYou: "Karu qammanta",
    lastDeparture: "Qhipan lluqsina k'iti",
    dailyDistance: "P'unchaw purisqa",
    metersAccum: "{n} metro p'unchawpi",
    profileLbl: "Runap willakuynin",
    relation: "Riqsiy:",
    phoneLbl: "Telefonu:",
    emailLbl: "Email:",
    addressLbl: "Tiyana:",
    call: "Waqyay",
    message: "Willay",
    follow: "Kawsay qatiy",
    needHelpToast: "Willakuy: {name} yanapayta munan",
    redDotHint: "Mapapi puka muyuta ñit'iy k'itinta qhawanapaq.",
    sosToContacts: "🚨 SOS willakuy riqsisqaykiman apachisqa",
    gameTitle: "SafeTrack Runner",
    nextLevel: "Hina nivel",
    levelDone: "¡Nivel atisqa!",
    gameDone: "¡Allinmi, pukllayta tukunki!",
    finalScore: "Tukuy puntaje: {n}",
    playAgain: "Wakmanta pukllay",
    gameOver: "Tukusqa",
    retry: "Wakmanta",
    jump: "P'ITAY",
    keyboardHint: "Kamachiy: ←/→ kuyuy · Espacio utaq ↑ p'itay",
    level: "Nivel",
  },
};
Object.assign(DICT, _BASE_DICT);
// Fallback languages inherit from English until fully translated
DICT.pt = { ...DICT.en, appTitle: "SafeTrack · Demo", back: "Voltar", tabMap: "Mapa", tabContacts: "Contatos", tabForum: "Fórum", tabGame: "Jogo", tabHistory: "Histórico", tabAdmin: "Admin", language: "Idioma", legend: "Legenda", you: "Você", contacts: "Contatos", sosAlert: "Alerta SOS", new: "Novo", close: "Fechar", addContact: "Adicionar contato", fullName: "Nome", phone: "Telefone", save: "Salvar contato", askHelp: "Pedir ajuda", emergencyBtn: "BOTÃO DE EMERGÊNCIA", alertSent: "Alerta enviada", safeZonesTitle: "Zonas seguras próximas", goNow: "Ir agora", forumTitle: "Fórum de avaliações", publish: "Publicar", published: "Avaliação publicada", profile: "Perfil", adminTitle: "Painel de admin", connected: "Conectados", alerts: "Alertas", online: "Online", follow: "Seguir ao vivo", needHelpToast: "Alerta: {name} precisa de ajuda", jump: "PULAR", level: "Nível", playAgain: "Jogar de novo", retry: "Tentar" };
DICT.fr = { ...DICT.en, appTitle: "SafeTrack · Démo", back: "Retour", tabMap: "Carte", tabContacts: "Contacts", tabForum: "Forum", tabGame: "Jeu", tabHistory: "Historique", tabAdmin: "Admin", language: "Langue", legend: "Légende", you: "Toi", contacts: "Contacts", sosAlert: "Alerte SOS", new: "Nouveau", close: "Fermer", addContact: "Ajouter un contact", fullName: "Nom", phone: "Téléphone", save: "Enregistrer", askHelp: "Demander de l'aide", emergencyBtn: "BOUTON D'URGENCE", alertSent: "Alerte envoyée", safeZonesTitle: "Zones sûres à proximité", goNow: "Y aller", forumTitle: "Forum d'avis", publish: "Publier", published: "Avis publié", profile: "Profil", adminTitle: "Panneau admin", connected: "Connectés", alerts: "Alertes", online: "En ligne", follow: "Suivre en direct", needHelpToast: "Alerte : {name} a besoin d'aide", jump: "SAUTER", level: "Niveau", playAgain: "Rejouer", retry: "Réessayer" };
DICT.it = { ...DICT.en, appTitle: "SafeTrack · Demo", back: "Indietro", tabMap: "Mappa", tabContacts: "Contatti", tabForum: "Forum", tabGame: "Gioco", tabHistory: "Cronologia", tabAdmin: "Admin", language: "Lingua", legend: "Legenda", you: "Tu", contacts: "Contatti", sosAlert: "Allarme SOS", new: "Nuovo", close: "Chiudi", addContact: "Aggiungi contatto", fullName: "Nome", phone: "Telefono", save: "Salva contatto", askHelp: "Chiedi aiuto", emergencyBtn: "PULSANTE DI EMERGENZA", alertSent: "Allarme inviato", safeZonesTitle: "Zone sicure vicine", goNow: "Vai ora", forumTitle: "Forum recensioni", publish: "Pubblica", published: "Recensione pubblicata", profile: "Profilo", adminTitle: "Pannello admin", connected: "Connessi", alerts: "Allarmi", online: "Online", follow: "Segui dal vivo", needHelpToast: "Allarme: {name} ha bisogno di aiuto", jump: "SALTA", level: "Livello", playAgain: "Rigioca", retry: "Riprova" };
DICT.de = { ...DICT.en, appTitle: "SafeTrack · Demo", back: "Zurück", tabMap: "Karte", tabContacts: "Kontakte", tabForum: "Forum", tabGame: "Spiel", tabHistory: "Verlauf", tabAdmin: "Admin", language: "Sprache", legend: "Legende", you: "Du", contacts: "Kontakte", sosAlert: "SOS-Alarm", new: "Neu", close: "Schließen", addContact: "Kontakt hinzufügen", fullName: "Name", phone: "Telefon", save: "Kontakt speichern", askHelp: "Hilfe rufen", emergencyBtn: "NOTFALLKNOPF", alertSent: "Alarm gesendet", safeZonesTitle: "Sichere Zonen in der Nähe", goNow: "Jetzt hin", forumTitle: "Bewertungsforum", publish: "Veröffentlichen", published: "Bewertung veröffentlicht", profile: "Profil", adminTitle: "Admin-Panel", connected: "Verbunden", alerts: "Alarme", online: "Online", follow: "Live folgen", needHelpToast: "Alarm: {name} braucht Hilfe", jump: "SPRINGEN", level: "Level", playAgain: "Nochmal spielen", retry: "Erneut" };

const LangCtx = React.createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: string, vars?: Record<string, string | number>) => string }>({
  lang: "es",
  setLang: () => {},
  t: (k) => k,
});

function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return "es";
    return (localStorage.getItem("safetrack-lang") as Lang) || "es";
  });
  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem("safetrack-lang", l); } catch {}
  };
  const t = (k: string, vars?: Record<string, string | number>) => {
    let s = DICT[lang][k] ?? DICT.es[k] ?? k;
    if (vars) for (const [vk, vv] of Object.entries(vars)) s = s.replace(`{${vk}}`, String(vv));
    return s;
  };
  return <LangCtx.Provider value={{ lang, setLang, t }}>{children}</LangCtx.Provider>;
}
function useT() { return React.useContext(LangCtx); }

// Safe zones cerca de Lima
type SafeZone = { id: string; name: string; kind: "store" | "pharmacy" | "neighbor"; address: string; lat: number; lng: number };
const SAFE_ZONES: SafeZone[] = [
  { id: "sz1", name: "Bodega Don Pepe", kind: "store", address: "Av. Larco 245, Miraflores", lat: -12.1208, lng: -77.0301 },
  { id: "sz2", name: "Inkafarma Pardo", kind: "pharmacy", address: "Av. Pardo 410, Miraflores", lat: -12.1225, lng: -77.0322 },
  { id: "sz3", name: "Sra. Rosa (vecina voluntaria)", kind: "neighbor", address: "Calle Berlín 380, Miraflores", lat: -12.1248, lng: -77.0287 },
  { id: "sz4", name: "Mifarma Larcomar", kind: "pharmacy", address: "Malecón de la Reserva 610", lat: -12.1318, lng: -77.0309 },
  { id: "sz5", name: "Tienda La Esquina", kind: "store", address: "Av. Arequipa 1820, Lince", lat: -12.0935, lng: -77.0356 },
  { id: "sz6", name: "Familia Quispe (voluntarios)", kind: "neighbor", address: "Jr. Risso 240, Lince", lat: -12.0908, lng: -77.0331 },
];

type Review = {
  id: string;
  author: string;
  place: string;
  rating: number;
  text: string;
  photos: string[];
  when: string;
};

const seedReviews: Review[] = [
  {
    id: "r1",
    author: "María López",
    place: "Parque Kennedy, Miraflores",
    rating: 5,
    text: "Muy seguro de día, bien iluminado y con serenazgo. Ideal para caminar.",
    photos: [],
    when: "Hoy 13:20",
  },
  {
    id: "r2",
    author: "Carlos Pérez",
    place: "Jr. de la Unión 880, Cercado de Lima",
    rating: 4,
    text: "Bastante movimiento y cámaras. De noche prefiero ir acompañado.",
    photos: [],
    when: "Ayer 20:05",
  },
  {
    id: "r3",
    author: "Ana Torres",
    place: "Barranco Malecón, Lima",
    rating: 5,
    text: "Ambiente bohemio y tranquilo, me sentí muy segura. Recomendadísimo.",
    photos: [],
    when: "Lun 18:40",
  },
];

const baseContacts: DemoMarker[] = [
  { id: "c1", name: "María López", kind: "contact", lat: -12.0480, lng: -77.0410, updated: "hace 12 s" },
  { id: "c2", name: "Carlos Pérez", kind: "contact", lat: -12.0510, lng: -77.0380, updated: "hace 8 s" },
  { id: "c3", name: "Ana Torres", kind: "contact", lat: -12.0440, lng: -77.0455, updated: "hace 5 s" },
];

const historyLog = [
  { t: "Hoy 14:32", place: "Av. Larco 345, Miraflores", lat: -12.1212, lng: -77.0298 },
  { t: "Hoy 13:10", place: "Parque Kennedy, Miraflores", lat: -12.1219, lng: -77.0294 },
  { t: "Ayer 19:45", place: "Av. Pardo y Aliaga 120, San Isidro", lat: -12.0966, lng: -77.0376 },
  { t: "Ayer 09:12", place: "Jr. de la Unión 880, Cercado de Lima", lat: -12.0501, lng: -77.0334 },
  { t: "Lun 18:20", place: "Malecón de Barranco, Lima", lat: -12.1469, lng: -77.0238 },
];

type DemoProfile = {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  bloodType: string;
  birthdate: string;
  emergencyNote: string;
  avatar: string | null;
};

const defaultProfile: DemoProfile = {
  fullName: "Tú (Demo)",
  phone: "+51 987 654 321",
  email: "demo@safetrack.app",
  address: "Av. Arequipa 1234, Lince, Lima",
  bloodType: "O+",
  birthdate: "1995-08-12",
  emergencyNote: "Alergia a la penicilina. Contactar a María López.",
  avatar: null,
};

function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(s)));
}

function bearingLabel(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dy = b.lat - a.lat;
  const dx = b.lng - a.lng;
  const deg = (Math.atan2(dx, dy) * 180) / Math.PI;
  const dirs = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  return dirs[Math.round(((deg + 360) % 360) / 45) % 8];
}

const streetSets: Record<string, string[]> = {
  c1: ["Av. Insurgentes Sur", "Av. Álvaro Obregón", "Calle Orizaba"],
  c2: ["Paseo de la Reforma", "Av. Juárez", "Eje Central"],
  c3: ["Av. México", "Parque México", "Av. Michoacán"],
};

function streetsFor(id: string): string[] {
  return (
    streetSets[id] ?? ["Av. Reforma", "Av. Insurgentes", "Calle Génova"]
  );
}

const contactDetails: Record<
  string,
  { phone: string; email: string; address: string; dailyMeters: number; relation: string; lastDeparture: string }
> = {
  c1: {
    phone: "+51 987 112 233",
    email: "maria.lopez@safetrack.app",
    address: "Av. Larco 345, Miraflores, Lima",
    dailyMeters: 4820,
    relation: "Familiar",
    lastDeparture: "Parque Kennedy, Miraflores",
  },
  c2: {
    phone: "+51 956 778 991",
    email: "carlos.perez@safetrack.app",
    address: "Jr. de la Unión 880, Cercado de Lima",
    dailyMeters: 7310,
    relation: "Amigo",
    lastDeparture: "Plaza San Martín, Cercado de Lima",
  },
  c3: {
    phone: "+51 934 455 667",
    email: "ana.torres@safetrack.app",
    address: "Av. Pardo y Aliaga 120, San Isidro, Lima",
    dailyMeters: 2640,
    relation: "Compañera de trabajo",
    lastDeparture: "Óvalo Gutiérrez, San Isidro",
  },
};

function detailsFor(id: string) {
  return (
    contactDetails[id] ?? {
      phone: "+51 900 000 000",
      email: "contacto@safetrack.app",
      address: "Ubicación no registrada",
      dailyMeters: 1500 + (id.charCodeAt(0) % 50) * 100,
      relation: "Contacto",
      lastDeparture: "Lima, Perú",
    }
  );
}

function DemoPage() {
  return (
    <LangProvider>
      <DemoPageInner />
    </LangProvider>
  );
}

function DemoPageInner() {
  const { t, lang, setLang } = useT();
  const [tab, setTab] = useState<Tab>("map");
  const [me, setMe] = useState({ lat: -12.0464, lng: -77.0428 });
  const [contacts, setContacts] = useState(baseContacts);
  const [sos, setSos] = useState<DemoMarker | null>(null);
  const [sosContactId, setSosContactId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [selectedUser, setSelectedUser] = useState<DemoMarker | null>(null);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [profile, setProfile] = useState<DemoProfile>(defaultProfile);
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [trails, setTrails] = useState<Record<string, [number, number][]>>(() =>
    Object.fromEntries(baseContacts.map((c) => [c.id, [[c.lat, c.lng]]])),
  );
  const [chatContact, setChatContact] = useState<DemoMarker | null>(null);

  // Simulate live movement every 2s
  useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => t + 1);
      setMe((p) => ({
        lat: p.lat + (Math.random() - 0.5) * 0.0008,
        lng: p.lng + (Math.random() - 0.5) * 0.0008,
      }));
      setContacts((cs) =>
        cs.map((c) => {
          const next = {
            ...c,
            lat: c.lat + (Math.random() - 0.5) * 0.0006,
            lng: c.lng + (Math.random() - 0.5) * 0.0006,
          };
          setTrails((tr) => {
            const prev = tr[c.id] ?? [[c.lat, c.lng] as [number, number]];
            const updated = [...prev, [next.lat, next.lng] as [number, number]].slice(-40);
            return { ...tr, [c.id]: updated };
          });
          return next;
        }),
      );
    }, 2000);
    return () => clearInterval(id);
  }, []);

  const markers = useMemo<DemoMarker[]>(() => {
    const all: DemoMarker[] = [
      { id: "me", name: "Tú (Demo)", kind: "me", lat: me.lat, lng: me.lng, updated: "ahora" },
      ...contacts.map((c) =>
        c.id === sosContactId ? { ...c, kind: "sos" as const, updated: "¡SOS ahora!" } : c,
      ),
    ];
    if (sos) all.push(sos);
    return all;
  }, [me, contacts, sos, sosContactId, tick]);

  // Pedir permiso de notificaciones del navegador en la demo
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, []);

  const triggerContactSos = (contactId: string) => {
    const c = contacts.find((x) => x.id === contactId);
    if (!c) return;
    setSosContactId(contactId);
    const msg = t("needHelpToast", { name: c.name });
    toast.error(`🚨 ${msg}`, {
      description: t("redDotHint"),
      duration: 8000,
    });
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        new Notification("🚨 SOS SafeTrack", {
          body: msg,
          tag: `sos-${contactId}`,
        });
      } catch {}
    }
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try { navigator.vibrate?.([200, 100, 200, 100, 400]); } catch {}
    }
    setTimeout(() => setSosContactId((cur) => (cur === contactId ? null : cur)), 12000);
  };

  const triggerSos = () => {
    setSos({
      id: "sos1",
      name: "Alerta SOS · Tú",
      kind: "sos",
      lat: me.lat,
      lng: me.lng,
      updated: new Date().toLocaleTimeString(),
    });
    toast.error(t("sosToContacts"));
    setTimeout(() => setSos(null), 8000);
  };

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-background">
      {/* Header */}
      <header
        className="absolute top-0 inset-x-0 z-30 px-4 pt-3 pb-3"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
      >
        <div
          className="max-w-md mx-auto flex items-center gap-2 px-3 py-2 rounded-2xl bg-card/95 backdrop-blur"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <Link
            to="/auth"
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted text-muted-foreground"
            aria-label={t("back")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "var(--gradient-brand)" }}
          >
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold leading-tight truncate">
              {t("appTitle")}
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3" />
              {me.lat.toFixed(4)}, {me.lng.toFixed(4)}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-wrap justify-end max-w-[180px]">
            {(["es","en","qu","pt","fr","it","de"] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`text-[10px] font-bold px-1.5 py-1 rounded-md ${lang===l?"bg-primary text-primary-foreground":"bg-muted text-muted-foreground"}`}
                aria-label={`lang ${l}`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="absolute inset-0 pt-[88px] pb-20">
        {tab === "map" && (
          <div className="relative h-full w-full">
            <ClientOnly fallback={<div className="h-full w-full bg-muted" />}>
              <Suspense fallback={<div className="h-full w-full bg-muted" />}>
                <DemoMap markers={markers} />
              </Suspense>
            </ClientOnly>
            <MapLegend
              markers={markers}
              me={me}
              onSelect={(m) => setSelectedUser(m)}
              onSosContact={triggerContactSos}
              sosContactId={sosContactId}
            />
          </div>
        )}
        {tab === "contacts" && (
          <ContactsPanel
            contacts={contacts}
            setContacts={setContacts}
            onOpen={(c) => setSelectedUser(c)}
          />
        )}
        {tab === "history" && <HistoryPanel />}
        {tab === "sos" && <SosPanel me={me} onTriggerSos={triggerSos} sosActive={!!sos} />}
        {tab === "forum" && <ForumPanel />}
        {tab === "game" && <GamePanel />}
        {tab === "admin" && (
          <AdminPanel
            contactsCount={contacts.length}
            sosActive={!!sos}
            contacts={contacts}
            onOpenUser={(c) => setSelectedUser(c)}
            onConfigureProfile={() => setShowProfileEditor(true)}
            profile={profile}
          />
        )}
      </div>

      {/* Bottom Nav (demo) */}
      <nav
        className="fixed bottom-0 inset-x-0 z-50 bg-card/95 backdrop-blur border-t border-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="max-w-md mx-auto flex items-center justify-around px-2 py-2">
          {[
            { id: "map" as Tab, icon: MapIcon, label: t("tabMap") },
            { id: "contacts" as Tab, icon: Users, label: t("tabContacts") },
            { id: "sos" as Tab, icon: Siren, label: t("tabSos") },
            { id: "forum" as Tab, icon: MessageSquare, label: t("tabForum") },
            { id: "game" as Tab, icon: Gamepad2, label: t("tabGame") },
            { id: "history" as Tab, icon: HistoryIcon, label: t("tabHistory") },
            { id: "admin" as Tab, icon: ShieldCheck, label: t("tabAdmin") },
          ].map(({ id, icon: Icon, label }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {selectedUser && (
        <UserProfileSheet
          user={selectedUser}
          me={me}
          onFollow={(c) => { setTrackingId(c.id); setSelectedUser(null); }}
          onClose={() => setSelectedUser(null)}
        />
      )}
      {trackingId && (
        <TrackingView
          contact={contacts.find((c) => c.id === trackingId)!}
          trail={trails[trackingId] ?? []}
          onClose={() => setTrackingId(null)}
        />
      )}
      {showProfileEditor && (
        <ProfileEditorSheet
          profile={profile}
          onSave={(p) => {
            setProfile(p);
            setShowProfileEditor(false);
            toast.success("Perfil actualizado");
          }}
          onClose={() => setShowProfileEditor(false)}
        />
      )}
    </div>
  );
}

function MapLegend({
  markers,
  me,
  onSelect,
  onSosContact,
  sosContactId,
}: {
  markers: DemoMarker[];
  me: { lat: number; lng: number };
  onSelect: (m: DemoMarker) => void;
  onSosContact: (contactId: string) => void;
  sosContactId: string | null;
}) {
  const items = markers.filter((m) => m.kind !== "me");
  return (
    <div className="absolute left-3 bottom-3 z-[400] max-w-[15rem] rounded-2xl bg-card/95 backdrop-blur border border-border p-3 space-y-2"
      style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="text-[11px] font-semibold uppercase text-muted-foreground">
        Leyenda
      </div>
      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow" />
          Tú
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow" />
          Contactos
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow" />
          Alerta SOS
        </div>
      </div>
      {items.length > 0 && (
        <div className="pt-1 border-t border-border space-y-1 max-h-32 overflow-y-auto">
          {items.map((m) => (
            <div
              key={m.id}
              className="w-full flex items-center justify-between gap-1 px-1 py-1 rounded-lg hover:bg-muted"
            >
              <button
                onClick={() => onSelect(m)}
                className="flex items-center gap-2 min-w-0 flex-1 text-left"
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    m.kind === "sos" ? "bg-red-500 animate-pulse" : "bg-emerald-500"
                  }`}
                />
                <span className="text-xs truncate">{m.name}</span>
                <span className="text-[10px] text-muted-foreground shrink-0 ml-auto">
                  {haversineMeters(me, m)} m
                </span>
              </button>
              {m.kind !== "sos" && sosContactId !== m.id && (
                <button
                  onClick={() => onSosContact(m.id)}
                  title={`Simular SOS de ${m.name}`}
                  className="shrink-0 w-6 h-6 rounded-md bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white flex items-center justify-center"
                >
                  <Siren className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UserProfileSheet({
  user,
  me,
  onClose,
  onFollow,
}: {
  user: DemoMarker;
  me: { lat: number; lng: number };
  onClose: () => void;
  onFollow?: (u: DemoMarker) => void;
}) {
  const { t } = useT();
  const dist = haversineMeters(me, user);
  const dir = bearingLabel(me, user);
  const info = detailsFor(user.id);
  const distKm = (dist / 1000).toFixed(2);
  const dailyKm = (info.dailyMeters / 1000).toFixed(2);
  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative z-[10000] w-full max-w-md max-h-[90vh] overflow-y-auto bg-card border border-border rounded-t-3xl sm:rounded-3xl p-5 space-y-4"
        style={{ boxShadow: "var(--shadow-card)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
            style={{ background: "var(--gradient-brand)" }}
          >
            {user.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{user.name}</div>
            <div className="text-xs text-muted-foreground capitalize">
              {user.kind === "sos" ? "Alerta de emergencia" : "Contacto autorizado"}
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 rounded-xl bg-muted/50 text-center">
            <div className="text-[10px] uppercase text-muted-foreground">{t("farFromYou")}</div>
            <div className="text-lg font-bold text-primary">{dist} m</div>
            <div className="text-[10px] text-muted-foreground">{distKm} km · rumbo {dir}</div>
          </div>
          <div className="p-3 rounded-xl bg-muted/50 text-center">
            <div className="text-[10px] uppercase text-muted-foreground">{t("lastDeparture")}</div>
            <div className="text-sm font-bold text-primary flex items-center justify-center gap-1">
              <Navigation className="w-4 h-4 shrink-0" />
              <span className="truncate">{info.lastDeparture}</span>
            </div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-1">
          <div className="text-[10px] uppercase text-muted-foreground flex items-center gap-1">
            <RouteIcon className="w-3 h-3" /> {t("dailyDistance")}
          </div>
          <div className="text-2xl font-bold text-primary">{dailyKm} km</div>
          <div className="text-[11px] text-muted-foreground">
            {t("metersAccum", { n: info.dailyMeters.toLocaleString() })}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-muted/50 space-y-2">
          <div className="text-[10px] uppercase text-muted-foreground">Perfil</div>
          <div className="grid grid-cols-1 gap-1 text-sm">
            <div className="flex items-center gap-2">
              <UserIcon className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Relación:</span>
              <span className="font-medium">{info.relation}</span>
            </div>
            <a href={`tel:${info.phone.replace(/\s/g, "")}`} className="flex items-center gap-2 hover:text-primary">
              <Phone className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Teléfono:</span>
              <span className="font-medium">{info.phone}</span>
            </a>
            <div className="flex items-center gap-2">
              <MessageCircle className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium truncate">{info.email}</span>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
              <span className="text-muted-foreground">Dirección:</span>
              <span className="font-medium">{info.address}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" className="gap-1" onClick={() => toast.info(`${t("call")} ${user.name}`)}>
            <Phone className="w-4 h-4" /> {t("call")}
          </Button>
          <Button variant="outline" className="gap-1" onClick={() => toast.info(`${t("message")} ${user.name}`)}>
            <MessageCircle className="w-4 h-4" /> {t("message")}
          </Button>
          {onFollow && user.kind !== "sos" && (
            <Button className="gap-1" onClick={() => onFollow(user)}>
              <Navigation className="w-4 h-4" /> {t("follow")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileEditorSheet({
  profile,
  onSave,
  onClose,
}: {
  profile: DemoProfile;
  onSave: (p: DemoProfile) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<DemoProfile>(profile);
  const set = <K extends keyof DemoProfile>(k: K, v: DemoProfile[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onAvatar = (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => set("avatar", r.result as string);
    r.readAsDataURL(f);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-card border border-border rounded-t-3xl sm:rounded-3xl p-5 space-y-3"
        style={{ boxShadow: "var(--shadow-card)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Settings className="w-4 h-4" /> Configurar perfil
          </h3>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <label className="cursor-pointer relative">
            <input type="file" accept="image/*" className="hidden" onChange={(e) => onAvatar(e.target.files)} />
            {form.avatar ? (
              <img src={form.avatar} alt="avatar" className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl"
                style={{ background: "var(--gradient-brand)" }}
              >
                {form.fullName[0]}
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <Camera className="w-3 h-3" />
            </span>
          </label>
          <div className="text-xs text-muted-foreground">
            Toca la foto para cambiarla
          </div>
        </div>

        {[
          { k: "fullName" as const, label: "Nombre completo" },
          { k: "phone" as const, label: "Teléfono", type: "tel" },
          { k: "email" as const, label: "Correo", type: "email" },
          { k: "address" as const, label: "Dirección" },
          { k: "birthdate" as const, label: "Fecha de nacimiento", type: "date" },
          { k: "bloodType" as const, label: "Tipo de sangre" },
        ].map((f) => (
          <div key={f.k} className="space-y-1">
            <label className="text-xs text-muted-foreground">{f.label}</label>
            <Input
              type={f.type ?? "text"}
              value={form[f.k]}
              onChange={(e) => set(f.k, e.target.value)}
            />
          </div>
        ))}

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Notas médicas / emergencia</label>
          <textarea
            value={form.emergencyNote}
            onChange={(e) => set("emergencyNote", e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40 resize-none"
          />
        </div>

        <Button onClick={() => onSave(form)} className="w-full gap-2">
          <Save className="w-4 h-4" /> Guardar perfil
        </Button>
      </div>
    </div>
  );
}

function ContactsPanel({
  contacts,
  setContacts,
  onOpen,
}: {
  contacts: DemoMarker[];
  setContacts: React.Dispatch<React.SetStateAction<DemoMarker[]>>;
  onOpen: (c: DemoMarker) => void;
}) {
  const { t } = useT();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const addContact = () => {
    if (!name.trim() || !phone.trim()) {
      toast.error(t("fullName") + " / " + t("phone"));
      return;
    }
    if (!/^[+\d\s-]{7,}$/.test(phone.trim())) {
      toast.error("Teléfono no válido");
      return;
    }
    const newC: DemoMarker = {
      id: `c${Date.now()}`,
      name: name.trim(),
      kind: "contact",
      lat: 19.4326 + (Math.random() - 0.5) * 0.02,
      lng: -99.1332 + (Math.random() - 0.5) * 0.02,
      updated: "ahora",
    };
    setContacts((cs) => [...cs, newC]);
    toast.success(`${newC.name} agregado`);
    setName("");
    setPhone("");
    setShowForm(false);
  };

  return (
    <div className="h-full overflow-y-auto px-4 py-4">
      <div className="max-w-md mx-auto space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("authorizedContacts")}</h2>
          <Button
            size="sm"
            onClick={() => setShowForm((v) => !v)}
            className="gap-1"
          >
            {showForm ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            {showForm ? t("close") : t("new")}
          </Button>
        </div>

        {showForm && (
          <div
            className="rounded-2xl bg-card border border-border p-4 space-y-3"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <div className="text-sm font-semibold">{t("addContact")}</div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">{t("fullName")}</label>
              <Input
                placeholder="Ej. Laura Gómez"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">{t("phone")}</label>
              <Input
                type="tel"
                inputMode="tel"
                placeholder="+51 987 654 321"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <Button onClick={addContact} className="w-full gap-2">
              <UserPlus className="w-4 h-4" />
              {t("save")}
            </Button>
          </div>
        )}

        {contacts.map((c) => (
          <button
            key={c.id}
            onClick={() => onOpen(c)}
            className="w-full text-left flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:border-primary/40 transition-colors"
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
              style={{ background: "var(--gradient-brand)" }}
            >
              {c.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{c.name}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {c.lat.toFixed(4)}, {c.lng.toFixed(4)} · {c.updated}
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        ))}
        <div className="text-xs text-muted-foreground text-center pt-2">
          {t("realAppHint")}
        </div>
      </div>
    </div>
  );
}

function HistoryPanel() {
  const { t } = useT();
  return (
    <div className="h-full overflow-y-auto px-4 py-4">
      <div className="max-w-md mx-auto space-y-3">
        <h2 className="text-lg font-semibold">{t("history7")}</h2>
        {historyLog.map((h, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-3 rounded-2xl bg-card border border-border"
          >
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{h.place}</div>
              <div className="text-xs text-muted-foreground">
                {h.t} · {h.lat.toFixed(4)}, {h.lng.toFixed(4)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminPanel({
  contactsCount,
  sosActive,
  contacts,
  onOpenUser,
  onConfigureProfile,
  profile,
}: {
  contactsCount: number;
  sosActive: boolean;
  contacts: DemoMarker[];
  onOpenUser: (c: DemoMarker) => void;
  onConfigureProfile: () => void;
  profile: DemoProfile;
}) {
  const { t, lang, setLang } = useT();
  const langs: { code: Lang; label: string; flag: string }[] = [
    { code: "es", label: "Español", flag: "🇵🇪" },
    { code: "en", label: "English", flag: "🇺🇸" },
    { code: "qu", label: "Quechua", flag: "🪶" },
    { code: "pt", label: "Português", flag: "🇧🇷" },
    { code: "fr", label: "Français", flag: "🇫🇷" },
    { code: "it", label: "Italiano", flag: "🇮🇹" },
    { code: "de", label: "Deutsch", flag: "🇩🇪" },
  ];
  return (
    <div className="h-full overflow-y-auto px-4 py-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("adminTitle")}</h2>
          <Button size="sm" onClick={onConfigureProfile} className="gap-1">
            <Settings className="w-4 h-4" /> {t("profile")}
          </Button>
        </div>

        <div className="p-3 rounded-2xl bg-card border border-border space-y-2">
          <div className="text-[10px] uppercase text-muted-foreground">{t("language")}</div>
          <div className="grid grid-cols-3 gap-2">
            {langs.map((l) => (
              <button
                key={l.code}
                onClick={() => {
                  setLang(l.code);
                  toast.success(`${l.flag} ${l.label}`);
                }}
                className={`px-2 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                  lang === l.code
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/40 border-border hover:border-primary/40"
                }`}
              >
                <div className="text-base leading-none">{l.flag}</div>
                <div className="mt-1">{l.label}</div>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={onConfigureProfile}
          className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:border-primary/40 text-left"
        >
          {profile.avatar ? (
            <img src={profile.avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
              style={{ background: "var(--gradient-brand)" }}
            >
              {profile.fullName[0]}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{profile.fullName}</div>
            <div className="text-xs text-muted-foreground truncate">
              {profile.email} · {profile.phone}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: t("connected"), value: contactsCount + 1 },
            { label: t("locationsLbl"), value: 248 },
            { label: t("alerts"), value: sosActive ? 1 : 0 },
          ].map((s) => (
            <div
              key={s.label}
              className="p-3 rounded-2xl bg-card border border-border text-center"
            >
              <div className="text-2xl font-bold text-primary">{s.value}</div>
              <div className="text-[10px] text-muted-foreground uppercase">
                {s.label}
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">
            {t("activeUsers")}
          </h3>
          {contacts.map((c) => (
            <button
              key={c.id}
              onClick={() => onOpenUser(c)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-card border border-border hover:border-primary/40 text-left"
            >
              <span className="flex items-center gap-2 text-sm min-w-0">
                <UserIcon className="w-4 h-4 text-primary shrink-0" />
                <span className="truncate">{c.name}</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                {t("online")}
              </span>
            </button>
          ))}
        </div>
        {sosActive && (
          <div className="p-3 rounded-2xl border border-destructive/40 bg-destructive/5">
            <div className="flex items-center gap-2 text-destructive font-semibold">
              <Siren className="w-4 h-4" /> {t("sosActiveTitle")}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {t("sosReceived")}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SosPanel({
  me,
  onTriggerSos,
  sosActive,
}: {
  me: { lat: number; lng: number };
  onTriggerSos: () => void;
  sosActive: boolean;
}) {
  const { t } = useT();
  const [sent, setSent] = useState(false);

  const handleSos = () => {
    onTriggerSos();
    setSent(true);
    setTimeout(() => setSent(false), 6000);
  };

  // Zonas seguras ordenadas por distancia a "me"
  const nearbyZones = [...SAFE_ZONES]
    .map((z) => ({ ...z, d: haversineMeters(me, z) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 5);

  return (
    <div className="h-full overflow-y-auto px-4 py-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold">{t("askHelp")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("emergencyHint")}
          </p>
        </div>

        <button
          onClick={handleSos}
          disabled={sent}
          className="w-full py-6 rounded-3xl flex flex-col items-center gap-2 text-white font-bold transition-all active:scale-[0.98] disabled:opacity-70"
          style={{
            background: sent
              ? "oklch(0.55 0.18 145)"
              : "oklch(0.6 0.24 25)",
            boxShadow: sent
              ? "0 10px 30px -8px oklch(0.55 0.18 145 / 0.5)"
              : "0 10px 30px -8px oklch(0.6 0.24 25 / 0.6)",
          }}
        >
          {sent ? (
            <CheckCircle2 className="w-10 h-10" />
          ) : (
            <Siren className="w-10 h-10" />
          )}
          <span className="text-lg">
            {sent ? t("alertSent") : t("emergencyBtn")}
          </span>
          <span className="text-xs font-normal opacity-90">
            {sent ? t("sentToParents") : t("holdHint")}
          </span>
        </button>

        {(sosActive || sent) && (
          <div className="rounded-2xl border border-emerald-300/50 bg-emerald-50 dark:bg-emerald-950/30 p-4 space-y-3">
            <div className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-400">
              <Home className="w-5 h-5" /> {t("safeZonesTitle")}
            </div>
            <p className="text-xs text-muted-foreground">{t("safeZonesHint")}</p>
            <div className="space-y-2">
              {nearbyZones.map((z) => {
                const Icon = z.kind === "store" ? Store : z.kind === "pharmacy" ? Cross : UserIcon;
                const kindLbl = z.kind === "store" ? t("storeKind") : z.kind === "pharmacy" ? t("pharmacyKind") : t("neighborKind");
                return (
                  <div key={z.id} className="flex items-center gap-3 p-2 rounded-xl bg-card border border-border">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{z.name}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{kindLbl} · {z.address}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[11px] font-bold text-primary">{z.d} m</div>
                      <button
                        onClick={() => toast.success(`${t("goNow")} → ${z.name}`)}
                        className="text-[10px] mt-1 px-2 py-0.5 rounded-md bg-primary text-primary-foreground"
                      >
                        {t("goNow")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {sosActive && (
          <div className="p-4 rounded-2xl border border-destructive/40 bg-destructive/5 space-y-2">
            <div className="flex items-center gap-2 text-destructive font-semibold">
              <AlertTriangle className="w-5 h-5" /> {t("sosActiveTitle")}
            </div>
            <div className="text-sm text-muted-foreground">
              Ubicación: {me.lat.toFixed(4)}, {me.lng.toFixed(4)}
            </div>
            <div className="text-xs text-muted-foreground">
              {t("sentTo", { n: baseContacts.length })}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">
            {t("emergencyContacts")}
          </h3>
          {baseContacts.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Phone className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{c.name}</div>
                <div className="text-xs text-muted-foreground">
                  {t("authorizedContact")}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center"
                  onClick={() => toast.info(`Llamando a ${c.name} (demo)` )}
                >
                  <Phone className="w-4 h-4" />
                </button>
                <button
                  className="w-9 h-9 rounded-xl bg-muted text-muted-foreground flex items-center justify-center"
                  onClick={() => toast.info(`Mensaje a ${c.name} (demo)` )}
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-primary" />
            {t("emergencyLines")}
          </h3>
          {[
            { name: "PNP - Policía", num: "105", desc: "Policía Nacional del Perú" },
            { name: "Bomberos", num: "116", desc: "Bomberos voluntarios del Perú" },
            { name: "SAMU", num: "106", desc: "Atención médica de emergencia" },
            { name: "Serenazgo Lima", num: "1455", desc: "Línea de seguridad ciudadana" },
          ].map((line) => (
            <div
              key={line.num}
              className="flex items-center justify-between p-3 rounded-xl bg-muted/50"
            >
              <div>
                <div className="font-medium text-sm">{line.name}</div>
                <div className="text-xs text-muted-foreground">{line.desc}</div>
              </div>
              <button
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
                onClick={() => toast.info(`Llamando al ${line.num} (demo)` )}
              >
                {line.num}
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        <div className="text-xs text-muted-foreground text-center">
          {t("demoFooter")}
        </div>
      </div>
    </div>
  );
}

function Stars({
  value,
  onChange,
  size = 18,
}: {
  value: number;
  onChange?: (n: number) => void;
  size?: number;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        const Comp = onChange ? "button" : "span";
        return (
          <Comp
            key={n}
            type="button"
            onClick={onChange ? () => onChange(n) : undefined}
            className={onChange ? "cursor-pointer" : ""}
            aria-label={`${n} estrellas`}
          >
            <Star
              style={{ width: size, height: size }}
              className={filled ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}
            />
          </Comp>
        );
      })}
    </div>
  );
}

function ForumPanel() {
  const { t } = useT();
  const [reviews, setReviews] = useState<Review[]>(seedReviews);
  const [place, setPlace] = useState("");
  const [text, setText] = useState("");
  const [rating, setRating] = useState(5);
  const [photos, setPhotos] = useState<string[]>([]);

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files)
      .slice(0, 4 - photos.length)
      .forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          setPhotos((p) => [...p, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
  };

  const submit = () => {
    if (!place.trim() || !text.trim()) {
      toast.error(t("needPlace"));
      return;
    }
    const r: Review = {
      id: `r${Date.now()}`,
      author: "Tú (Demo)",
      place: place.trim(),
      rating,
      text: text.trim(),
      photos,
      when: "Ahora",
    };
    setReviews((rs) => [r, ...rs]);
    setPlace("");
    setText("");
    setRating(5);
    setPhotos([]);
    toast.success(t("published"));
  };

  const avg =
    reviews.length === 0
      ? 0
      : reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;

  return (
    <div className="h-full overflow-y-auto px-4 py-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("forumTitle")}</h2>
          <div className="flex items-center gap-1 text-sm">
            <Stars value={Math.round(avg)} />
            <span className="text-muted-foreground">({reviews.length})</span>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-card border border-border space-y-3">
          <div className="text-sm font-semibold">{t("ratePlace")}</div>
          <input
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            placeholder={t("placePh")}
            className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{t("yourRating")}</span>
            <Stars value={rating} onChange={setRating} size={22} />
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("expPh")}
            rows={3}
            className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40 resize-none"
          />

          {photos.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {photos.map((src, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                  <img src={src} alt="foto" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <label className="flex-1 cursor-pointer">
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  onFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-muted text-sm font-medium">
                <Camera className="w-4 h-4" /> {t("uploadPhotos")}
              </div>
            </label>
            <Button onClick={submit} className="gap-2">
              <Send className="w-4 h-4" /> {t("publish")}
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="p-3 rounded-2xl bg-card border border-border space-y-2">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold"
                  style={{ background: "var(--gradient-brand)" }}
                >
                  {r.author[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{r.author}</div>
                  <div className="text-[11px] text-muted-foreground">{r.when}</div>
                </div>
                <Stars value={r.rating} />
              </div>
              <div className="text-xs text-primary font-semibold flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {r.place}
              </div>
              <p className="text-sm text-foreground/90">{r.text}</p>
              {r.photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {r.photos.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt={`foto ${i + 1}`}
                      className="w-full aspect-square object-cover rounded-lg"
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TrackingPanel({
  contacts,
  onTrack,
}: {
  contacts: DemoMarker[];
  onTrack: (id: string) => void;
}) {
  return (
    <div className="h-full overflow-y-auto px-4 py-4">
      <div className="max-w-md mx-auto space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Seguimiento en vivo</h2>
          <p className="text-xs text-muted-foreground">
            Selecciona un contacto para ver el recorrido que está realizando en tiempo real.
          </p>
        </div>
        {contacts.map((c) => {
          const info = detailsFor(c.id);
          return (
            <button
              key={c.id}
              onClick={() => onTrack(c.id)}
              className="w-full text-left flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:border-primary/40 transition-colors"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                style={{ background: "var(--gradient-brand)" }}
              >
                {c.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{c.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {info.phone} · {c.updated}
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-primary/10 text-primary flex items-center gap-1">
                <Navigation className="w-3 h-3" /> SEGUIR
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TrackingView({
  contact,
  trail,
  onClose,
}: {
  contact: DemoMarker;
  trail: [number, number][];
  onClose: () => void;
}) {
  const info = detailsFor(contact.id);
  const [paused, setPaused] = useState(false);
  const now = new Date().toLocaleTimeString("es-PE", { hour12: true });
  const markers: DemoMarker[] = [
    { ...contact, kind: "contact" },
  ];
  return (
    <div className="fixed inset-0 z-[9999] bg-background flex flex-col">
      <header
        className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
      >
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
          aria-label="Volver"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-primary">
            En seguimiento
          </div>
          <div className="font-semibold truncate">{contact.name}</div>
        </div>
        <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          EN VIVO
        </span>
      </header>

      <div className="flex-1 relative">
        <ClientOnly fallback={<div className="h-full w-full bg-muted" />}>
          <Suspense fallback={<div className="h-full w-full bg-muted" />}>
            <DemoMap markers={markers} trail={trail} initialZoom={16} />
          </Suspense>
        </ClientOnly>
      </div>

      <div className="bg-card border-t border-border p-4 space-y-3" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold uppercase text-muted-foreground">Dirección</div>
            <div className="text-sm font-medium">{info.address}</div>
            <div className="text-xs text-muted-foreground">Lima, Perú</div>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Clock className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold uppercase text-muted-foreground">
              Última actualización
            </div>
            <div className="text-sm font-medium">{now}</div>
            <div className="text-xs text-muted-foreground">
              {trail.length} puntos registrados · {contact.updated}
            </div>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            size="lg"
            className="px-4"
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? "▶" : "❚❚"}
          </Button>
          <Button
            size="lg"
            className="flex-1 font-semibold"
            onClick={() => {
              toast.success("Seguimiento finalizado");
              onClose();
            }}
          >
            FINALIZAR SEGUIMIENTO
          </Button>
        </div>
      </div>
    </div>
  );
}
// ============================================================================
// MINIJUEGO: SafeTrack Runner (plataformas con niveles)
// Funciona con teclado (←/→/Espacio/↑) y táctil (botones en pantalla)
// ============================================================================
type GameLevel = {
  id: number;
  name: string;
  bg: string;
  platforms: { x: number; y: number; w: number; h: number }[];
  coins: { x: number; y: number }[];
  enemies: { x: number; y: number; minX: number; maxX: number; speed: number }[];
  goal: { x: number; y: number; w: number; h: number };
  spawn: { x: number; y: number };
  gravity: number;
};

const GAME_W = 640;
const GAME_H = 320;

const LEVELS: GameLevel[] = [
  {
    id: 1,
    name: "Nivel 1 · Miraflores",
    bg: "linear-gradient(180deg,#7dd3fc 0%,#bae6fd 60%,#fef3c7 100%)",
    spawn: { x: 30, y: 220 },
    gravity: 0.55,
    platforms: [
      { x: 0, y: 290, w: 640, h: 30 },
      { x: 180, y: 230, w: 80, h: 14 },
      { x: 320, y: 190, w: 80, h: 14 },
      { x: 460, y: 230, w: 80, h: 14 },
    ],
    coins: [
      { x: 210, y: 200 }, { x: 350, y: 160 }, { x: 490, y: 200 },
    ],
    enemies: [
      { x: 350, y: 268, minX: 280, maxX: 440, speed: 1.2 },
    ],
    goal: { x: 590, y: 250, w: 30, h: 40 },
  },
  {
    id: 2,
    name: "Nivel 2 · Barranco",
    bg: "linear-gradient(180deg,#a78bfa 0%,#c4b5fd 60%,#fde68a 100%)",
    spawn: { x: 20, y: 220 },
    gravity: 0.6,
    platforms: [
      { x: 0, y: 290, w: 200, h: 30 },
      { x: 260, y: 290, w: 120, h: 30 },
      { x: 440, y: 290, w: 200, h: 30 },
      { x: 150, y: 220, w: 70, h: 14 },
      { x: 280, y: 180, w: 70, h: 14 },
      { x: 420, y: 220, w: 70, h: 14 },
      { x: 520, y: 160, w: 70, h: 14 },
    ],
    coins: [
      { x: 170, y: 190 }, { x: 300, y: 150 }, { x: 440, y: 190 },
      { x: 540, y: 130 }, { x: 480, y: 260 },
    ],
    enemies: [
      { x: 320, y: 268, minX: 260, maxX: 370, speed: 1.6 },
      { x: 510, y: 268, minX: 440, maxX: 630, speed: 2 },
    ],
    goal: { x: 600, y: 120, w: 30, h: 40 },
  },
  {
    id: 3,
    name: "Nivel 3 · Cusco",
    bg: "linear-gradient(180deg,#f97316 0%,#fb923c 50%,#1f2937 100%)",
    spawn: { x: 20, y: 220 },
    gravity: 0.65,
    platforms: [
      { x: 0, y: 290, w: 120, h: 30 },
      { x: 180, y: 260, w: 60, h: 14 },
      { x: 280, y: 220, w: 60, h: 14 },
      { x: 380, y: 180, w: 60, h: 14 },
      { x: 480, y: 220, w: 60, h: 14 },
      { x: 560, y: 290, w: 80, h: 30 },
      { x: 220, y: 140, w: 60, h: 14 },
      { x: 360, y: 100, w: 60, h: 14 },
    ],
    coins: [
      { x: 200, y: 230 }, { x: 300, y: 190 }, { x: 400, y: 150 },
      { x: 500, y: 190 }, { x: 240, y: 110 }, { x: 380, y: 70 },
    ],
    enemies: [
      { x: 220, y: 238, minX: 180, maxX: 240, speed: 1.4 },
      { x: 400, y: 158, minX: 380, maxX: 440, speed: 1.8 },
      { x: 500, y: 198, minX: 480, maxX: 540, speed: 2.2 },
    ],
    goal: { x: 600, y: 250, w: 30, h: 40 },
  },
  {
    id: 4,
    name: "Nivel 4 · Arequipa",
    bg: "linear-gradient(180deg,#fda4af 0%,#fecaca 50%,#fef3c7 100%)",
    spawn: { x: 20, y: 220 },
    gravity: 0.62,
    platforms: [
      { x: 0, y: 290, w: 160, h: 30 },
      { x: 220, y: 250, w: 60, h: 14 },
      { x: 320, y: 210, w: 60, h: 14 },
      { x: 420, y: 170, w: 60, h: 14 },
      { x: 520, y: 130, w: 60, h: 14 },
      { x: 560, y: 290, w: 80, h: 30 },
      { x: 180, y: 160, w: 50, h: 14 },
      { x: 80, y: 200, w: 50, h: 14 },
    ],
    coins: [
      { x: 240, y: 220 }, { x: 340, y: 180 }, { x: 440, y: 140 },
      { x: 540, y: 100 }, { x: 200, y: 130 }, { x: 100, y: 170 }, { x: 590, y: 260 },
    ],
    enemies: [
      { x: 250, y: 228, minX: 220, maxX: 280, speed: 1.7 },
      { x: 440, y: 148, minX: 420, maxX: 480, speed: 2.1 },
      { x: 590, y: 268, minX: 560, maxX: 630, speed: 2.4 },
    ],
    goal: { x: 600, y: 250, w: 30, h: 40 },
  },
  {
    id: 5,
    name: "Nivel 5 · Iquitos",
    bg: "linear-gradient(180deg,#22c55e 0%,#16a34a 50%,#064e3b 100%)",
    spawn: { x: 20, y: 220 },
    gravity: 0.68,
    platforms: [
      { x: 0, y: 290, w: 100, h: 30 },
      { x: 140, y: 260, w: 50, h: 14 },
      { x: 230, y: 220, w: 50, h: 14 },
      { x: 320, y: 180, w: 50, h: 14 },
      { x: 410, y: 140, w: 50, h: 14 },
      { x: 500, y: 180, w: 50, h: 14 },
      { x: 580, y: 230, w: 60, h: 14 },
      { x: 260, y: 100, w: 60, h: 14 },
      { x: 380, y: 70, w: 60, h: 14 },
    ],
    coins: [
      { x: 160, y: 230 }, { x: 250, y: 190 }, { x: 340, y: 150 },
      { x: 430, y: 110 }, { x: 520, y: 150 }, { x: 280, y: 70 }, { x: 400, y: 40 }, { x: 600, y: 200 },
    ],
    enemies: [
      { x: 250, y: 198, minX: 230, maxX: 280, speed: 1.9 },
      { x: 430, y: 118, minX: 410, maxX: 460, speed: 2.3 },
      { x: 520, y: 158, minX: 500, maxX: 550, speed: 2.5 },
      { x: 400, y: 48, minX: 380, maxX: 440, speed: 2.7 },
    ],
    goal: { x: 600, y: 190, w: 30, h: 40 },
  },
  {
    id: 6,
    name: "Nivel 6 · Machu Picchu",
    bg: "linear-gradient(180deg,#0ea5e9 0%,#1e293b 60%,#0f172a 100%)",
    spawn: { x: 20, y: 220 },
    gravity: 0.7,
    platforms: [
      { x: 0, y: 290, w: 80, h: 30 },
      { x: 120, y: 260, w: 40, h: 14 },
      { x: 200, y: 230, w: 40, h: 14 },
      { x: 280, y: 200, w: 40, h: 14 },
      { x: 360, y: 170, w: 40, h: 14 },
      { x: 440, y: 140, w: 40, h: 14 },
      { x: 520, y: 110, w: 40, h: 14 },
      { x: 580, y: 80, w: 60, h: 14 },
      { x: 160, y: 140, w: 40, h: 14 },
      { x: 80, y: 180, w: 40, h: 14 },
    ],
    coins: [
      { x: 130, y: 230 }, { x: 210, y: 200 }, { x: 290, y: 170 },
      { x: 370, y: 140 }, { x: 450, y: 110 }, { x: 530, y: 80 },
      { x: 600, y: 50 }, { x: 170, y: 110 }, { x: 90, y: 150 },
    ],
    enemies: [
      { x: 210, y: 208, minX: 200, maxX: 240, speed: 2.2 },
      { x: 370, y: 148, minX: 360, maxX: 400, speed: 2.5 },
      { x: 530, y: 88, minX: 520, maxX: 560, speed: 2.8 },
      { x: 600, y: 58, minX: 580, maxX: 640, speed: 3 },
    ],
    goal: { x: 600, y: 40, w: 30, h: 40 },
  },
];

function GamePanel() {
  const [levelIdx, setLevelIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [status, setStatus] = useState<"playing" | "win" | "gameover" | "complete">("playing");
  const [collected, setCollected] = useState<Set<string>>(new Set());
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const keys = React.useRef({ left: false, right: false, jump: false });
  const player = React.useRef({ x: 30, y: 200, vx: 0, vy: 0, w: 22, h: 28, onGround: false, facing: 1 });
  const enemiesRef = React.useRef<{ x: number; y: number; dir: number; def: GameLevel["enemies"][number] }[]>([]);
  const rafRef = React.useRef<number | null>(null);

  const level = LEVELS[levelIdx];

  // reset on level change
  useEffect(() => {
    player.current = {
      x: level.spawn.x,
      y: level.spawn.y,
      vx: 0,
      vy: 0,
      w: 22,
      h: 28,
      onGround: false,
      facing: 1,
    };
    enemiesRef.current = level.enemies.map((e) => ({ x: e.x, y: e.y, dir: 1, def: e }));
    setCollected(new Set());
    setStatus("playing");
  }, [levelIdx, level]);

  // keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (["ArrowLeft", "a", "A"].includes(e.key)) keys.current.left = true;
      if (["ArrowRight", "d", "D"].includes(e.key)) keys.current.right = true;
      if ([" ", "ArrowUp", "w", "W"].includes(e.key)) {
        e.preventDefault();
        keys.current.jump = true;
      }
    };
    const up = (e: KeyboardEvent) => {
      if (["ArrowLeft", "a", "A"].includes(e.key)) keys.current.left = false;
      if (["ArrowRight", "d", "D"].includes(e.key)) keys.current.right = false;
      if ([" ", "ArrowUp", "w", "W"].includes(e.key)) keys.current.jump = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // main game loop
  useEffect(() => {
    if (status !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const step = () => {
      const p = player.current;
      // input
      const speed = 3.4;
      if (keys.current.left) {
        p.vx = -speed;
        p.facing = -1;
      } else if (keys.current.right) {
        p.vx = speed;
        p.facing = 1;
      } else {
        p.vx *= 0.75;
      }
      if (keys.current.jump && p.onGround) {
        p.vy = -10.2;
        p.onGround = false;
      }
      // physics
      p.vy += level.gravity;
      if (p.vy > 12) p.vy = 12;
      p.x += p.vx;
      // h collisions
      for (const pl of level.platforms) {
        if (p.x < pl.x + pl.w && p.x + p.w > pl.x && p.y < pl.y + pl.h && p.y + p.h > pl.y) {
          if (p.vx > 0) p.x = pl.x - p.w;
          else if (p.vx < 0) p.x = pl.x + pl.w;
          p.vx = 0;
        }
      }
      p.y += p.vy;
      p.onGround = false;
      for (const pl of level.platforms) {
        if (p.x < pl.x + pl.w && p.x + p.w > pl.x && p.y < pl.y + pl.h && p.y + p.h > pl.y) {
          if (p.vy > 0) {
            p.y = pl.y - p.h;
            p.vy = 0;
            p.onGround = true;
          } else if (p.vy < 0) {
            p.y = pl.y + pl.h;
            p.vy = 0;
          }
        }
      }
      // walls
      if (p.x < 0) p.x = 0;
      if (p.x + p.w > GAME_W) p.x = GAME_W - p.w;
      // fall pit
      if (p.y > GAME_H + 80) {
        loseLife();
        return;
      }
      // enemies
      for (const en of enemiesRef.current) {
        en.x += en.dir * en.def.speed;
        if (en.x < en.def.minX) en.dir = 1;
        if (en.x > en.def.maxX) en.dir = -1;
        // collide
        if (p.x < en.x + 22 && p.x + p.w > en.x && p.y < en.y + 22 && p.y + p.h > en.y) {
          if (p.vy > 1) {
            // stomp
            en.x = -9999;
            p.vy = -7;
            setScore((s) => s + 50);
          } else {
            loseLife();
            return;
          }
        }
      }
      // coins
      level.coins.forEach((c, i) => {
        const key = `${levelIdx}-${i}`;
        if (collected.has(key)) return;
        if (p.x < c.x + 14 && p.x + p.w > c.x && p.y < c.y + 14 && p.y + p.h > c.y) {
          setCollected((prev) => {
            const next = new Set(prev);
            next.add(key);
            return next;
          });
          setScore((s) => s + 20);
        }
      });
      // goal
      const g = level.goal;
      if (p.x < g.x + g.w && p.x + p.w > g.x && p.y < g.y + g.h && p.y + p.h > g.y) {
        if (levelIdx + 1 < LEVELS.length) {
          setStatus("win");
        } else {
          setStatus("complete");
        }
        return;
      }

      // render
      ctx.clearRect(0, 0, GAME_W, GAME_H);
      // platforms
      for (const pl of level.platforms) {
        ctx.fillStyle = "#7c3aed";
        ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
        ctx.fillStyle = "#a78bfa";
        ctx.fillRect(pl.x, pl.y, pl.w, 4);
      }
      // coins
      level.coins.forEach((c, i) => {
        const key = `${levelIdx}-${i}`;
        if (collected.has(key)) return;
        ctx.fillStyle = "#facc15";
        ctx.beginPath();
        ctx.arc(c.x + 7, c.y + 7, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ca8a04";
        ctx.stroke();
      });
      // enemies
      for (const en of enemiesRef.current) {
        if (en.x < -100) continue;
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(en.x, en.y, 22, 22);
        ctx.fillStyle = "#fff";
        ctx.fillRect(en.x + 4, en.y + 6, 4, 4);
        ctx.fillRect(en.x + 14, en.y + 6, 4, 4);
      }
      // goal flag
      ctx.fillStyle = "#0ea5e9";
      ctx.fillRect(g.x, g.y, 4, g.h);
      ctx.fillRect(g.x, g.y, g.w, 14);
      // player
      ctx.fillStyle = "#1d4ed8";
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = "#fff";
      const eyeX = p.facing > 0 ? p.x + 14 : p.x + 4;
      ctx.fillRect(eyeX, p.y + 6, 4, 4);

      rafRef.current = requestAnimationFrame(step);
    };

    const loseLife = () => {
      setLives((l) => {
        const nl = l - 1;
        if (nl <= 0) {
          setStatus("gameover");
        } else {
          player.current.x = level.spawn.x;
          player.current.y = level.spawn.y;
          player.current.vx = 0;
          player.current.vy = 0;
          rafRef.current = requestAnimationFrame(step);
        }
        return nl;
      });
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [status, levelIdx, level, collected]);

  const restart = () => {
    setLives(3);
    setScore(0);
    setLevelIdx(0);
  };
  const nextLevel = () => setLevelIdx((i) => Math.min(i + 1, LEVELS.length - 1));

  // touch helpers
  const press = (k: "left" | "right" | "jump", v: boolean) => {
    keys.current[k] = v;
  };

  return (
    <div className="h-full overflow-y-auto px-4 py-4">
      <div className="max-w-md mx-auto space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-primary" /> SafeTrack Runner
            </h2>
            <p className="text-xs text-muted-foreground">{level.name}</p>
          </div>
          <div className="text-right text-xs">
            <div>⭐ <b>{score}</b></div>
            <div>❤️ <b>{lives}</b></div>
          </div>
        </div>

        <div
          className="relative rounded-2xl overflow-hidden border border-border"
          style={{ background: level.bg }}
        >
          <canvas
            ref={canvasRef}
            width={GAME_W}
            height={GAME_H}
            className="w-full block touch-none select-none"
            style={{ aspectRatio: `${GAME_W}/${GAME_H}` }}
          />
          {status !== "playing" && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-3 p-4 text-center">
              {status === "win" && (
                <>
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                  <div className="text-lg font-bold">¡Nivel superado!</div>
                  <Button onClick={nextLevel}>Siguiente nivel</Button>
                </>
              )}
              {status === "complete" && (
                <>
                  <Star className="w-10 h-10 text-yellow-400" />
                  <div className="text-lg font-bold">¡Felicidades, completaste el juego!</div>
                  <div className="text-sm">Puntaje final: {score}</div>
                  <Button onClick={restart}>Jugar de nuevo</Button>
                </>
              )}
              {status === "gameover" && (
                <>
                  <AlertTriangle className="w-10 h-10 text-red-400" />
                  <div className="text-lg font-bold">Game Over</div>
                  <Button onClick={restart}>Reintentar</Button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Controles táctiles */}
        <div className="grid grid-cols-3 gap-2 sm:hidden">
          <button
            onTouchStart={() => press("left", true)}
            onTouchEnd={() => press("left", false)}
            onMouseDown={() => press("left", true)}
            onMouseUp={() => press("left", false)}
            onMouseLeave={() => press("left", false)}
            className="py-5 rounded-2xl bg-primary text-primary-foreground text-2xl font-bold active:scale-95"
          >
            ◀
          </button>
          <button
            onTouchStart={() => press("jump", true)}
            onTouchEnd={() => press("jump", false)}
            onMouseDown={() => press("jump", true)}
            onMouseUp={() => press("jump", false)}
            onMouseLeave={() => press("jump", false)}
            className="py-5 rounded-2xl bg-emerald-500 text-white text-xl font-bold active:scale-95"
          >
            SALTAR
          </button>
          <button
            onTouchStart={() => press("right", true)}
            onTouchEnd={() => press("right", false)}
            onMouseDown={() => press("right", true)}
            onMouseUp={() => press("right", false)}
            onMouseLeave={() => press("right", false)}
            className="py-5 rounded-2xl bg-primary text-primary-foreground text-2xl font-bold active:scale-95"
          >
            ▶
          </button>
        </div>

        <div className="text-xs text-muted-foreground text-center hidden sm:block">
          Controles: <b>←/→</b> para moverte · <b>Espacio</b> o <b>↑</b> para saltar
        </div>

        <div className="flex gap-2">
          {LEVELS.map((l, i) => (
            <button
              key={l.id}
              onClick={() => setLevelIdx(i)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold border ${
                levelIdx === i
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/40 border-border"
              }`}
            >
              Nivel {l.id}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
