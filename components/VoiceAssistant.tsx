
import React, { useState, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';

// Implementación manual de utilidades de codificación/decodificación siguiendo las directrices de la SDK
function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Decodificación de audio PCM crudo según los ejemplos de la API Live para reproducción fluida
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const buffer = ctx.createBuffer(1, dataInt16.length, sampleRate);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < dataInt16.length; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  return buffer;
}

const VoiceAssistant: React.FC = () => {
  const [isCalling, setIsCalling] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'active'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const stopCall = useCallback(() => {
    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch (e) {
        console.error("Error closing session:", e);
      }
      sessionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) { }
    });
    sourcesRef.current.clear();

    setIsCalling(false);
    setStatus('idle');
    nextStartTimeRef.current = 0;
  }, []);

  const startCall = async () => {
    setErrorMessage(null);
    try {
      setStatus('connecting');

      // Clave de API obtenida exclusivamente de process.env.API_KEY
      const apiKey = process.env.API_KEY;
      if (!apiKey) {
        throw new Error("Clave de API no configurada. Revisa process.env.API_KEY.");
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Tu navegador no admite el acceso al micrófono o no estás en un sitio seguro (HTTPS).");
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
      } catch (e: any) {
        console.error("MediaDevices Error:", e);
        throw new Error("No se pudo acceder al micrófono: " + (e.message || "Error desconocido"));
      }

      // Crear instancia de GoogleGenAI justo antes de la llamada para asegurar clave actualizada
      const ai = new GoogleGenAI({ apiKey });

      if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      if (!outputAudioContextRef.current) outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          },
          systemInstruction: 'Tu nombre es gai, eres la asistente virtual femenina de BioMedics Solutions. Tienes un acento pausado, profesional y amigable. Tienes mucha paciencia y estás presta para ayudar. Saluda de forma inmediata. TU PRIMER MENSAJE DEBE SER: "Hola, soy Gabi, tu asistente virtual de confianza de BioMedics Solutions. Cuéntame, ¿cómo te puedo ayudar?"'
        },
        callbacks: {
          onopen: () => {
            setStatus('active');
            setIsCalling(true);

            const source = audioContextRef.current!.createMediaStreamSource(stream);
            const processor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);

            processor.onaudioprocess = (e) => {
              if (isMuted) return;
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const base64 = encodeBase64(new Uint8Array(int16.buffer));
              // Usar sessionPromise para asegurar que la conexión esté lista antes de enviar inputs en tiempo real
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: { data: base64, mimeType: 'audio/pcm;rate=16000' } });
              }).catch(err => {
                console.error("Error sending realtime input:", err);
              });
            };

            source.connect(processor);
            processor.connect(audioContextRef.current!.destination);
          },
          onmessage: async (message) => {
            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData && outputAudioContextRef.current) {
              const ctx = outputAudioContextRef.current;
              // Sincronizar el inicio de cada trozo de audio para evitar huecos en la reproducción
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const buffer = await decodeAudioData(decodeBase64(audioData), ctx);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch (e) { } });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => {
            console.error("Gabi Session Error:", e);
            setErrorMessage("Error de conexión con el agente de voz.");
            stopCall();
          },
          onclose: () => stopCall()
        }
      });

      sessionRef.current = await sessionPromise;

    } catch (err: any) {
      console.error("Call Initialization Failed:", err);
      setStatus('idle');
      setErrorMessage(err.message || "No se pudo iniciar la llamada.");
    }
  };

  return (
    <section id="llamada-voz" className="py-24 bg-white relative overflow-hidden scroll-mt-20">
      <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
        <div className="mb-12">
          <h2 className="text-4xl font-bold text-slate-900 mb-4 font-display">Conversa con Gabi</h2>
          <p className="text-slate-600 text-lg">Asistencia virtual experta mediante voz en tiempo real.</p>

          {errorMessage && (
            <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-2xl border border-red-100 max-w-md mx-auto animate-fade-in flex items-center space-x-3">
              <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
              <span className="text-sm text-left">{errorMessage}</span>
            </div>
          )}
        </div>

        <div className={`relative mx-auto w-64 h-64 rounded-full flex items-center justify-center transition-all duration-700 ${isCalling ? 'bg-sky-50 shadow-[0_0_60px_rgba(14,165,233,0.3)]' : 'bg-slate-100'}`}>
          {isCalling && (
            <div className="absolute inset-0 rounded-full border-2 border-sky-400 animate-ping opacity-25"></div>
          )}
          <button
            onClick={isCalling ? stopCall : startCall}
            disabled={status === 'connecting'}
            className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${isCalling ? 'bg-red-500 hover:bg-red-600 scale-110' : 'bg-sky-500 hover:bg-sky-600'
              }`}
          >
            {status === 'connecting' ? (
              <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : isCalling ? (
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            ) : (
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
              </svg>
            )}
          </button>
        </div>

        <div className="mt-8 flex justify-center space-x-6">
          {isCalling && (
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`flex items-center space-x-2 px-6 py-2 rounded-full border transition-all ${isMuted ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              {isMuted ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"></path></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
              )}
              <span className="text-sm font-semibold">{isMuted ? 'Silenciado' : 'Silenciar'}</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default VoiceAssistant;
