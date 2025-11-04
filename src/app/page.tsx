/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect } from "react";
import Image from "next/image";
import { Transition } from "@headlessui/react";

import { FaceScanner } from "@/components/FaceScanner";
import { MultimodalDashboard } from "@/components/MultimodalDashboard";
import { ConsentModal } from "@/components/ConsentModal";
import { useFaceTracking } from "@/hooks/useFaceTracking";
import { useAudioSignature } from "@/hooks/useAudioSignature";
import { useAnalyticsStore } from "@/hooks/useAnalyticsStore";

import identiface from "@/img/identiface.png";

export default function Home() {
  const tracking = useFaceTracking();
  const audio = useAudioSignature();
  const analytics = useAnalyticsStore(tracking.faceSnapshot, audio.snapshot);

  const { toast, setToast, showPrivacy, setShowPrivacy, acceptPrivacy } = tracking;

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast, setToast]);

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white">
      <ConsentModal open={showPrivacy} onAccept={acceptPrivacy} onClose={() => setShowPrivacy(false)} />

      <header className="relative z-30">
        <div className="flex flex-col items-center gap-3 pt-10 text-center">
          <Image src={identiface.src} alt="logo" height={120} width={220} style={{ height: "auto", width: "auto" }} />
          <p className="text-sm uppercase tracking-[0.3em] text-sky-400">Infinity Identiface</p>
          <h1 className="max-w-4xl text-4xl font-bold md:text-5xl">Ferramenta de análise facial multimodal</h1>
          <p className="max-w-3xl text-base text-gray-300">
            Pipeline de visão computacional + áudio em tempo real para laboratórios de biometria, benchmarking de expressões, medição de
            engajamento e experiências imersivas. Tudo direto no browser.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-400">
            <span>Modelos locais</span>
            <span>Reconhecimento + expressões</span>
            <span>Audio fingerprint</span>
            <span>Dashboard de métricas</span>
          </div>
        </div>
      </header>

      <main className="relative z-20 mx-auto mt-12 flex max-w-6xl flex-col gap-10 px-4 pb-20">
        <FaceScanner controller={tracking} audio={audio} />
        <MultimodalDashboard analytics={analytics} />

        <section className="rounded-3xl border border-white/10 bg-gray-900/60 p-6 backdrop-blur">
          <div className="text-sm uppercase tracking-[0.3em] text-sky-400">Blueprint</div>
          <h2 className="mt-2 text-2xl font-semibold">Como expandir esta plataforma</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Pipelines paralelos",
                desc: "Modele workers específicos para landmarks, detecção de fadiga e rastreamento de olhar usando MediaPipe Tasks.",
              },
              {
                title: "Streaming/WebRTC",
                desc: "Envie snapshots assinados para o backend via WebRTC DataChannel ou gRPC-Web para auditoria e integrações IoT.",
              },
              {
                title: "Playbooks de ética",
                desc: "Inclua camadas de consentimento granular, criptografia e relatórios auditáveis para conformidade LGPD/GDPR.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/5 bg-white/5 p-4 text-sm text-gray-200">
                <div className="text-lg font-semibold text-white">{item.title}</div>
                <p className="mt-2 text-gray-300">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Transition show={!!toast} enter="transition duration-200" leave="transition duration-150">
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-full max-w-sm rounded-2xl bg-white px-6 py-4 text-center text-gray-900 shadow-xl">
            <div className="text-lg font-medium">{toast}</div>
            <div className="mt-3 flex justify-center">
              <button onClick={() => setToast(null)} className="rounded-full bg-blue-600 px-4 py-1 text-white">
                OK
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  );
}
