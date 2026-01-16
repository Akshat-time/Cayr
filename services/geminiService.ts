
import { GoogleGenAI } from "@google/genai";

const INTAKE_SYSTEM_INSTRUCTION = `You are "Cayr Assistant", a professional clinical intake specialist. 
Your goal is to assist doctors by gathering detailed information from patients before their consultation.

Follow this workflow:
1. Acknowledge the patient's concern with empathy.
2. Ask one follow-up question at a time.
3. You MUST cover these specific areas:
   - Detailed description of the current problem/symptoms.
   - Current medications (including supplements).
   - Previous health conditions or surgeries.
   - Known deficiencies (vitamins, etc.).
   - Recent BP or Sugar readings (if the patient knows them).
   - Lifestyle factors (sleep, stress, exercise) if relevant.

Tone: Clinical, professional, empathetic, and concise. 
Format: Avoid long paragraphs. Use clear, single questions.

Final Task: When you have sufficient information (at least 4-5 key areas covered), provide a very brief summary and say: "I have gathered the clinical details. Your pre-consultation report is ready for the doctor."`;

const SYMPTOM_CHECKER_INSTRUCTION = `You are the "Cayr Symptom Checker". 
Your role is to help patients evaluate their symptoms and provide guidance on the next steps.

IMPORTANT RULES:
1. You ARE NOT a doctor. Always state a disclaimer that this is not a diagnosis.
2. Ask one question at a time to clarify the severity, duration, and nature of symptoms.
3. If red flags are detected (chest pain, severe difficulty breathing, sudden weakness), immediately advise seeking emergency care.
4. After 3-4 questions, provide:
   - "Potential Considerations": A bulleted list of common conditions matching the symptoms.
   - "Triage Recommendation": Clear advice (e.g., "Self-care", "Book a standard appointment", "Visit Urgent Care", or "Go to Emergency").

Tone: Calm, professional, and cautious.`;

export const createClinicalIntakeSession = () => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: INTAKE_SYSTEM_INSTRUCTION,
      temperature: 0.7,
    },
  });
};

export const createSymptomCheckerSession = () => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: SYMPTOM_CHECKER_INSTRUCTION,
      temperature: 0.5,
    },
  });
};

export const searchNearbyClinics = async (lat: number, lng: number, category: string = "medical clinics") => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  // Category-specific prompt engineering for better Maps results
  const prompt = `Find 6 top-rated ${category} near these coordinates. 
  For each venue, provide a very brief clinical context (e.g., "Specializes in pediatrics", "24-hour emergency diagnostics").
  Return the results as a helpful summary.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      tools: [{ googleMaps: {} }],
      toolConfig: {
        retrievalConfig: {
          latLng: {
            latitude: lat,
            longitude: lng
          }
        }
      }
    },
  });

  return {
    text: response.text,
    grounding: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
  };
};

export const extractClinicalSummary = async (chatHistory: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a clinical summarizer for Cayr. Extract critical data from this patient conversation.
      Focus on: Concern, Medications, Deficiencies, Vitals, Chronic Conditions.
      Formatting: Use clear bullet points. State "None reported" if missing.
      
      Chat History:
      ${chatHistory}`,
      config: { temperature: 0.1 }
    });
    return response.text || "Summary generation failed.";
  } catch (error) {
    console.error("Extraction Error:", error);
    return "Could not process clinical summary.";
  }
};
