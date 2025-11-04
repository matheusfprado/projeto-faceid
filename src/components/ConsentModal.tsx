"use client";

import { Dialog } from "@headlessui/react";
import type { FC } from "react";

interface ConsentModalProps {
  open: boolean;
  onAccept: () => void;
  onClose: () => void;
}

export const ConsentModal: FC<ConsentModalProps> = ({ open, onAccept, onClose }) => {
  if (!open) return null;
  return (
    <Dialog open={open} onClose={onClose} className="relative z-40">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-lg rounded-2xl bg-white p-8 text-gray-900 shadow-2xl">
          <Dialog.Title className="text-2xl font-semibold">Política de Privacidade e Consentimento</Dialog.Title>
          <Dialog.Description className="mt-3 text-sm leading-relaxed text-gray-600">
            Este laboratório multimodal processa vídeo, áudio e metadados em tempo real diretamente no seu dispositivo. Nada é enviado
            para servidores externos sem consentimento. Ao aceitar você autoriza a coleta local para fins de pesquisa e benchmarking.
          </Dialog.Description>

          <ul className="mt-4 list-disc pl-5 text-sm text-gray-600 space-y-1">
            <li>Os modelos são carregados a partir de <code className="bg-gray-100 px-1 rounded">/models</code>.</li>
            <li>Templates biométricos ficam criptografados somente no dispositivo.</li>
            <li>Você pode apagar todos os dados a qualquer momento.</li>
          </ul>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={onAccept}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold shadow-lg hover:bg-blue-700 transition"
            >
              Aceitar e iniciar
            </button>
            <button onClick={onClose} className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700">
              Revisar depois
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};
