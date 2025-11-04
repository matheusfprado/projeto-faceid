"use client";

import { useEffect, useMemo, useState } from "react";

import { FaceSnapshot } from "./useFaceTracking";
import { AudioSnapshot } from "./useAudioSignature";

export interface MultimodalSample {
  timestamp: number;
  faces: number;
  recognition: string | null;
  expression: string | null;
  attentionScore: number;
  audioEnergy: number;
  pitch: number;
  variability: number;
}

interface AnalyticsMetrics {
  engagement: number;
  presence: number;
  vocalEnergy: number;
  dominantEmotion: string;
}

const MAX_SAMPLES = 60;

export const useAnalyticsStore = (faceSnapshot: FaceSnapshot | null, audioSnapshot: AudioSnapshot | null) => {
  const [timeline, setTimeline] = useState<MultimodalSample[]>([]);

  useEffect(() => {
    if (!faceSnapshot && !audioSnapshot) return;
    setTimeline((prev) => {
      const merged: MultimodalSample = {
        timestamp: faceSnapshot?.timestamp ?? audioSnapshot?.timestamp ?? Date.now(),
        faces: faceSnapshot?.faces ?? prev.at(-1)?.faces ?? 0,
        recognition: faceSnapshot?.recognition ?? prev.at(-1)?.recognition ?? null,
        expression: faceSnapshot?.expression ?? prev.at(-1)?.expression ?? null,
        attentionScore: faceSnapshot?.attentionScore ?? prev.at(-1)?.attentionScore ?? 0,
        audioEnergy: audioSnapshot?.volume ?? prev.at(-1)?.audioEnergy ?? 0,
        pitch: audioSnapshot?.pitch ?? prev.at(-1)?.pitch ?? 0,
        variability: audioSnapshot?.variability ?? prev.at(-1)?.variability ?? 0,
      };

      const next = [...prev, merged].slice(-MAX_SAMPLES);
      return next;
    });
  }, [audioSnapshot, faceSnapshot]);

  const metrics: AnalyticsMetrics = useMemo(() => {
    if (timeline.length === 0) {
      return { engagement: 0, presence: 0, vocalEnergy: 0, dominantEmotion: "indefinido" };
    }
    const facesAvg = timeline.reduce((acc, s) => acc + s.faces, 0) / timeline.length;
    const attentionAvg = timeline.reduce((acc, s) => acc + s.attentionScore, 0) / timeline.length;
    const vocalAvg = timeline.reduce((acc, s) => acc + s.audioEnergy, 0) / timeline.length;

    const expressionMap = new Map<string, number>();
    timeline.forEach((sample) => {
      if (!sample.expression) return;
      expressionMap.set(sample.expression, (expressionMap.get(sample.expression) ?? 0) + 1);
    });
    const expressionEntries = Array.from(expressionMap.entries());
    const dominant = expressionEntries.sort((a, b) => b[1] - a[1])[0]?.[0] ?? "indefinido";

    return {
      engagement: Number(Math.min(1, attentionAvg).toFixed(2)),
      presence: Number(Math.min(1, facesAvg / 2).toFixed(2)),
      vocalEnergy: Number(Math.min(1, vocalAvg * 4).toFixed(2)),
      dominantEmotion: dominant,
    };
  }, [timeline]);

  // optional sync with API for audit
  useEffect(() => {
    if (timeline.length === 0) return;
    const last = timeline.at(-1);
    if (!last) return;
    const controller = new AbortController();
    const send = async () => {
      try {
        await fetch("/api/analytics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(last),
          signal: controller.signal,
        });
      } catch (err) {
        // ignore network errors for local prototype
      }
    };
    const id = setTimeout(send, 500);
    return () => {
      clearTimeout(id);
      controller.abort();
    };
  }, [timeline]);

  return {
    timeline,
    metrics,
    clear: () => setTimeline([]),
  };
};

export type AnalyticsController = ReturnType<typeof useAnalyticsStore>;
