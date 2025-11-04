"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "@tensorflow/tfjs-backend-webgl";
import Webcam from "react-webcam";
import * as faceapi from "face-api.js";

import { draw as drawMaskLayer } from "@/app/mask";

export interface CaptureItem {
  id: string;
  dataUrl: string;
  date: string;
}

export interface TemplateItem {
  id: string;
  name: string;
  descriptor: number[];
  dataUrl: string;
  date: string;
}

export type OverlayMode = "landmarks" | "mask" | "wireframe";

export interface FaceSnapshot {
  timestamp: number;
  faces: number;
  recognition: string | null;
  expression: string | null;
  attentionScore: number;
  descriptorDistance: number | null;
}

const HISTORY_KEY = "faceHistory_v2";
const TEMPLATES_KEY = "faceTemplates_v2";
const PRIVACY_KEY = "privacyAccepted_v2";

const MODEL_URL = "/models";

const withBrowser = (cb: () => void) => {
  if (typeof window !== "undefined") cb();
};

export const useFaceTracking = () => {
  const webcamRef = useRef<Webcam | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const particlesAnimationRef = useRef<number | null>(null);
  const particlesRef = useRef<
    Array<{ x: number; y: number; vx: number; vy: number; r: number }>
  >([]);

  const [showPrivacy, setShowPrivacy] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [status, setStatus] = useState("Inicializando...");
  const [history, setHistory] = useState<CaptureItem[]>([]);
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [recognition, setRecognition] = useState<string | null>(null);
  const [expression, setExpression] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(0.6);
  const [overlayMode, setOverlayMode] = useState<OverlayMode>("landmarks");
  const [faceSnapshot, setFaceSnapshot] = useState<FaceSnapshot | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  // hydrate local data
  useEffect(() => {
    withBrowser(() => {
      const accepted = localStorage.getItem(PRIVACY_KEY);
      if (!accepted) setShowPrivacy(true);
      else setPrivacyAccepted(true);

      const savedHistory = localStorage.getItem(HISTORY_KEY);
      if (savedHistory) setHistory(JSON.parse(savedHistory));

      const savedTemplates = localStorage.getItem(TEMPLATES_KEY);
      if (savedTemplates) setTemplates(JSON.parse(savedTemplates));
    });
  }, []);

  const saveHistory = useCallback((list: CaptureItem[]) => {
    setHistory(list);
    withBrowser(() => localStorage.setItem(HISTORY_KEY, JSON.stringify(list)));
  }, []);

  const saveTemplates = useCallback((list: TemplateItem[]) => {
    setTemplates(list);
    withBrowser(() => localStorage.setItem(TEMPLATES_KEY, JSON.stringify(list)));
  }, []);

  const acceptPrivacy = useCallback(() => {
    withBrowser(() => localStorage.setItem(PRIVACY_KEY, "true"));
    setPrivacyAccepted(true);
    setShowPrivacy(false);
  }, []);

  const clearAllData = useCallback(() => {
    if (!confirm("Deseja apagar TODOS os dados (histórico, templates e consentimento)?")) return;
    withBrowser(() => {
      localStorage.removeItem(HISTORY_KEY);
      localStorage.removeItem(TEMPLATES_KEY);
      localStorage.removeItem(PRIVACY_KEY);
    });
    setHistory([]);
    setTemplates([]);
    setRecognition(null);
    setExpression(null);
    setToast("Todos os dados foram removidos.");
    setPrivacyAccepted(false);
    setShowPrivacy(true);
  }, []);

  const initParticles = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const arr: Array<{ x: number; y: number; vx: number; vy: number; r: number }> = [];
    for (let i = 0; i < 60; i++) {
      arr.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        r: Math.random() * 2 + 1,
      });
    }
    particlesRef.current = arr;
  }, []);

  const drawParticles = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.clearRect(0, 0, w, h);
    const particles = particlesRef.current;
    particles.forEach((p, i) => {
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
        if (dist < 90) {
          ctx.strokeStyle = `rgba(0,200,255,${1 - dist / 90})`;
          ctx.lineWidth = 0.4;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
    });
  }, []);

  const runParticleLoop = useCallback(() => {
    const c = particlesCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    drawParticles(ctx, c.width, c.height);
    particlesAnimationRef.current = requestAnimationFrame(runParticleLoop);
  }, [drawParticles]);

  // particles bootstrap
  useEffect(() => {
    const canvas = particlesCanvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    initParticles(ctx, canvas.width, canvas.height);
    runParticleLoop();
    return () => {
      if (particlesAnimationRef.current) cancelAnimationFrame(particlesAnimationRef.current);
    };
  }, [initParticles, runParticleLoop]);

  const computeDescriptorFromVideo = useCallback(async (): Promise<Float32Array | null> => {
    const video = webcamRef.current?.video as HTMLVideoElement | undefined;
    if (!video || video.readyState !== 4) return null;
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
    const result = await faceapi
      .detectSingleFace(video, options)
      .withFaceLandmarks()
      .withFaceDescriptor()
      .withFaceExpressions();
    return result ? result.descriptor : null;
  }, []);

  const euclideanDistance = useCallback((a: number[] | Float32Array, b: number[] | Float32Array) => {
    let sum = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) sum += ((a as any)[i] - (b as any)[i]) ** 2;
    return Math.sqrt(sum);
  }, []);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) {
      setToast("Não foi possível capturar a imagem.");
      return;
    }
    const newItem: CaptureItem = {
      id: Date.now().toString(),
      dataUrl: imageSrc,
      date: new Date().toLocaleString(),
    };
    const updated = [newItem, ...history].slice(0, 12);
    saveHistory(updated);
    setToast("Rosto capturado para o dataset.");
  }, [history, saveHistory]);

  const addTemplate = useCallback(async () => {
    const name = prompt("Nome para este template (ex: Analista 01):");
    if (!name) return;
    setStatus("Gerando descriptor facial...");
    const descriptor = await computeDescriptorFromVideo();
    if (!descriptor) {
      setToast("Nenhuma face detectada para salvar.");
      setStatus("Nenhuma face detectada");
      return;
    }
    const dataUrl = webcamRef.current?.getScreenshot();
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
  }, [computeDescriptorFromVideo, saveTemplates, templates]);

  const removeTemplate = useCallback(
    (id: string) => {
      if (!confirm("Remover template?")) return;
      const updated = templates.filter((t) => t.id !== id);
      saveTemplates(updated);
      setToast("Template removido.");
    },
    [saveTemplates, templates]
  );

  // load face-api models
  useEffect(() => {
    let mounted = true;
    const loadModels = async () => {
      try {
        setStatus("Carregando modelos da IA...");
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);
        if (!mounted) return;
        setModelsLoaded(true);
        setStatus("Modelos carregados ✅");
      } catch (err) {
        console.error("Erro ao carregar modelos face-api:", err);
        if (!mounted) return;
        setStatus("Erro ao carregar modelos (ver console).");
        setToast("Erro ao carregar modelos de IA.");
      }
    };
    loadModels();
    return () => {
      mounted = false;
    };
  }, []);

  const detectLoop = useCallback(async () => {
    const video = webcamRef.current?.video as HTMLVideoElement | undefined;
    const canvasEl = canvasRef.current;
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

      setStatus(detections.length ? `Rostos detectados: ${detections.length}` : "Nenhum rosto encontrado");

      const ctx = canvasEl.getContext("2d");
      if (ctx) {
        if (canvasEl.width !== video.videoWidth || canvasEl.height !== video.videoHeight) {
          canvasEl.width = video.videoWidth;
          canvasEl.height = video.videoHeight;
        }
        ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

        const rectW = video.videoWidth / 2;
        const rectH = video.videoHeight / 2;
        const rectX = video.videoWidth / 4;
        const rectY = video.videoHeight / 4;
        let inside = false;
        detections.forEach((d) => {
          const box = d.detection.box;
          if (box.x > rectX && box.y > rectY && box.x + box.width < rectX + rectW && box.y + box.height < rectY + rectH) inside = true;
        });
        ctx.strokeStyle = inside ? "rgba(0,255,0,0.9)" : "rgba(255,0,0,0.4)";
        ctx.lineWidth = 3;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 12;
        ctx.strokeRect(rectX, rectY, rectW, rectH);

        let frameExpression: string | null = null;
        detections.forEach((d: any) => {
          if (overlayMode === "landmarks") {
            const pts = d.landmarks.positions;
            for (let i = 0; i < pts.length; i++) {
              const p = pts[i];
              ctx.fillStyle = `hsl(${(Date.now() / 12 + i * 5) % 360},100%,60%)`;
              ctx.beginPath();
              ctx.arc(p.x, p.y, 1.6 + Math.sin(Date.now() / 200 + i) * 0.6, 0, Math.PI * 2);
              ctx.fill();
            }
          } else if (overlayMode === "mask") {
            drawMaskLayer([d], ctx, canvasEl.width, canvasEl.height);
          } else if (overlayMode === "wireframe") {
            const mesh = d.landmarks.positions;
            ctx.strokeStyle = "rgba(0,200,255,0.6)";
            ctx.lineWidth = 0.8;
            for (let i = 0; i < mesh.length - 1; i++) {
              const p = mesh[i];
              const q = mesh[i + 1];
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(q.x, q.y);
              ctx.stroke();
            }
          }

          if (d.expressions) {
            const entries = Object.entries(d.expressions as Record<string, number>);
            if (entries.length > 0) {
              const [expr, score] = entries.reduce((a, b) => (b[1] > a[1] ? b : a));
              ctx.fillStyle = "#fff";
              ctx.font = "16px sans-serif";
              ctx.fillText(`${expr} (${(score * 100).toFixed(1)}%)`, d.detection.box.x, d.detection.box.y - 8);
              frameExpression = expr;
            }
          }
        });

        setExpression(frameExpression);

        if (templates.length > 0 && detections.length > 0) {
          const desc = detections[0].descriptor;
          let best = { name: null as string | null, dist: Infinity };
          for (const t of templates) {
            const d = euclideanDistance(t.descriptor, desc);
            if (d < best.dist) best = { name: t.name, dist: d };
          }
          if (best.dist < threshold && best.name) {
            setRecognition(`${best.name} (dist:${best.dist.toFixed(3)})`);
            setFaceSnapshot({
              timestamp: Date.now(),
              faces: detections.length,
              recognition: best.name,
              expression: frameExpression,
              attentionScore: Number((1 - best.dist).toFixed(3)),
              descriptorDistance: best.dist,
            });
          } else {
            setRecognition(null);
            setFaceSnapshot({
              timestamp: Date.now(),
              faces: detections.length,
              recognition: null,
              expression: frameExpression,
              attentionScore: Number((detections.length > 0 ? 0.4 : 0).toFixed(3)),
              descriptorDistance: null,
            });
          }
        } else {
          setRecognition(null);
          setFaceSnapshot({
            timestamp: Date.now(),
            faces: detections.length,
            recognition: null,
            expression: frameExpression,
            attentionScore: detections.length > 0 ? 0.35 : 0,
            descriptorDistance: null,
          });
        }
      }
    }
    animationRef.current = requestAnimationFrame(detectLoop);
  }, [overlayMode, templates, threshold, euclideanDistance]);

  useEffect(() => {
    if (!modelsLoaded || !privacyAccepted) return;
    animationRef.current = requestAnimationFrame(detectLoop);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [detectLoop, modelsLoaded, privacyAccepted]);

  const liveStatus = useMemo(
    () => ({
      status,
      recognition,
      expression,
      templatesCount: templates.length,
    }),
    [status, recognition, expression, templates.length]
  );

  return {
    webcamRef,
    canvasRef,
    particlesCanvasRef,
    showPrivacy,
    setShowPrivacy,
    privacyAccepted,
    acceptPrivacy,
    clearAllData,
    status,
    history,
    templates,
    toast,
    setToast,
    recognition,
    expression,
    threshold,
    setThreshold,
    overlayMode,
    setOverlayMode,
    capture,
    addTemplate,
    removeTemplate,
    liveStatus,
    faceSnapshot,
  };
};

export type FaceTrackingController = ReturnType<typeof useFaceTracking>;
