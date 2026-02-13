
import React from 'react';

const ManagementCycle: React.FC = () => {
  const cycleImg = "https://aahpvknuwcbnzqtuwmax.supabase.co/storage/v1/object/public/imagenes/imagen_3_ciclo_gestion.png";

  return (
    <section id="ciclo-de-gestión" className="py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-4">Ciclo de Gestión de Equipo</h2>
          <div className="w-24 h-1.5 bg-sky-500 mx-auto rounded-full"></div>
          <p className="mt-6 text-xl text-slate-600 max-w-2xl mx-auto">
            Un enfoque holístico que abarca desde la adquisición hasta la disposición final, asegurando eficiencia operativa.
          </p>
        </div>

        <div className="relative">
          {/* Background Decorative Element */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-sky-50 rounded-full blur-3xl opacity-40 -z-10"></div>
          
          <div className="max-w-5xl mx-auto">
            <img 
              src={cycleImg} 
              alt="Ciclo de Gestión Biomédica" 
              className="w-full h-auto drop-shadow-2xl transform hover:scale-[1.02] transition-transform duration-500 cursor-zoom-in"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-20">
            {[
                { title: "Planificación", desc: "Evaluación de necesidades clínicas y presupuestarias." },
                { title: "Adquisición", desc: "Selección de proveedores y cumplimiento normativo." },
                { title: "Operación", desc: "Mantenimiento preventivo, calibración y uso seguro." },
                { title: "Disposición", desc: "Baja técnica y desecho ambientalmente responsable." }
            ].map((step, i) => (
                <div key={i} className="bg-slate-50 p-8 rounded-2xl border-b-4 border-sky-500 hover:bg-sky-50 transition-colors">
                    <span className="text-4xl font-black text-sky-100 block mb-2">{String(i+1).padStart(2, '0')}</span>
                    <h4 className="text-xl font-bold text-slate-800 mb-2">{step.title}</h4>
                    <p className="text-slate-600 text-sm leading-relaxed">{step.desc}</p>
                </div>
            ))}
        </div>
      </div>
    </section>
  );
};

export default ManagementCycle;
