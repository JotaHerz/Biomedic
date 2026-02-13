
import React, { useState, useEffect } from 'react';

const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white shadow-md py-3' : 'bg-transparent py-5'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <div className="flex items-center">
          <div className={`text-2xl font-bold tracking-tight transition-colors duration-300 ${scrolled ? 'text-sky-900' : 'text-white'}`}>
            BIOMEDICS<span className="text-sky-500">SOLUTIONS</span>
          </div>
        </div>
        
        <div className="hidden md:flex space-x-8 items-center">
          {[
            { name: 'Inicio', id: 'inicio' },
            { name: 'Video', id: 'video' },
            { name: 'Servicios', id: 'servicios' },
            { name: 'Llamar a Gabi', id: 'llamada-voz' },
            { name: 'Consultoría IA', id: 'consultoría-ia' }
          ].map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={`text-sm font-medium transition-colors hover:text-sky-400 ${scrolled ? 'text-slate-700' : 'text-white'}`}
            >
              {item.name}
            </a>
          ))}
          <button className="bg-sky-600 hover:bg-sky-700 text-white px-5 py-2 rounded-full text-sm font-semibold transition-all transform hover:scale-105">
            Contacto
          </button>
        </div>

        <div className="md:hidden">
            <button className={`${scrolled ? 'text-slate-900' : 'text-white'}`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
            </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
