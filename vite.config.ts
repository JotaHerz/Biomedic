import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        // Vite no sirve funciones serverless: en dev, /api/predecir se reenvia
        // directo al servicio de inferencia (mismo destino que usa el proxy
        // de Vercel en produccion via PREDICCION_SERVICE_URL).
        '/api/predecir': {
          target: env.VITE_PREDICCION_SERVICE_URL || 'https://biomedic.onrender.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/predecir/, ''),
        },
      },
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
