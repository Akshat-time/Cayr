import dotenv from 'dotenv';
dotenv.config();

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

// ── Safe-range validation bounds ──────────────────────────────────────────────
const VALIDATION_RANGES = {
    heartRate: { min: 20, max: 200, unit: 'bpm', label: 'Heart rate' },
    glucose: { min: 20, max: 800, unit: 'mg/dL', label: 'Blood glucose' },
    hemoglobin: { min: 3, max: 25, unit: 'g/dL', label: 'Hemoglobin' },
    height: { min: 50, max: 250, unit: 'cm', label: 'Height' },
    weight: { min: 2, max: 300, unit: 'kg', label: 'Weight' },
    bpSystolic: { min: 40, max: 250, unit: 'mmHg', label: 'Blood pressure (systolic)' },
    bpDiastolic: { min: 20, max: 150, unit: 'mmHg', label: 'Blood pressure (diastolic)' },
};

const SYSTEM_PROMPT = `You are a clinical data extractor. Given raw text from a medical PDF (prescription, lab report, or discharge summary), extract the following fields and return ONLY a valid JSON object — no explanation, no markdown, no extra text.

Fields to extract (use null if not found):
{
  "bloodPressure": { "value": "120/80", "confidence": 0.95 },
  "heartRate":     { "value": 72, "confidence": 0.9 },
  "glucose":       { "value": 105, "confidence": 0.8 },
  "hemoglobin":    { "value": 14.2, "confidence": 0.85 },
  "height":        { "value": 170, "confidence": 0.7 },
  "weight":        { "value": 65, "confidence": 0.7 },
  "bloodType":     { "value": "O+", "confidence": 0.95 },
  "allergies":     { "value": ["Penicillin"], "confidence": 0.8 },
  "conditions":    { "value": ["Hypertension"], "confidence": 0.85 },
  "medications":   { "value": ["Metformin 500mg"], "confidence": 0.9 },
  "medicalHistory":{ "value": "Appendectomy 2019", "confidence": 0.75 },
  "symptoms":      { "value": "Fatigue, headache", "confidence": 0.8 }
}

Extraction rules:
- confidence is a decimal 0-1 reflecting certainty
- For numeric fields (heartRate, glucose, hemoglobin, height, weight), value MUST be a number not a string
- bloodPressure must be "systolic/diastolic" format e.g. "120/80"
- bloodType: look for "Blood Group", "Blood Type", "ABO" fields (e.g. "B+" "A+" "O-")
- allergies: look for "Allergies", "Allergy", "Drug Allergy" fields — return as array
- conditions: look for "Diagnosis", "Diagnosed with", "Impression", "Assessment" — return as array
- medications: look for "Prescribed", "Rx", "Medication", "Drug", "Tablet", "Capsule" — return as array
- glucose: look for "Random Blood Sugar", "RBS", "FBS", "Blood Sugar", "Glucose" in mg/dL
- hemoglobin: look for "Hemoglobin", "Hb", "HGB" in g/dL
- symptoms: look for "Chief Complaint", "Presenting Complaint", "Symptoms"
- medicalHistory: look for "Past History", "Medical History", "PMH"
- arrays may be empty [] if nothing found
- If a field is completely absent, set both value and confidence to null`;

/**
 * Validate numeric medical fields against safe ranges.
 * @param {Object} fields - Parsed field map
 * @returns {string[]} Array of warning strings
 */
function validateFields(fields) {
    const warnings = [];

    const checkNum = (key, value) => {
        const range = VALIDATION_RANGES[key];
        if (!range || value === null || value === undefined) return;
        const num = parseFloat(value);
        if (isNaN(num)) return;
        if (num < range.min || num > range.max) {
            warnings.push(`${range.label} value ${num} ${range.unit} is outside safe range (${range.min}–${range.max} ${range.unit})`);
        }
    };

    checkNum('heartRate', fields.heartRate?.value);
    checkNum('glucose', fields.glucose?.value);
    checkNum('hemoglobin', fields.hemoglobin?.value);
    checkNum('height', fields.height?.value);
    checkNum('weight', fields.weight?.value);

    // Parse blood pressure "120/80"
    if (fields.bloodPressure?.value && typeof fields.bloodPressure.value === 'string') {
        const parts = fields.bloodPressure.value.split('/').map(Number);
        if (parts.length === 2) {
            checkNum('bpSystolic', parts[0]);
            checkNum('bpDiastolic', parts[1]);
        }
    }

    return warnings;
}

/**
 * Call Groq to parse medical data from extracted PDF text.
 * @param {string} pdfText - Raw text extracted from the PDF
 * @returns {{ extractedFields: Object, overallConfidence: number, validationWarnings: string[] }}
 */
export async function parseMedicalData(pdfText) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY is not set in server environment');

    if (!pdfText || pdfText.trim().length < 10) {
        return {
            extractedFields: {},
            overallConfidence: 0,
            validationWarnings: ['PDF text is too short or empty to extract medical data'],
        };
    }

    const userMessage = `Extract medical data from this PDF text:\n\n${pdfText.slice(0, 8000)}`;

    const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: GROQ_MODEL,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: userMessage },
            ],
            temperature: 0.1,
            max_tokens: 1500,
        }),
    });

    if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Groq API error ${response.status}: ${errBody}`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || '{}';

    // Strip any accidental markdown fences
    const cleaned = rawContent.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();

    let extractedFields;
    try {
        extractedFields = JSON.parse(cleaned);
    } catch {
        throw new Error(`Groq returned non-JSON response: ${cleaned.slice(0, 200)}`);
    }

    // Compute overall confidence as mean of fields that returned a value
    const confidenceValues = Object.values(extractedFields)
        .map(f => (f && f.value !== null && typeof f.confidence === 'number') ? f.confidence : null)
        .filter(c => c !== null);
    const overallConfidence = confidenceValues.length > 0
        ? parseFloat((confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length).toFixed(2))
        : 0;

    const validationWarnings = validateFields(extractedFields);

    return { extractedFields, overallConfidence, validationWarnings };
}

/**
 * Merge extraction results from multiple PDFs.
 * For each field, keep the entry with the highest confidence.
 * @param {Array<{ extractedFields, overallConfidence, validationWarnings }>} results
 * @returns {{ extractedFields, overallConfidence, validationWarnings }}
 */
export function mergeExtractionResults(results) {
    const merged = {};
    const allWarnings = [];

    for (const { extractedFields, validationWarnings } of results) {
        allWarnings.push(...validationWarnings);
        for (const [key, entry] of Object.entries(extractedFields)) {
            if (!entry || entry.value === null) continue;
            const existing = merged[key];
            if (!existing || entry.confidence > existing.confidence) {
                merged[key] = entry;
            }
        }
    }

    const confidenceValues = Object.values(merged)
        .map(f => (f && typeof f.confidence === 'number') ? f.confidence : null)
        .filter(c => c !== null);
    const overallConfidence = confidenceValues.length > 0
        ? parseFloat((confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length).toFixed(2))
        : 0;

    return {
        extractedFields: merged,
        overallConfidence,
        validationWarnings: [...new Set(allWarnings)], // deduplicate
    };
}
