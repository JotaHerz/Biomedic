
import React from 'react';

const Hero: React.FC = () => {
  const bannerImg = "https://aahpvknuwcbnzqtuwmax.supabase.co/storage/v1/object/public/imagenes/imagen_1_banner.png";

  return (
    <section id="inicio" className="relative h-screen flex items-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src={bannerImg} 
          alt="BioMedics Banner" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-sky-950/90 via-sky-900/60 to-transparent"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="max-w-2xl">
          <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight mb-6 animate-fade-in">
            Excelencia en la Gestión de <br/>
            <span className="text-sky-400">Tecnología Biomédica</span>
          </h1>
          <p className="text-lg md:text-xl text-sky-50 mb-8 leading-relaxed">
            Soluciones integrales de ingeniería clínica para instituciones de salud. Maximizamos la vida útil de sus equipos y garantizamos la seguridad del paciente.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button className="bg-sky-500 hover:bg-sky-600 text-white px-8 py-4 rounded-lg font-bold text-lg transition-all shadow-lg shadow-sky-900/40">
              Nuestros Servicios
            </button>
            <button className="bg-white/10 backdrop-blur-md hover:bg-white/20 text-white border border-white/30 px-8 py-4 rounded-lg font-bold text-lg transition-all">
              Agendar Auditoría
            </button>
          </div>
        </div>
      </div>
      
      {/* Decorative wave */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0]">
        <svg className="relative block w-full h-[100px]" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V0C49.1,14.3,124.85,41.4,204.17,55.59c36.21,6.43,73,11.36,117.22,10.85Z" fill="#f8fafc"></path>
        </svg>
      </div>
    </section>
  );
};

export default Hero;
