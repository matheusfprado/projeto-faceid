"use client";

import { FC, useMemo } from "react";

import type { FaceSnapshot } from "@/hooks/useFaceTracking";

const AVATAR_PRESETS = [
  {
    id: "neon",
    label: "Neon Pulse",
    colors: ["#f472b6", "#c084fc", "#60a5fa"],
  },
  {
    id: "citrus",
    label: "Citrus Flux",
    colors: ["#fbbf24", "#f97316", "#f43f5e"],
  },
  {
    id: "aqua",
    label: "Aqua Vibe",
    colors: ["#5eead4", "#38bdf8", "#818cf8"],
  },
];

const getMouthClass = (expression?: string | null) => {
  if (!expression) return "face-mouth-neutral";
  if (expression.includes("happy") || expression.includes("smile")) return "face-mouth-happy";
  if (expression.includes("sad") || expression.includes("angry")) return "face-mouth-sad";
  if (expression.includes("surprise")) return "face-mouth-surprise";
  return "face-mouth-neutral";
};

interface Props {
  faceSnapshot: FaceSnapshot | null;
  recognition: string | null;
}

export const AnimatedFacePanel: FC<Props> = ({ faceSnapshot, recognition }) => {
  const expression = faceSnapshot?.expression ?? null;
  const attention = faceSnapshot ? Math.min(1, faceSnapshot.attentionScore) : 0.3;

  const avatars = useMemo(
    () =>
      AVATAR_PRESETS.map((preset, index) => {
        const blend = ((attention + index * 0.2) % 1).toFixed(2);
        const gradient = `linear-gradient(135deg, ${preset.colors.join(", ")})`;
        return { ...preset, gradient, blend };
      }),
    [attention]
  );

  return (
    <div className="face-panel">
      {avatars.map((avatar) => (
        <div key={avatar.id} className="face-avatar" style={{ backgroundImage: avatar.gradient }}>
          <div className="face-gloss" />
          <div className="face-eye face-eye-left" />
          <div className="face-eye face-eye-right" />
          <div className={`face-mouth ${getMouthClass(expression)}`} />
          <div className="face-cheek face-cheek-left" />
          <div className="face-cheek face-cheek-right" />
          <div className="face-ring" style={{ animationDelay: `${Number(avatar.blend) * 2}s` }} />
          <div className="face-caption">
            <div className="text-white text-sm font-semibold">{recognition ?? "Avatar"}</div>
            <div className="text-xs text-gray-200/80">{avatar.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
};
