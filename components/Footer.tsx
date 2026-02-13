
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 border-b border-white/10 pb-12">
          <div className="col-span-1 md:col-span-2">
            <div className="text-2xl font-bold tracking-tight mb-6">
              BIOMEDICS<span className="text-sky-500">SOLUTIONS</span>
            </div>
            <p className="text-slate-400 max-w-sm mb-6">
              Líderes en ingeniería clínica y gestión tecnológica hospitalaria. Comprometidos con la calidad de la salud a través de la tecnología.
            </p>
            <div className="flex space-x-4">
                {['facebook', 'twitter', 'linkedin', 'instagram'].map(social => (
                    <a key={social} href="#" className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-sky-500 transition-colors">
                        <span className="sr-only">{social}</span>
                        <div className="w-5 h-5 bg-slate-400 rounded-sm"></div>
                    </a>
                ))}
            </div>
          </div>
          
          <div>
            <h4 className="font-bold text-lg mb-6">Enlaces Rápidos</h4>
            <ul className="space-y-4 text-slate-400">
              <li><a href="#inicio" className="hover:text-white transition-colors">Inicio</a></li>
              <li><a href="#servicios" className="hover:text-white transition-colors">Servicios</a></li>
              <li><a href="#ciclo-de-gestión" className="hover:text-white transition-colors">Ciclo de Gestión</a></li>
              <li><a href="#video" className="hover:text-white transition-colors">Showcase</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-lg mb-6">Contacto</h4>
            <ul className="space-y-4 text-slate-400">
              <li className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-sky-500 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                <span>Av. Salud Tecnológica 456, <br/>Distrito Biomédico</span>
              </li>
              <li className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                <span>+57 (601) 555-0123</span>
              </li>
              <li className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                <span>info@biomedics.pro</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 text-center text-slate-500 text-sm">
          <p>© {new Date().getFullYear()} BioMedics Solutions. Todos los derechos reservados. Diseñado para la excelencia clínica.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
