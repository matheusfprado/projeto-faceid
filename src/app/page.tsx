/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import { useCallback, useEffect, useRef } from "react";
import "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-converter";
import "@tensorflow/tfjs-backend-webgl";
import Webcam from "react-webcam";
import { useState } from "react";
import { Dialog } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import identiface from "@/img/identiface.png";
import "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-converter";
import "@tensorflow/tfjs-backend-webgl";
import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";
import { MediaPipeFaceMesh } from "@tensorflow-models/face-landmarks-detection/dist/types";
import { draw } from "./mask";
import Image from "next/image";

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const webcam = useRef<Webcam>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const ctx = canvas?.current?.getContext("2d") as CanvasRenderingContext2D;
  requestAnimationFrame(() => {
    draw(predictions, ctx, videoWidth, videoHeight);
  });

  function dataURLtoFile(dataurl: string, filename: string) {
    var arr: any[] = dataurl.split(","),
      mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[1]),
      n = bstr.length,
      u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  }

  const capture = useCallback(() => {
    const imageSrc = webcam.current?.getScreenshot();

    const file = dataURLtoFile(`${imageSrc}`, "profile.png");
    console.log(file);
  }, [webcam]);

  const runFaceDetect = async () => {
    const model = await faceLandmarksDetection.load(
      faceLandmarksDetection.SupportedPackages.mediapipeFacemesh
    );
    detect(model);
  };

  const detect = async (model: MediaPipeFaceMesh) => {
    if (webcam.current) {
      const webcamCurrent = webcam.current as any;
      if (webcamCurrent.video.readyState === 4) {
        const video = webcamCurrent.video;
        const predictions = await model.estimateFaces({
          input: video,
        });
        if (predictions.length) {
          console.log(predictions);
        }
      }
    }
  };

  useEffect(() => {
    runFaceDetect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webcam?.current?.video?.readyState]);

  // const videoWidth = webcamCurrent?.video?.videoWidth;
  // const videoHeight = webcamCurrent?.video?.videoHeight;
  // canvas?.current?.width = videoWidth;
  // canvas?.current?.height = videoHeight;

  return (
    <>
      <div className="bg-gray-200">
        <header className="absolute inset-x-0 top-0 z-50">
          <div className="flex-center ml-64 pt-10">
            <Image height={250} width={360} src={identiface.src} alt="logo" />
          </div>
          <Dialog
            as="div"
            className="lg:hidden"
            open={mobileMenuOpen}
            onClose={setMobileMenuOpen}
          >
            <div className="fixed inset-0 z-50" />
            <Dialog.Panel className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-gray-900 px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-white/10">
              <div className="flex items-center justify-between">
                <a href="#" className="-m-1.5 p-1.5">
                  <img className="h-8 w-auto" src={identiface.src} alt="" />
                </a>
                <button
                  type="button"
                  className="-m-2.5 rounded-md p-2.5 text-gray-400"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="sr-only">Close menu</span>
                  <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>
            </Dialog.Panel>
          </Dialog>
        </header>
        <div className="relative isolate overflow-hidden">
          <div className="mx-auto max-w-2xl py-16 sm:py-48 lg:py-56">
              <h1 className="text-4xl font-bold tracking-tight text-black sm:text-6xl">
                Inteligência Artificial de Reconhecimento Facial
              </h1>
              <div className=" block w-full text-center pt-3">
                <div>
                  <Webcam
                    audio={false}
                    ref={webcam}
                    style={{
                      position: "relative",
                      margin: "auto",
                      textAlign: "center",
                      top: 20,
                      left: 0,
                      right: 0,
                    }}
                  />
                  <canvas ref={canvas} />
                  <div className="relative">
                    <button
                      className="bg-blue-500 hover:bg-blue-900  focus:ring-blue-900 rounded-md px-3 py-6 "
                      type="button"
                      onClick={capture}
                    >
                      clique para ler sua face
                    </button>
                  </div>
                </div>
              </div>
          </div>
        </div>
      </div>
    </>
  );
}
