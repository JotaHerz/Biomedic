import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  // /api/agendamiento/* solo se proxya en dev si se define un destino local
  // (ej. .env.local con VITE_N8N_DISPONIBILIDAD_URL / VITE_N8N_SOLICITAR_URL
  // apuntando a n8n o a un servidor de prueba); sin eso, esas rutas 404 en
  // local, igual que en produccion sin las variables de Vercel configuradas.
  const proxy: Record<string, any> = {
    // Vite no sirve funciones serverless: en dev, /api/predecir se reenvia
    // directo al servicio de inferencia (mismo destino que usa el proxy
    // de Vercel en produccion via PREDICCION_SERVICE_URL).
    '/api/predecir': {
      target: env.VITE_PREDICCION_SERVICE_URL || 'https://biomedic.onrender.com',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api\/predecir/, ''),
    },
  };
  if (env.VITE_N8N_DISPONIBILIDAD_URL) {
    proxy['/api/agendamiento/disponibilidad'] = {
      target: env.VITE_N8N_DISPONIBILIDAD_URL,
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api\/agendamiento\/disponibilidad/, ''),
    };
  }
  if (env.VITE_N8N_SOLICITAR_URL) {
    proxy['/api/agendamiento/solicitar'] = {
      target: env.VITE_N8N_SOLICITAR_URL,
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api\/agendamiento\/solicitar/, ''),
    };
  }

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy,
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
