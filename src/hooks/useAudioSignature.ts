"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface AudioSnapshot {
  timestamp: number;
  volume: number;
  pitch: number;
  variability: number;
  emotionHint: "calmo" | "energético" | "neutro";
}

const AUTO_CORRELATION_MIN_SAMPLES = 0;
const AUTO_CORRELATION_MAX_SAMPLES = 1024;

const detectPitch = (buf: Float32Array, sampleRate: number) => {
  let bestOffset = -1;
  let bestCorrelation = 0;
  const size = buf.length;
  let rms = 0;
  for (let i = 0; i < size; i++) {
    const val = buf[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / size);
  if (rms < 0.01) return 0;

  let lastCorrelation = 1;
  for (let offset = AUTO_CORRELATION_MIN_SAMPLES; offset < AUTO_CORRELATION_MAX_SAMPLES; offset++) {
    let correlation = 0;

    for (let i = 0; i < size - offset; i++) correlation += Math.abs(buf[i] - buf[i + offset]);

    correlation = 1 - correlation / (size - offset);
    if (correlation > 0.9 && correlation > lastCorrelation) {
      bestCorrelation = correlation;
      bestOffset = offset;
    } else if (bestCorrelation > 0.92 && correlation < bestCorrelation) {
      const frequency = sampleRate / bestOffset;
      return frequency;
    }
    lastCorrelation = correlation;
  }
  if (bestCorrelation > 0.92) {
    const frequency = sampleRate / bestOffset;
    return frequency;
  }
  return 0;
};

export const useAudioSignature = () => {
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<AudioSnapshot | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Float32Array | null>(null);
  const rafRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const lastEmitRef = useRef(0);

  const loop = useCallback(() => {
    const analyser = analyserRef.current;
    const buffer = dataArrayRef.current;
    const ctx = audioContextRef.current;
    if (!analyser || !buffer || !ctx) return;
    analyser.getFloatTimeDomainData(buffer);

    let sum = 0;
    for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
    const volume = Math.sqrt(sum / buffer.length);

    const pitch = detectPitch(buffer, ctx.sampleRate);

    const variability = Number((volume * 10 + pitch / 800).toFixed(3));
    const emotionHint = pitch > 220 ? "energético" : pitch > 80 ? "neutro" : "calmo";

    const now = performance.now();
    if (now - lastEmitRef.current > 80) {
      lastEmitRef.current = now;
      setSnapshot({
        timestamp: Date.now(),
        volume: Number(volume.toFixed(3)),
        pitch: Number(pitch.toFixed(1)),
        variability,
        emotionHint,
      });
    }

    rafRef.current = requestAnimationFrame(loop);
  }, []);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    analyserRef.current?.disconnect();
    audioContextRef.current?.close();
    audioContextRef.current = null;
    dataArrayRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    setEnabled(false);
  }, []);

  const start = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      mediaStreamRef.current = stream;
      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;
      dataArrayRef.current = new Float32Array(analyser.fftSize);
      source.connect(analyser);
      setEnabled(true);
      rafRef.current = requestAnimationFrame(loop);
    } catch (err) {
      console.error("Erro ao iniciar captura de áudio", err);
      setError("Não foi possível acessar o microfone.");
      stop();
    }
  }, [loop, stop]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return {
    enabled,
    error,
    snapshot,
    start,
    stop,
    toggle: () => (enabled ? stop() : start()),
  };
};

export type AudioSignatureController = ReturnType<typeof useAudioSignature>;
