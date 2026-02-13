
import React from 'react';

const VideoShowcase: React.FC = () => {
  const videoUrl = "https://aahpvknuwcbnzqtuwmax.supabase.co/storage/v1/object/public/videos/grok-video-c7371ed3-8db2-4182-9fdb-0afa5144f2cc.mp4";

  return (
    <section id="video" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-4">Innovación Visual</h2>
          <div className="w-24 h-1.5 bg-sky-500 mx-auto rounded-full"></div>
          <p className="mt-6 text-xl text-slate-600 max-w-2xl mx-auto">
            Visualice el futuro de la ingeniería clínica con nuestros procesos optimizados y tecnología de vanguardia.
          </p>
        </div>

        <div className="relative max-w-4xl mx-auto rounded-3xl overflow-hidden shadow-2xl border-8 border-slate-50">
          <video 
            className="w-full h-auto"
            autoPlay 
            loop 
            muted 
            playsInline
            controls
          >
            <source src={videoUrl} type="video/mp4" />
            Su navegador no soporta el elemento de video.
          </video>
          
          <div className="absolute top-4 right-4 bg-sky-500/80 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
            En Vivo
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 text-center">
            <div className="p-6">
                <div className="w-16 h-16 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                </div>
                <h3 className="text-xl font-bold mb-2">Velocidad de Respuesta</h3>
                <p className="text-slate-500 text-sm">Minimizamos los tiempos de inactividad de sus dispositivos críticos.</p>
            </div>
            <div className="p-6">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                </div>
                <h3 className="text-xl font-bold mb-2">Seguridad Garantizada</h3>
                <p className="text-slate-500 text-sm">Cumplimiento estricto de protocolos de bioseguridad y normativas.</p>
            </div>
            <div className="p-6">
                <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
                <h3 className="text-xl font-bold mb-2">Soporte 24/7</h3>
                <p className="text-slate-500 text-sm">Disponibilidad inmediata para emergencias en equipos de soporte vital.</p>
            </div>
        </div>
      </div>
    </section>
  );
};

export default VideoShowcase;
