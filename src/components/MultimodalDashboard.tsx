"use client";

import { FC, useMemo } from "react";

import type { AnalyticsController } from "@/hooks/useAnalyticsStore";

interface MultimodalDashboardProps {
  analytics: AnalyticsController;
}

const Sparkline = ({ values, color }: { values: number[]; color: string }) => {
  if (values.length === 0) return <div className="h-16 w-full rounded bg-white/5" />;
  const width = 200;
  const height = 60;
  const max = Math.max(...values, 1);
  const points = values.map((v, idx) => {
    const x = (idx / (values.length - 1 || 1)) * width;
    const y = height - (v / max) * height;
    return `${x},${y}`;
  });
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-16 w-full">
      <polyline fill="none" stroke={color} strokeWidth="3" points={points.join(" ")} strokeLinejoin="round" strokeLinecap="round" />
      <polyline
        fill={`${color}11`}
        stroke="none"
        points={`0,${height} ${points.join(" ")} ${width},${height}`}
      />
    </svg>
  );
};

export const MultimodalDashboard: FC<MultimodalDashboardProps> = ({ analytics }) => {
  const { timeline, metrics } = analytics;

  const cards = useMemo(
    () => [
      { label: "Engajamento", value: `${(metrics.engagement * 100).toFixed(0)}%`, description: "Score facial normalizado" },
      { label: "Presença", value: `${(metrics.presence * 100).toFixed(0)}%`, description: "Faces em quadro" },
      { label: "Energia vocal", value: `${(metrics.vocalEnergy * 100).toFixed(0)}%`, description: "Volume relativo" },
      { label: "Expressão dominante", value: metrics.dominantEmotion, description: "Histórico recente" },
    ],
    [metrics]
  );

  return (
    <section className="mt-10 rounded-3xl border border-white/10 bg-gray-900/70 p-6 backdrop-blur">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm uppercase tracking-[0.3em] text-sky-400">Analytics</div>
          <h2 className="text-3xl font-semibold">Console multimodal em tempo real</h2>
        </div>
        <button onClick={analytics.clear} className="rounded-full border border-white/20 px-4 py-2 text-sm text-gray-200 hover:bg-white/10">
          Resetar timeline
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-white/5 bg-white/5 p-4 shadow-inner">
            <div className="text-xs uppercase tracking-wider text-gray-400">{card.label}</div>
            <div className="text-2xl font-bold text-white">{card.value}</div>
            <div className="text-xs text-gray-400">{card.description}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
          <h3 className="text-lg font-semibold text-white">Timeline facial (attention)</h3>
          <Sparkline values={timeline.map((s) => s.attentionScore)} color="#38bdf8" />
          <div className="mt-4 space-y-3 text-sm text-gray-300">
            {timeline.slice(-5).map((sample) => (
              <div key={sample.timestamp} className="flex items-center justify-between border-b border-white/5 pb-2 last:border-b-0 last:pb-0">
                <span className="text-xs text-gray-400">{new Date(sample.timestamp).toLocaleTimeString()}</span>
                <span>{sample.recognition ?? "—"}</span>
                <span className="text-sky-300">{(sample.attentionScore * 100).toFixed(0)}%</span>
                <span className="text-emerald-300">{sample.expression ?? "neutro"}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
          <h3 className="text-lg font-semibold text-white">Timeline sonora (pitch / energia)</h3>
          <Sparkline values={timeline.map((s) => s.audioEnergy)} color="#f472b6" />
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-gray-300">
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-400">Pitch médio</div>
              <div className="text-2xl font-bold text-white">
                {timeline.length ? (timeline.reduce((acc, s) => acc + s.pitch, 0) / timeline.length).toFixed(1) : "0"} Hz
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-400">Variabilidade</div>
              <div className="text-2xl font-bold text-white">
                {timeline.length ? (timeline.reduce((acc, s) => acc + s.variability, 0) / timeline.length).toFixed(2) : "0"}
              </div>
            </div>
          </div>
          <div className="mt-4 text-xs text-gray-400">
            A linha mostra oscilações de energia vocal. Combine com os eventos faciais para identificar momentos de alto engajamento.
          </div>
        </div>
      </div>
    </section>
  );
};
