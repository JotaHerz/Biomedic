
import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import VideoShowcase from './components/VideoShowcase';
import Services from './components/Services';
import ManagementCycle from './components/ManagementCycle';
import PredictiveMaintenance from './components/PredictiveMaintenance';
import VoiceAssistant from './components/VoiceAssistant';
import AIChat from './components/AIChat';
import Footer from './components/Footer';
import FloatingAIChat from './components/FloatingAIChat';
import AgendarAuditoriaModal from './components/AgendarAuditoriaModal';

const App: React.FC = () => {
  const [agendaAbierta, setAgendaAbierta] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-grow">
        <Hero onAgendarAuditoria={() => setAgendaAbierta(true)} />

        <div className="relative">
            <VideoShowcase />
            <Services />
            <ManagementCycle />
            <PredictiveMaintenance />
            <VoiceAssistant />
            <AIChat />
        </div>
      </main>

      <Footer />

      {/* Nuevo Asistente IA Flotante */}
      <FloatingAIChat />

      <AgendarAuditoriaModal isOpen={agendaAbierta} onClose={() => setAgendaAbierta(false)} />
    </div>
  );
};

export default App;
