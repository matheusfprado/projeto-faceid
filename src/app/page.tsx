/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import { useCallback, useRef } from "react";
import "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-converter";
import "@tensorflow/tfjs-backend-webgl";
import Webcam from "react-webcam";

export default function Home() {
  const webcam = useRef<Webcam>(null);

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

  return (
    <>
      <Webcam
        audio={false}
        ref={webcam}
        style={{
          position: "absolute",
          margin: "auto",
          textAlign: "center",
          top: 100,
          left: 0,
          right: 0,
        }}
      />
      <button type="button" onClick={capture}>
        capture test
      </button>
    </>
  );
}
