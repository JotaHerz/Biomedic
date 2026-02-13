
import { GoogleGenAI } from "@google/genai";

const SYSTEM_INSTRUCTION = `
Eres un consultor experto senior en Ingeniería Clínica y Gestión de Equipos Biomédicos de la empresa "BioMedics Solutions".
Tu objetivo es ayudar a profesionales de la salud, ingenieros y administradores de hospitales con dudas técnicas.
Debes basar tus respuestas en estándares de calidad hospitalaria, seguridad eléctrica médica e ingeniería clínica.
Si te preguntan algo fuera de este ámbito, redirige cortésmente la consulta a los servicios de BioMedics.
Responde de forma concisa y profesional.
`;

export class GeminiService {
  async sendMessage(message: string, history: { role: 'user' | 'model'; parts: { text: string }[] }[] = []) {
    try {
      // Clave de API obtenida exclusivamente de process.env.API_KEY según las directrices de seguridad
      const apiKey = process.env.API_KEY;
      
      if (!apiKey) {
        console.error("API_KEY no encontrada en process.env.API_KEY.");
        throw new Error("API_KEY_MISSING");
      }

      // Inicialización siguiendo estrictamente la guía: "Create a new GoogleGenAI instance right before making an API call"
      const ai = new GoogleGenAI({ apiKey });

      // Validar y limpiar historial para cumplir con la alternancia de roles (user -> model -> user)
      let validHistory = [...history];
      while (validHistory.length > 0 && validHistory[0].role !== 'user') {
        validHistory.shift();
      }

      const contents = [
        ...validHistory,
        { role: 'user' as const, parts: [{ text: message }] }
      ];

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.7,
        },
      });

      // Extraer texto usando la propiedad .text (no el método .text())
      const textOutput = response.text;
      if (!textOutput) {
        throw new Error("EMPTY_RESPONSE");
      }

      return textOutput;
    } catch (error: any) {
      console.error("BioMedics AI Error:", error);
      
      if (error.message === "API_KEY_MISSING") {
        return "⚠️ Error de Configuración: La clave de API no está activa.";
      }
      
      return "Lo sentimos, el servicio de consultoría IA ha experimentado un error. Por favor, intente de nuevo en unos minutos.";
    }
  }
}

export const gemini = new GeminiService();
