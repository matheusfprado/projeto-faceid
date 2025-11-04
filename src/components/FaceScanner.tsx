"use client";

import { FC, useState } from "react";
import Webcam from "react-webcam";

import type { AudioSignatureController } from "@/hooks/useAudioSignature";
import type { FaceTrackingController } from "@/hooks/useFaceTracking";
import { AnimatedFacePanel } from "@/components/AnimatedFacePanel";

interface FaceScannerProps {
  controller: FaceTrackingController;
  audio: AudioSignatureController;
}

export const FaceScanner: FC<FaceScannerProps> = ({ controller, audio }) => {
  const [visualMode, setVisualMode] = useState<"camera" | "avatar">("avatar");
  const {
    webcamRef,
    canvasRef,
    particlesCanvasRef,
    capture,
    addTemplate,
    removeTemplate,
    templates,
    history,
    threshold,
    setThreshold,
    overlayMode,
    setOverlayMode,
    clearAllData,
    recognition,
    expression,
    status,
    faceSnapshot,
  } = controller;

  return (
    <section className="relative z-20">
      <canvas ref={particlesCanvasRef} className="pointer-events-none absolute inset-0 h-full w-full opacity-70" />
      <div className="relative rounded-3xl border border-white/10 bg-gray-900/80 p-6 backdrop-blur">
        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          <div className="flex-1">
            <div className="text-sm uppercase tracking-[0.2em] text-sky-400">Scanner multimodal</div>
            <h2 className="mt-2 text-3xl font-semibold">Laboratório de reconhecimento + áudio</h2>
            <p className="mt-1 text-gray-300">{status}</p>
            <p className="text-sm text-gray-400">
              {recognition ? `Reconhecido: ${recognition}` : "Aguardando reconhecimento"}{" "}
              {expression ? `• Expressão dominante: ${expression}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {(["landmarks", "mask", "wireframe"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setOverlayMode(mode)}
                className={`rounded-full px-3 py-1 uppercase tracking-wide ${
                  overlayMode === mode ? "bg-sky-500 text-white" : "bg-white/10 text-gray-300"
                }`}
              >
                {mode}
              </button>
            ))}
            <div className="ml-auto flex gap-2">
              {(["camera", "avatar"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setVisualMode(mode)}
                  className={`rounded-full px-3 py-1 uppercase tracking-wide ${
                    visualMode === mode ? "bg-emerald-500 text-white" : "bg-white/10 text-gray-300"
                  }`}
                >
                  {mode === "camera" ? "Live" : "Avatares"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-2xl">
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/png"
              videoConstraints={{ facingMode: "user" }}
              className={`h-full w-full transition duration-500 ${
                visualMode === "avatar" ? "opacity-0" : "opacity-100"
              }`}
            />
            <canvas
              ref={canvasRef}
              className={`pointer-events-none absolute inset-0 h-full w-full transition duration-500 ${
                visualMode === "avatar" ? "opacity-0" : "opacity-100"
              }`}
            />
            {visualMode === "avatar" && (
              <div className="absolute inset-0 flex flex-col justify-center rounded-2xl bg-black/60 p-6">
                <AnimatedFacePanel faceSnapshot={faceSnapshot} recognition={recognition} />
              </div>
            )}
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center text-xs text-gray-300">
              {visualMode === "avatar"
                ? "Modo avatar ligado: sua câmera continua ativa apenas para a IA, mas exibimos rostos sintéticos."
                : "Modo câmera: feed real + overlay da IA."}
            </p>
          </div>
          <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-gray-200">
            <div>
              <label className="text-xs uppercase tracking-wider text-gray-400">Threshold</label>
              <div className="mt-1 flex items-center gap-3">
                <input
                  type="range"
                  min={0.3}
                  max={1}
                  step={0.01}
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full accent-sky-500"
                />
                <span className="text-lg font-semibold text-white">{threshold.toFixed(2)}</span>
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <button onClick={capture} className="rounded-xl bg-sky-600 py-2 font-semibold hover:bg-sky-500">
                Capturar quadro
              </button>
              <button onClick={addTemplate} className="rounded-xl bg-emerald-600 py-2 font-semibold hover:bg-emerald-500">
                Salvar template
              </button>
              <button onClick={clearAllData} className="rounded-xl bg-red-600 py-2 font-semibold hover:bg-red-500">
                Limpar dados
              </button>
              <button onClick={audio.toggle} className="rounded-xl border border-sky-400 py-2 font-semibold text-sky-200">
                {audio.enabled ? "Pausar áudio" : "Ativar áudio"}
              </button>
            </div>
            {audio.error && <p className="text-xs text-red-300">{audio.error}</p>}
            {audio.snapshot && audio.enabled && (
              <div className="rounded-xl bg-black/30 p-3">
                <div className="text-xs uppercase tracking-wider text-gray-400">Audio stream</div>
                <div className="mt-2 flex justify-between text-white">
                  <div>
                    <div className="text-sm text-gray-400">Volume</div>
                    <div className="text-xl font-bold">{(audio.snapshot.volume * 100).toFixed(0)}%</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Pitch</div>
                    <div className="text-xl font-bold">{audio.snapshot.pitch.toFixed(0)} Hz</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Estado</div>
                    <div className="text-xl font-bold capitalize">{audio.snapshot.emotionHint}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Histórico recente</h3>
              <span className="text-xs text-gray-400">Últimos {history.length} registros</span>
            </div>
            {history.length === 0 ? (
              <p className="mt-4 text-sm text-gray-400">Capture novos quadros para alimentar o dataset.</p>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {history.map((item) => (
                  <div key={item.id} className="overflow-hidden rounded-xl border border-white/10 bg-white/5 text-xs text-gray-300">
                    <img src={item.dataUrl} alt="captura" className="h-24 w-full object-cover" />
                    <div className="p-2">{item.date}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Templates cadastrados</h3>
              <span className="text-xs text-gray-400">{templates.length} perfis</span>
            </div>
            {templates.length === 0 ? (
              <p className="mt-4 text-sm text-gray-400">Nenhum template salvo.</p>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {templates.map((tpl) => (
                  <div key={tpl.id} className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-gray-200">
                    <img src={tpl.dataUrl} alt={tpl.name} className="h-28 w-full rounded-lg object-cover" />
                    <div className="mt-2 font-semibold">{tpl.name}</div>
                    <div className="text-xs text-gray-400">{tpl.date}</div>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText(tpl.name);
                        }}
                        className="flex-1 rounded-lg bg-sky-600 py-1 text-xs font-semibold hover:bg-sky-500"
                      >
                        Copiar
                      </button>
                      <button
                        onClick={() => removeTemplate(tpl.id)}
                        className="flex-1 rounded-lg bg-red-600 py-1 text-xs font-semibold hover:bg-red-500"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
