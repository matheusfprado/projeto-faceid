# Infinity Identiface – Multimodal Lab

Aplicação Next.js que roda inteiramente no navegador combinando reconhecimento facial (`face-api.js` + `tfjs`), análise de expressões, captura de áudio e dashboards em tempo real. Agora conta com um modo avatar que substitui o feed da câmera por rostos animados neon, perfeito para demonstrações públicas ou para preservar privacidade durante testes.

## Recursos principais

- **Scanner multimodal**: loop de detecção contínuo com templates locais, threshold ajustável, partículas neon e toasts de status.
- **Modo Avatar**: três rostos animados estilizados substituem o preview real. A câmera continua ativa apenas para a IA e o overlay pode ser reativado a qualquer momento.
- **Captura de áudio**: analisador Web Audio calcula volume, pitch e variabilidade para compor uma “assinatura” vocal.
- **Dashboard em tempo real**: sparklines e métricas (engajamento, presença, energia vocal, emoção dominante) alimentadas por snapshots multimodais.
- **API de analytics**: endpoint `/api/analytics` armazena os últimos eventos em memória; ideal para integrar com bancos/streams remotos.

## Rodando localmente

1. Instale dependências: `yarn install` (ou `npm install`).
2. Copie os modelos da `face-api.js` (`tiny_face_detector_model-weights_manifest.json`, etc.) para `public/models`. Você pode baixar do repositório oficial ou gerar via script.
3. Inicie com `yarn dev`.
4. Acesse https://localhost:3000 (use HTTPS ou `localhost` para liberar câmera/microfone).

> Dica: use navegadores baseados em Chromium. Em ambientes corporativos habilite WebGL/MediaDevices.

## Deploy online

- Deploy recomendado: [Vercel](https://vercel.com) (Next 14). Suba o repo, configure variáveis se precisar e garanta que a pasta `public/models` esteja versionada.
- Certifique-se de que o domínio final possua HTTPS válido, pois getUserMedia exige conexão segura.
- Se quiser persistir analytics, troque o buffer in-memory em `src/app/api/analytics/route.ts` por uma camada (Prisma + Postgres, Supabase, Firebase, etc.).

## Customizações úteis

- Ajuste a lista de avatares em `src/components/AnimatedFacePanel.tsx` para inserir novas combinações de cores/formas.
- Adapte a lógica de métricas em `src/hooks/useAnalyticsStore.ts` para incluir KPIs próprios (FAR/FRR, fadiga, etc.).
- Para uso sem câmera real, deixe o modo Avatar ativo por padrão (já é o padrão atual) e explique ao usuário que a IA continua capturando dados apenas internamente.

## Solução de problemas

- **Erro “faceapi.nets undefined”**: confirme que os arquivos de modelo estão em `public/models` e acessíveis (verifique no DevTools aba Network).
- **Aviso “fs module not found”**: já adicionamos fallback no `next.config.js`. Se surgir após upgrades, reinstale `node_modules`.
- **Audio loop infinito**: o hook `useAudioSignature` já faz throttle (~12fps). Se aparecer novamente, reinicie as permissões do microfone.

---

Feito para demonstrações rápidas de reconhecimento facial multimodal. Ajuste como quiser e publique online!  
