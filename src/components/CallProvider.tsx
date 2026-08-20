import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Json } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Mic, MicOff, Phone, PhoneOff } from "lucide-react";

type CallStatus = "idle" | "calling" | "ringing" | "connecting" | "in-call";

type ActiveCall = {
  id: string;
  peerId: string;
  peerName: string;
  role: "caller" | "callee";
};

type Ctx = {
  status: CallStatus;
  call: ActiveCall | null;
  startCall: (peerId: string, peerName: string) => Promise<void>;
};

const CallCtx = createContext<Ctx>({
  status: "idle",
  call: null,
  startCall: async () => {},
});

export const useCall = () => useContext(CallCtx);

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ],
};

export function CallProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [status, setStatus] = useState<CallStatus>("idle");
  const [call, setCall] = useState<ActiveCall | null>(null);
  const [muted, setMuted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [pendingOffer, setPendingOffer] = useState<RTCSessionDescriptionInit | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const callIdRef = useRef<string | null>(null);
  const remoteDescSetRef = useRef(false);
  const queuedCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  const cleanup = useCallback(() => {
    pcRef.current?.getSenders().forEach((s) => s.track?.stop());
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (audioRef.current) audioRef.current.srcObject = null;
    callIdRef.current = null;
    remoteDescSetRef.current = false;
    queuedCandidatesRef.current = [];
    setPendingOffer(null);
    setCall(null);
    setStatus("idle");
    setMuted(false);
    setSeconds(0);
  }, []);

  const endCall = useCallback(
    async (notify = true) => {
      const id = callIdRef.current;
      cleanup();
      if (id && notify) {
        await supabase.from("calls").update({ status: "ended" }).eq("id", id);
      }
    },
    [cleanup],
  );

  const buildPeer = useCallback(async (callId: string) => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    localStreamRef.current = stream;
    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcRef.current = pc;
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    pc.onicecandidate = (ev) => {
      if (!ev.candidate || !user) return;
      supabase.from("call_candidates").insert({
        call_id: callId,
        sender_id: user.id,
        candidate: ev.candidate.toJSON() as unknown as Json,
      });
    };
    pc.ontrack = (ev) => {
      if (audioRef.current) {
        audioRef.current.srcObject = ev.streams[0];
        audioRef.current.play().catch(() => {});
      }
    };
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === "connected") setStatus("in-call");
      else if (s === "connecting") setStatus("connecting");
      else if (s === "failed" || s === "disconnected" || s === "closed") {
        if (s === "failed") toast.error("No se pudo establecer el audio");
        endCall(true);
      }
    };
    return pc;
  }, [endCall, user]);

  const applyQueuedCandidates = async () => {
    const pc = pcRef.current;
    if (!pc) return;
    for (const c of queuedCandidatesRef.current) {
      try { await pc.addIceCandidate(c); } catch {}
    }
    queuedCandidatesRef.current = [];
  };

  const startCall = useCallback(
    async (peerId: string, peerName: string) => {
      if (!user) return;
      if (status !== "idle") {
        toast.error("Ya tienes una llamada en curso");
        return;
      }
      try {
        const { data: row, error } = await supabase
          .from("calls")
          .insert({ caller_id: user.id, callee_id: peerId, status: "ringing" })
          .select("id")
          .single();
        if (error || !row) throw error ?? new Error("no row");
        callIdRef.current = row.id;
        setCall({ id: row.id, peerId, peerName, role: "caller" });
        setStatus("calling");

        const pc = await buildPeer(row.id);
        const offer = await pc.createOffer({ offerToReceiveAudio: true });
        await pc.setLocalDescription(offer);
        await supabase
          .from("calls")
          .update({ offer: { type: offer.type, sdp: offer.sdp } })
          .eq("id", row.id);
      } catch (e) {
        console.error("[call] start", e);
        toast.error("No se pudo iniciar la llamada. Revisa el permiso del micrófono.");
        endCall(true);
      }
    },
    [buildPeer, endCall, status, user],
  );

  const acceptCall = useCallback(async () => {
    const id = callIdRef.current;
    if (!id || !pendingOffer) return;
    try {
      setStatus("connecting");
      const pc = await buildPeer(id);
      await pc.setRemoteDescription(pendingOffer);
      remoteDescSetRef.current = true;
      await applyQueuedCandidates();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await supabase
        .from("calls")
        .update({ status: "accepted", answer: { type: answer.type, sdp: answer.sdp } })
        .eq("id", id);
      setPendingOffer(null);
    } catch (e) {
      console.error("[call] accept", e);
      toast.error("No se pudo aceptar la llamada (permiso de micrófono)");
      endCall(true);
    }
  }, [buildPeer, endCall, pendingOffer]);

  const rejectCall = useCallback(async () => {
    const id = callIdRef.current;
    cleanup();
    if (id) await supabase.from("calls").update({ status: "rejected" }).eq("id", id);
  }, [cleanup]);

  // Llamadas entrantes
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`calls-in-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "calls", filter: `callee_id=eq.${user.id}` },
        async (payload) => {
          const row = payload.new as { id: string; caller_id: string; status: string };
          if (row.status !== "ringing") return;
          if (callIdRef.current) {
            await supabase.from("calls").update({ status: "rejected" }).eq("id", row.id);
            return;
          }
          callIdRef.current = row.id;
          const { data: p } = await supabase
            .from("profiles").select("full_name").eq("id", row.caller_id).maybeSingle();
          setCall({
            id: row.id,
            peerId: row.caller_id,
            peerName: p?.full_name ?? "Contacto",
            role: "callee",
          });
          setStatus("ringing");
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  // Señalización de la llamada activa
  useEffect(() => {
    if (!call || !user) return;
    const ch = supabase
      .channel(`call-${call.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "calls", filter: `id=eq.${call.id}` },
        async (payload) => {
          const row = payload.new as {
            status: string;
            offer: RTCSessionDescriptionInit | null;
            answer: RTCSessionDescriptionInit | null;
          };
          if (row.status === "rejected") {
            toast.error("Llamada rechazada");
            cleanup();
            return;
          }
          if (row.status === "ended") {
            toast("Llamada finalizada");
            cleanup();
            return;
          }
          if (call.role === "callee" && row.offer && !pendingOffer && !remoteDescSetRef.current) {
            setPendingOffer(row.offer);
          }
          if (call.role === "caller" && row.answer && pcRef.current && !remoteDescSetRef.current) {
            setStatus("connecting");
            await pcRef.current.setRemoteDescription(row.answer);
            remoteDescSetRef.current = true;
            await applyQueuedCandidates();
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "call_candidates", filter: `call_id=eq.${call.id}` },
        async (payload) => {
          const row = payload.new as { sender_id: string; candidate: RTCIceCandidateInit };
          if (row.sender_id === user.id) return;
          if (!pcRef.current || !remoteDescSetRef.current) {
            queuedCandidatesRef.current.push(row.candidate);
            return;
          }
          try { await pcRef.current.addIceCandidate(row.candidate); } catch {}
        },
      )
      .subscribe();

    // Si la fila ya tenía oferta/respuesta antes de suscribirnos
    (async () => {
      const { data } = await supabase
        .from("calls").select("status,offer,answer").eq("id", call.id).maybeSingle();
      if (!data) return;
      if (call.role === "callee" && data.offer && !remoteDescSetRef.current) {
        setPendingOffer(data.offer as unknown as RTCSessionDescriptionInit);
      }
    })();

    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call?.id, user?.id]);

  // Duración
  useEffect(() => {
    if (status !== "in-call") return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  const toggleMute = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMuted(!track.enabled);
  };

  const label =
    status === "calling" ? "Llamando..." :
    status === "ringing" ? "Llamada entrante" :
    status === "connecting" ? "Conectando..." :
    status === "in-call" ? "En llamada" : "";

  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <CallCtx.Provider value={{ status, call, startCall }}>
      {children}
      <audio ref={audioRef} autoPlay playsInline className="hidden" />
      {call && status !== "idle" && (
        <div className="fixed inset-x-0 top-0 z-[3000] flex justify-center p-3 pointer-events-none">
          <div
            className="pointer-events-auto w-full max-w-sm rounded-3xl bg-card border border-border p-4 space-y-3"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-primary-foreground font-semibold"
                style={{ background: "var(--gradient-brand)" }}
              >
                {call.peerName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{call.peerName}</div>
                <div className="text-xs text-muted-foreground">
                  {label}{status === "in-call" ? ` · ${mmss}` : ""}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {status === "ringing" ? (
                <>
                  <button
                    type="button"
                    onClick={acceptCall}
                    disabled={!pendingOffer}
                    className="flex-1 h-11 rounded-xl text-sm font-semibold text-primary-foreground flex items-center justify-center gap-2 disabled:opacity-60"
                    style={{ background: "var(--gradient-brand)" }}
                  >
                    <Phone className="w-4 h-4" /> Aceptar
                  </button>
                  <button
                    type="button"
                    onClick={rejectCall}
                    className="flex-1 h-11 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    <PhoneOff className="w-4 h-4" /> Rechazar
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="flex-1 h-11 rounded-xl border border-border text-sm font-medium flex items-center justify-center gap-2"
                  >
                    {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    {muted ? "Activar micro" : "Silenciar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => endCall(true)}
                    className="flex-1 h-11 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    <PhoneOff className="w-4 h-4" /> Finalizar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </CallCtx.Provider>
  );
}
