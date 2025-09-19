/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import "@tensorflow/tfjs-backend-webgl";
import Webcam from "react-webcam";
import { Dialog, Transition } from "@headlessui/react";
import Image from "next/image";
import identiface from "@/img/identiface.png";
import faceapi from "face-api.js";

interface CaptureItem {
  id: string;
  dataUrl: string;
  date: string;
}

interface TemplateItem {
  id: string;
  name: string;
  descriptor: number[]; // Float32Array serializado
  dataUrl: string;
  date: string;
}

export default function Home() {
  // === State / UI ===
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [status, setStatus] = useState("Inicializando...");
  const [history, setHistory] = useState<CaptureItem[]>([]);
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [recognition, setRecognition] = useState<string | null>(null);
  const [expression, setExpression] = useState<string | null>(null);
  const [threshold, setThreshold] = useState<number>(0.6);

  // === Refs ===
  const webcam = useRef<Webcam | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const particlesCanvas = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const particlesRef = useRef<any[]>([]);

  const HISTORY_KEY = "faceHistory_v1";
  const TEMPLATES_KEY = "faceTemplates_v1";
  const PRIVACY_KEY = "privacyAccepted";

  // === Load saved data ===
  useEffect(() => {
    const accepted = localStorage.getItem(PRIVACY_KEY);
    if (!accepted) setShowPrivacy(true);
    else setPrivacyAccepted(true);

    const savedHistory = localStorage.getItem(HISTORY_KEY);
    if (savedHistory) setHistory(JSON.parse(savedHistory));

    const savedTemplates = localStorage.getItem(TEMPLATES_KEY);
    if (savedTemplates) setTemplates(JSON.parse(savedTemplates));
  }, []);

  const saveHistory = (list: CaptureItem[]) => {
    setHistory(list);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  };

  const saveTemplates = (list: TemplateItem[]) => {
    setTemplates(list);
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(list));
  };

  // === Privacy handlers ===
  const acceptPrivacy = () => {
    localStorage.setItem(PRIVACY_KEY, "true");
    setPrivacyAccepted(true);
    setShowPrivacy(false);
  };

  const clearAllData = () => {
    if (!confirm("Deseja apagar TODOS os dados (histórico e templates)?")) return;
    localStorage.removeItem(HISTORY_KEY);
    localStorage.removeItem(TEMPLATES_KEY);
    setHistory([]);
    setTemplates([]);
    setRecognition(null);
    setExpression(null);
    setToast("Todos os dados foram removidos.");
    setPrivacyAccepted(false);
    setShowPrivacy(true);
  };

  // === Particle system ===
  const initParticles = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const arr: any[] = [];
    for (let i = 0; i < 50; i++) {
      arr.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        r: Math.random() * 2 + 1,
      });
    }
    particlesRef.current = arr;
  };

  const drawParticles = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.clearRect(0, 0, w, h);
    const particles = particlesRef.current;
    particles.forEach((p: any, i: number) => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
      ctx.fillStyle = "rgba(0,200,255,0.7)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
        if (dist < 80) {
          ctx.strokeStyle = `rgba(0,200,255,${1 - dist / 80})`;
          ctx.lineWidth = 0.4;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
    });
  };

  const runParticleLoop = () => {
    const c = particlesCanvas.current;
    const ctx = c?.getContext("2d");
    if (!ctx || !c) return;
    drawParticles(ctx, c.width, c.height);
    requestAnimationFrame(runParticleLoop);
  };

  // === Face-api models ===
  const loadFaceApiModels = async () => {
    try {
      setStatus("Carregando modelos da IA...");
      const MODEL_URL = "/models";
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
      setStatus("Modelos carregados ✅");
    } catch (err) {
      console.error("Erro ao carregar modelos face-api:", err);
      setStatus("Erro ao carregar modelos (ver console).");
      setToast("Erro ao carregar modelos de IA.");
    }
  };

  const computeDescriptorFromVideo = async (): Promise<Float32Array | null> => {
    const video = webcam.current?.video as HTMLVideoElement | undefined;
    if (!video || video.readyState !== 4) return null;
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
    const result = await faceapi
      .detectSingleFace(video, options)
      .withFaceLandmarks()
      .withFaceDescriptor()
      .withFaceExpressions();
    return result ? result.descriptor : null;
  };

  const euclideanDistance = (a: number[] | Float32Array, b: number[] | Float32Array) => {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += ((a as any)[i] - (b as any)[i]) ** 2;
    }
    return Math.sqrt(sum);
  };

  const addTemplate = async () => {
    const name = prompt("Nome para este template (ex: Matheus):");
    if (!name) return;
    setStatus("Gerando descriptor...");
    const descriptor = await computeDescriptorFromVideo();
    if (!descriptor) {
      setToast("Nenhuma face detectada para salvar.");
      setStatus("Nenhuma face detectada");
      return;
    }
    const dataUrl = webcam.current?.getScreenshot();
    if (!dataUrl) {
      setToast("Erro ao capturar imagem.");
      return;
    }
    const tpl: TemplateItem = {
      id: Date.now().toString(),
      name,
      descriptor: Array.from(descriptor),
      dataUrl,
      date: new Date().toLocaleString(),
    };
    const updated = [tpl, ...templates];
    saveTemplates(updated);
    setToast(`Template "${name}" salvo!`);
    setStatus("Template salvo");
  };

  const handleRemoveTemplate = (id: string) => {
    if (!confirm("Remover template?")) return;
    const updated = templates.filter((t) => t.id !== id);
    saveTemplates(updated);
    setToast("Template removido.");
  };

  // === Detect loop ===
  const detectLoop = async () => {
    const video = webcam.current?.video as HTMLVideoElement | undefined;
    const canvasEl = canvas.current;
    if (!video || !canvasEl) {
      animationRef.current = requestAnimationFrame(detectLoop);
      return;
    }
    if (video.readyState === 4) {
      const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
      const detections = await faceapi
        .detectAllFaces(video, options)
        .withFaceLandmarks()
        .withFaceExpressions()
        .withFaceDescriptors();

      setStatus(detections.length ? `Rosto detectado ✅ (${detections.length})` : "Nenhum rosto encontrado");

      const ctx = canvasEl.getContext("2d");
      if (ctx) {
        if (canvasEl.width !== video.videoWidth || canvasEl.height !== video.videoHeight) {
          canvasEl.width = video.videoWidth;
          canvasEl.height = video.videoHeight;
        }
        ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

        // rectangle guide
        const rectW = video.videoWidth / 2;
        const rectH = video.videoHeight / 2;
        const rectX = video.videoWidth / 4;
        const rectY = video.videoHeight / 4;
        let inside = false;
        detections.forEach((d) => {
          const box = d.detection.box;
          if (box.x > rectX && box.y > rectY && box.x + box.width < rectX + rectW && box.y + box.height < rectY + rectH) {
            inside = true;
          }
        });
        ctx.strokeStyle = inside ? "rgba(0,255,0,0.9)" : "rgba(255,0,0,0.5)";
        ctx.lineWidth = 3;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 12;
        ctx.strokeRect(rectX, rectY, rectW, rectH);

        // landmarks + expressions overlay
        detections.forEach((d: any) => {
          const pts = d.landmarks.positions;
          for (let i = 0; i < pts.length; i++) {
            const p = pts[i];
            ctx.fillStyle = `hsl(${(Date.now() / 15 + i * 7) % 360},100%,60%)`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 1.8 + Math.sin(Date.now() / 200 + i) * 0.8, 0, Math.PI * 2);
            ctx.fill();
          }

          if (d.expressions) {
            const expressions = d.expressions as Record<string, number>;
            const entries = Object.entries(expressions);
            if (entries.length > 0) {
              const [expr, score] = entries.reduce((a, b) => (b[1] > a[1] ? b : a));
              ctx.fillStyle = "#fff";
              ctx.font = "16px sans-serif";
              ctx.fillText(`${expr} (${(score * 100).toFixed(1)}%)`, d.detection.box.x, d.detection.box.y - 8);
              setExpression(expr);
            }
          } else setExpression(null);
        });

        // recognition
        if (templates.length > 0 && detections.length > 0) {
          const desc = detections[0].descriptor;
          let best = { name: null as string | null, dist: Infinity };
          for (const t of templates) {
            const d = euclideanDistance(t.descriptor, desc);
            if (d < best.dist) best = { name: t.name, dist: d };
          }
          if (best.dist < threshold) setRecognition(`${best.name} (dist:${best.dist.toFixed(3)})`);
          else setRecognition(null);
        } else setRecognition(null);
      }
    }

    animationRef.current = requestAnimationFrame(detectLoop);
  };

  // === Capture ===
  const capture = useCallback(() => {
    const imageSrc = webcam.current?.getScreenshot();
    if (!imageSrc) {
      setToast("Não foi possível capturar a imagem.");
      return;
    }
    const newItem: CaptureItem = { id: Date.now().toString(), dataUrl: imageSrc, date: new Date().toLocaleString() };
    const updated = [newItem, ...history].slice(0, 10);
    saveHistory(updated);
    setToast("Rosto capturado!");
  }, [history]);

  // === Lifecycle ===
  useEffect(() => {
    let mounted = true;
    (async () => {
      await loadFaceApiModels();
      if (!mounted) return;

      const pc = particlesCanvas.current;
      if (pc) {
        pc.width = window.innerWidth;
        pc.height = window.innerHeight;
        const pctx = pc.getContext("2d");
        if (pctx) {
          initParticles(pctx, pc.width, pc.height);
          runParticleLoop();
        }
      }
      animationRef.current = requestAnimationFrame(detectLoop);
    })();

    return () => {
      mounted = false;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  // === Toast auto-hide ===
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  // === UI rendering ===
  return (
    <div className="bg-gray-900 min-h-screen text-white relative overflow-hidden">
      <canvas ref={particlesCanvas} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 0 }} />
      <header className="absolute inset-x-0 top-0 z-30">
        <div className="flex justify-center pt-6">
          <Image src={identiface.src} alt="logo" height={120} width={220} />
        </div>
      </header>

      {/* Privacy modal */}
      {showPrivacy && (
        <Dialog open={showPrivacy} onClose={() => {}} className="relative z-40">
          <div className="fixed inset-0 bg-black/40" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="mx-auto max-w-md rounded bg-white p-6 text-black">
              <Dialog.Title className="text-lg font-bold">Política de Privacidade</Dialog.Title>
              <Dialog.Description className="mt-2 text-sm">
                Este app processa sua imagem localmente no navegador. Modelos são carregados do diretório <code>/models</code>.
                Nenhum dado é enviado a servidores externos por padrão.
              </Dialog.Description>
              <div className="mt-4 flex gap-2">
                <button onClick={acceptPrivacy} className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-800">Aceitar</button>
                <button onClick={() => { setShowPrivacy(false); }} className="rounded bg-gray-200 px-4 py-2">Fechar</button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      )}

      <main className="relative z-20 pt-32 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold">IA de Reconhecimento Facial</h1>
          <p className="mt-2 text-gray-300">
            {status} {recognition ? ` — ${recognition}` : ""} {expression ? ` — Expressão: ${expression}` : ""}
          </p>

          <div className="mt-6 max-w-md mx-auto relative shadow-xl rounded-lg overflow-hidden">
            <Webcam
              audio={false}
              ref={webcam}
              screenshotFormat="image/png"
              videoConstraints={{ facingMode: "user" }}
              style={{ width: "100%", height: "auto", display: "block" }}
            />
            <canvas ref={canvas} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} />
          </div>

          <div className="mt-4 flex flex-wrap gap-3 justify-center items-center">
            <button onClick={capture} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded">Capturar</button>
            <button onClick={addTemplate} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded">Salvar como template</button>
            <button onClick={clearAllData} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded">Limpar tudo</button>
            <div className="flex items-center gap-2 ml-2">
              <label className="text-sm text-gray-300">Threshold</label>
              <input type="range" min={0.3} max={1} step={0.01} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} />
              <span className="text-sm ml-1 text-gray-200">{threshold.toFixed(2)}</span>
            </div>
          </div>

          {/* Histórico */}
          {history.length > 0 && (
            <section className="mt-8">
              <h2 className="text-xl font-semibold mb-2">Histórico de capturas</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {history.map((h) => (
                  <div key={h.id} className="bg-gray-800 p-2 rounded">
                    <img src={h.dataUrl} alt="captura" className="w-full rounded mb-1" />
                    <div className="text-xs text-gray-400">{h.date}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Templates */}
          <section className="mt-8">
            <h2 className="text-xl font-semibold mb-2">Templates salvos</h2>
            {templates.length === 0 ? (
              <div className="text-gray-400">Nenhum template salvo.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {templates.map((t) => (
                  <div key={t.id} className="bg-gray-800 p-2 rounded">
                    <img src={t.dataUrl} alt={t.name} className="w-full rounded mb-1" />
                    <div className="flex items-center justify-between">
                      <div className="text-sm">{t.name}</div>
                      <div className="flex gap-1">
                        <button onClick={() => { navigator.clipboard?.writeText(t.name); setToast("Nome copiado"); }} className="text-xs px-2 py-1 bg-sky-600 rounded">copiar</button>
                        <button onClick={() => handleRemoveTemplate(t.id)} className="text-xs px-2 py-1 bg-red-500 rounded">remover</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Toast */}
      <Transition show={!!toast} enter="transition duration-200" leave="transition duration-150">
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white text-black rounded-lg px-6 py-4 shadow-lg max-w-sm w-full text-center">
            <div className="text-lg font-medium">{toast}</div>
            <div className="mt-3 flex justify-center">
              <button onClick={() => setToast(null)} className="px-4 py-1 bg-blue-600 text-white rounded">OK</button>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  );
}
