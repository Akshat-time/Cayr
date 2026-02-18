
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";

const INTAKE_SYSTEM_INSTRUCTION = `You are "Cayr Clinical Scribe", a professional medical intake specialist. 
Your objective is to gather precise clinical data from patients to prepare a SOAP (Subjective, Objective, Assessment, Plan) draft for the doctor.

PROTOCOL:
1. Empathize briefly: "I understand that must be difficult."
2. Questioning: Ask exactly one follow-up question per turn to maintain clarity.
3. MANDATORY DATA POINTS:
   - Chief Complaint (Onset, Duration, Character).
   - Relevant Medications & Dosages.
   - Known Chronic Conditions/Surgeries.
   - Nutritional/Vitamin Deficiencies.
   - Most recent Vitals (if available).

TONE: Professional, succinct, clinical.
FORMATTING: Use bold for clinical terms.
FINAL TRIGGER: Once info is gathered, say: "Clinical intake protocol complete. Summary is ready for physician review."`;

const SYMPTOM_CHECKER_INSTRUCTION = `You are the "Cayr AI Triage Bot". 
Your goal is to perform a high-level symptom assessment and provide risk-stratified guidance.

CRITICAL SAFETY RULES:
1. DISCLAIMER: Always start with "I am an AI, not a doctor. This is for informational triage only."
2. RED FLAGS: If patient reports chest pain, severe SOB, unilateral weakness, or severe hemorrhage, STOP and instruct: "CALL EMERGENCY SERVICES (911) IMMEDIATELY."
3. TRIAGE LEVELS:
   - EMERGENT: Immediate ER.
   - URGENT: Same-day clinic.
   - ROUTINE: Standard booking.
   - SELF-CARE: Over-the-counter/rest.

Ask one clarifying question at a time. After 3 questions, provide a "Risk Assessment" and "Next Steps".`;

const VOICE_BRIDGE_INSTRUCTION = `You are the "Cayr Indian Medical Interpreter". 
A high-accuracy real-time bridge for Indian clinics.

LANGUAGES: Hindi, Tamil, Telugu, Marathi, Bengali, Kannada, Malayalam, Gujarati, Punjabi.

MISSION:
- Translate patient's local language into Clinical English for the doctor.
- Translate doctor's Clinical English into the patient's local language.
- Maintain professional medical terminology and neutral tone.
- Do not add interpretation; only perform translation.

Output should be strictly the translation unless a summary is requested.`;

export const createClinicalIntakeSession = () => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return ai.chats.create({
    model: 'gemini-2.0-flash-exp',
    config: {
      systemInstruction: INTAKE_SYSTEM_INSTRUCTION,
      temperature: 0.2,
    },
  });
};

export const createSymptomCheckerSession = () => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return ai.chats.create({
    model: 'gemini-2.0-flash-exp',
    config: {
      systemInstruction: SYMPTOM_CHECKER_INSTRUCTION,
      temperature: 0.2,
    },
  });
};

export const createGeneralAISession = () => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return ai.chats.create({
    model: 'gemini-2.0-flash-exp',
    config: {
      systemInstruction: "You are Cayr AI, a specialized medical software assistant. Help doctors with clinical logic and patients with health literacy.",
      temperature: 0.7,
      thinkingConfig: { thinkingBudget: 0 }
    },
  });
};

export const connectVoiceBridge = (callbacks: {
  onopen?: () => void;
  onmessage: (msg: LiveServerMessage) => void;
  onerror?: (e: any) => void;
  onclose?: (e: any) => void;
}) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return ai.live.connect({
    model: 'gemini-2.0-flash-exp',
    callbacks,
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
      },
      systemInstruction: VOICE_BRIDGE_INSTRUCTION,
      inputAudioTranscription: {},
      outputAudioTranscription: {},
    },
  });
};

export const searchNearbyClinics = async (lat: number, lng: number, category: string = "medical clinics") => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `Find 5 top-rated ${category} near ${lat}, ${lng}. 
  Return a structured list. For each, describe their main medical service.
  Use Google Maps grounding for accuracy.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash-exp",
    contents: prompt,
    config: {
      tools: [{ googleMaps: {} }],
      toolConfig: {
        retrievalConfig: {
          latLng: { latitude: lat, longitude: lng }
        }
      }
    },
  });

  return {
    text: response.text,
    grounding: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
  };
};

export const generateSOAPNote = async (chatHistory: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: `Transform this patient intake conversation into a professional SOAP medical note.
      
      Chat History:
      ${chatHistory}`,
      config: {
        temperature: 0.1,
        systemInstruction: "You are a senior medical resident. Generate a clean, structured SOAP note for clinical records."
      }
    });
    return response.text || "Summary failed.";
  } catch (error) {
    return "Clinical summary currently unavailable.";
  }
};
