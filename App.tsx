
import React from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import VideoShowcase from './components/VideoShowcase';
import Services from './components/Services';
import ManagementCycle from './components/ManagementCycle';
import VoiceAssistant from './components/VoiceAssistant';
import AIChat from './components/AIChat';
import Footer from './components/Footer';
import FloatingAIChat from './components/FloatingAIChat';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      
      <main className="flex-grow">
        <Hero />
        
        <div className="relative">
            <VideoShowcase />
            <Services />
            <ManagementCycle />
            <VoiceAssistant />
            <AIChat />
        </div>
      </main>

      <Footer />

      {/* Nuevo Asistente IA Flotante */}
      <FloatingAIChat />
    </div>
  );
};

export default App;
