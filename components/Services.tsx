
import React from 'react';

const Services: React.FC = () => {
  const servicesImg = "https://aahpvknuwcbnzqtuwmax.supabase.co/storage/v1/object/public/imagenes/imagen_2_servicios.png";

  return (
    <section id="servicios" className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/2">
            <h2 className="text-4xl font-bold text-slate-900 mb-6">Nuestros Servicios Especializados</h2>
            <p className="text-lg text-slate-600 mb-8 leading-relaxed">
              Ofrecemos un portafolio robusto diseñado para cubrir todas las necesidades del departamento de ingeniería clínica. Desde el mantenimiento preventivo hasta la consultoría técnica especializada.
            </p>
            
            <ul className="space-y-4">
                {[
                    "Mantenimiento Preventivo y Correctivo",
                    "Calibración y Metrología Biomédica",
                    "Inventario Técnico Automatizado",
                    "Gestión de Riesgos y Tecnovigilancia",
                    "Capacitación a Personal Asistencial"
                ].map((service, i) => (
                    <li key={i} className="flex items-center space-x-3 text-slate-700">
                        <div className="flex-shrink-0 w-6 h-6 bg-sky-500 rounded-full flex items-center justify-center text-white text-xs">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                        </div>
                        <span className="font-medium">{service}</span>
                    </li>
                ))}
            </ul>

            <button className="mt-10 bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-lg font-semibold transition-all">
                Ver Catálogo Detallado
            </button>
          </div>

          <div className="lg:w-1/2">
            <div className="bg-white p-4 rounded-3xl shadow-xl hover:shadow-2xl transition-all border border-slate-200">
                <img 
                    src={servicesImg} 
                    alt="Infografía de Servicios" 
                    className="w-full h-auto rounded-2xl"
                />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Services;
