
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";

const INTAKE_SYSTEM_INSTRUCTION = `You are "Cayr Clinical Scribe", a professional medical intake specialist. 
Your objective is to gather precise clinical data from patients to prepare a SOAP (Subjective, Objective, Assessment, Plan) draft for the doctor.

MANDATORY FIRST LINE: Every single message you send MUST start with: "I understand that must be difficult for you."

PROTOCOL:
1. Questioning: Ask exactly one follow-up question per turn to maintain clarity.
2. MANDATORY DATA POINTS:
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

MANDATORY FIRST LINE: Every single message you send MUST start with: "Im an AI not a doctor. This is only for informational triage."

CRITICAL SAFETY RULES:
1. RED FLAGS: If patient reports chest pain, severe SOB, unilateral weakness, or severe hemorrhage, STOP and instruct: "CALL EMERGENCY SERVICES (911) IMMEDIATELY."
2. TRIAGE LEVELS:
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


// Groq AI Integration (OpenAI-compatible)
const GROQ_API_KEY = (import.meta as any).env.VITE_GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

class GroqChatSession {
  private history: { role: string; content: string }[] = [];
  private systemInstruction: string;

  constructor(systemInstruction: string) {
    this.systemInstruction = systemInstruction;
  }

  async sendMessage({ message }: { message: string }) {
    if (this.history.length === 0) {
      this.history.push({ role: "system", content: this.systemInstruction });
    }
    this.history.push({ role: "user", content: message });

    try {
      const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: MODEL,
          messages: this.history,
          temperature: 0.2,
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "Groq API error");

      const aiText = data.choices[0].message.content;
      this.history.push({ role: "assistant", content: aiText });

      return { text: aiText };
    } catch (error) {
      console.error("Groq Chat Error:", error);
      throw error;
    }
  }
}

export const createClinicalIntakeSession = () => {
  return new GroqChatSession(INTAKE_SYSTEM_INSTRUCTION);
};

export const createSymptomCheckerSession = () => {
  return new GroqChatSession(SYMPTOM_CHECKER_INSTRUCTION);
};

export const createGeneralAISession = () => {
  return new GroqChatSession("You are Cayr AI, a specialized medical software assistant. Help doctors with clinical logic and patients with health literacy.");
};

// Note: Voice Bridge requires specific Gemini real-time capabilities. 
// We will focus on Text + Reports for this fallback.
export const connectVoiceBridge = (callbacks: any) => {
  console.warn("Voice Bridge not currently supported on Groq fallback.");
  return null;
};

export const searchNearbyClinics = async (lat: number, lng: number, category: string = "medical clinics") => {
  // Using the previous Leaflet/OSM solution for free maps
  return { text: "Use the map explorer to find verified clinics near you.", grounding: [] };
};

export const generateSOAPNote = async (chatHistory: string) => {
  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: "You are a senior medical resident. Generate a clean, structured SOAP note for clinical records based on the provided intake conversation." },
          { role: "user", content: chatHistory }
        ],
        temperature: 0.1
      })
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "Summary generation failed.";
  } catch (error) {
    console.error("Groq SOAP Error:", error);
    return "Clinical summary currently unavailable.";
  }
};
