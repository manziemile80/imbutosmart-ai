import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MAX_RECORDING_MS, canSpeakLanguage, type VoiceLanguage, type VoiceNotice } from "@/lib/voice-assistant";
import { getVoiceConfigStatus, speakFarmerText, transcribeFarmerSpeech } from "@/lib/voice-assistant.functions";

// Browser-only voice hook: records a short clip with MediaRecorder, sends it to
// the server for transcription, and plays back synthesized speech. All provider
// credentials stay on the server; the browser only handles base64 audio.

export type VoiceStatus = "idle" | "recording" | "transcribing" | "speaking";

const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  for (const type of MIME_CANDIDATES) {
    try {
      if (MediaRecorder.isTypeSupported(type)) return type;
    } catch {
      // Ignore and try the next candidate.
    }
  }
  return undefined;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : "");
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the recording."));
    reader.readAsDataURL(blob);
  });
}

export function useVoice(language: VoiceLanguage, onTranscript: (text: string) => void) {
  const transcribe = useServerFn(transcribeFarmerSpeech);
  const speak = useServerFn(speakFarmerText);
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [notice, setNotice] = useState<VoiceNotice | null>(null);
  const [recordingSupported, setRecordingSupported] = useState(true);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [spokenLanguages, setSpokenLanguages] = useState<VoiceLanguage[] | null>(null);

  const voiceConfigStatus = useServerFn(getVoiceConfigStatus);

  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeRef = useRef(true);

  useEffect(() => {
    const supported =
      typeof navigator !== "undefined" &&
      typeof navigator.mediaDevices?.getUserMedia === "function" &&
      typeof MediaRecorder !== "undefined";
    setRecordingSupported(supported);
    return () => {
      activeRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      audioRef.current?.pause();
    };
  }, []);

  // Ask the server once whether voice is configured so the UI can show a calm
  // "needs an API key" note up front instead of only after a failed press.
  // The reply also says which languages the backend can speak aloud, so a
  // language it cannot read is offered as writing only.
  useEffect(() => {
    let cancelled = false;
    voiceConfigStatus()
      .then((result) => {
        if (cancelled) return;
        setConfigured(Boolean(result?.configured));
        setSpokenLanguages(result?.spokenLanguages ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        setConfigured(false);
        setSpokenLanguages(null);
      });
    return () => {
      cancelled = true;
    };
  }, [voiceConfigStatus]);

  // Null means the server has not answered yet, so nothing is ruled out.
  const canSpeak = canSpeakLanguage(spokenLanguages, language);

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const runTranscription = useCallback(
    async (blob: Blob, mimeType: string) => {
      setStatus("transcribing");
      try {
        const audioBase64 = await blobToBase64(blob);
        const result = await transcribe({ data: { language, mimeType: mimeType || "audio/webm", audioBase64 } });
        if (!activeRef.current) return;
        if (result.error) {
          setNotice(result.error);
        } else {
          onTranscriptRef.current(result.text);
        }
      } catch {
        if (activeRef.current) setNotice("failed");
      } finally {
        if (activeRef.current) setStatus("idle");
      }
    },
    [language, transcribe],
  );

  const stopRecording = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    } else {
      cleanupStream();
      setStatus("idle");
    }
  }, [cleanupStream]);

  const startRecording = useCallback(async () => {
    setNotice(null);
    if (!recordingSupported) {
      setNotice("unsupported");
      return;
    }
    audioRef.current?.pause();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!activeRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      chunksRef.current = [];
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        chunksRef.current = [];
        cleanupStream();
        if (blob.size === 0) {
          setNotice("no-speech");
          setStatus("idle");
          return;
        }
        void runTranscription(blob, type);
      };
      recorder.start();
      setStatus("recording");
      timeoutRef.current = setTimeout(() => stopRecording(), MAX_RECORDING_MS);
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      setNotice(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "failed");
      setStatus("idle");
      cleanupStream();
    }
  }, [cleanupStream, recordingSupported, runTranscription, stopRecording]);

  const stopSpeaking = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    setStatus((current) => (current === "speaking" ? "idle" : current));
  }, []);

  // Plays one clip and resolves when it ends. Returns false when playback
  // fails, so the caller can report it instead of leaving the page speaking.
  const playClip = useCallback((clip: string, mimeType: string) => {
    return new Promise<boolean>((resolve) => {
      const audio = new Audio(`data:${mimeType};base64,${clip}`);
      audioRef.current = audio;
      audio.onended = () => resolve(true);
      audio.onerror = () => resolve(false);
      audio.play().catch(() => resolve(false));
    });
  }, []);

  const speakText = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setNotice(null);
      // A backend that cannot speak this language is not asked to: the answer
      // stays written, and the farmer is told why it was not read aloud.
      if (!canSpeak) {
        setNotice("not-spoken");
        return;
      }
      audioRef.current?.pause();
      setStatus("speaking");
      try {
        const result = await speak({ data: { language, text: trimmed } });
        if (!activeRef.current) return;
        if (result.error || !result.audios?.length) {
          setNotice(result.error ?? "empty");
          setStatus("idle");
          return;
        }
        // An answer can come back as several clips when the speech model caps
        // how much text it accepts, so they are played one after the other.
        for (const clip of result.audios) {
          if (!activeRef.current) return;
          const played = await playClip(clip, result.mimeType);
          if (!played) {
            setNotice("failed");
            setStatus("idle");
            return;
          }
        }
        if (activeRef.current) setStatus("idle");
      } catch {
        if (activeRef.current) {
          setNotice("failed");
          setStatus("idle");
        }
      }
    },
    [canSpeak, language, speak],
  );

  const clearNotice = useCallback(() => setNotice(null), []);

  return { status, notice, recordingSupported, configured, canSpeak, startRecording, stopRecording, speakText, stopSpeaking, clearNotice };
}
