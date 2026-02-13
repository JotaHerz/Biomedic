
import React, { useState, useRef, useEffect } from 'react';
import { gemini } from '../services/geminiService';
import { Message } from '../types';

const AIChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: '¡Hola! Soy el Asistente Inteligente de BioMedics Solutions. ¿Tienes alguna duda sobre gestión de equipos médicos, normativas o mantenimiento?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', text: input };
    const historyBeforeSend = [...messages];
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Formatear historial filtrando el saludo inicial de la IA
    const apiHistory = historyBeforeSend
      .filter((m, idx) => !(idx === 0 && m.role === 'model'))
      .map(m => ({
        role: m.role as 'user' | 'model',
        parts: [{ text: m.text }]
      }));

    const response = await gemini.sendMessage(input, apiHistory);
    setMessages(prev => [...prev, { role: 'model', text: response }]);
    setIsLoading(false);
  };

  return (
    <section id="consultoría-ia" className="py-24 bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-16 items-center">
          <div className="lg:w-1/3 text-center lg:text-left">
            <h2 className="text-4xl font-bold mb-6">Consultor IA Biomédico</h2>
            <p className="text-sky-200 text-lg mb-8">
              Utilice nuestra inteligencia artificial entrenada en estándares de ingeniería clínica para resolver dudas inmediatas sobre procedimientos y normativas.
            </p>
            <div className="inline-flex items-center space-x-2 text-sky-400 font-semibold mb-4">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
              </span>
              <span>Gemini 2.5 Flash Activado</span>
            </div>
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10 mt-6">
              <p className="text-sm italic text-sky-100/70">
                "Pruebe preguntando: ¿Cuáles son los pasos para un mantenimiento preventivo de un ventilador mecánico?"
              </p>
            </div>
          </div>

          <div className="lg:w-2/3 w-full max-w-2xl">
            <div className="bg-slate-800 rounded-3xl shadow-2xl overflow-hidden border border-white/10 flex flex-col h-[600px]">
              <div className="bg-slate-700/50 p-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-sky-500 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">BioMedics Advisor</h3>
                    <p className="text-xs text-sky-400">En línea ahora</p>
                  </div>
                </div>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 chat-scrollbar">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${m.role === 'user' ? 'bg-sky-600 text-white' : 'bg-slate-700 text-slate-100'} shadow-sm`}>
                      <p className="text-sm whitespace-pre-wrap">{m.text}</p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-700 text-slate-100 rounded-2xl px-4 py-3 shadow-sm flex space-x-1">
                      <div className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-900/50 border-t border-white/5">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Escribe tu consulta biomédica aquí..."
                    className="flex-1 bg-slate-700 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-white"
                  />
                  <button
                    onClick={handleSend}
                    disabled={isLoading || !input.trim()}
                    className="bg-sky-500 hover:bg-sky-600 disabled:bg-slate-600 text-white p-3 rounded-xl transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AIChat;
