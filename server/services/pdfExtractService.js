import { extractTextFromBuffer } from './pdfExtractionService.js';
import { parseMedicalData } from './medicalDataMappingService.js';

/**
 * Attempts to extract fields using Regex patterns.
 * @param {string} text
 * @returns {Object} Extracted fields with value and confidence
 */
function extractWithRegex(text) {
    const fields = {
        patientName: null, age: null, gender: null,
        bloodPressure: null, heartRate: null, glucose: null, hemoglobin: null,
        height: null, weight: null, bloodType: null,
        diagnosis: { value: [], confidence: 0 },
        medications: { value: [], confidence: 0 },
        doctorName: null, reportDate: null
    };

    // Helper to safely assign
    const setF = (key, val, conf) => {
        if (val && !fields[key]) {
            fields[key] = { value: val, confidence: conf };
        }
    };

    // Patient Name (e.g. "Name: John Doe", "Patient: Jane Smith")
    const nameMatch = text.match(/(?:Name|Patient|Pt Name)\s*[:\-]?\s*([A-Za-z\s]{2,30})/i);
    if (nameMatch) setF('patientName', nameMatch[1].trim(), 0.8);

    // Age / DOB (e.g. "Age: 45", "45 Y", "45 yo")
    const ageMatch = text.match(/(?:Age|DOB|Date of Birth)\s*[:\-]?\s*(\d{1,3})(?:\s*(?:Yrs?|Years?|Y|yo))?/i);
    if (ageMatch) setF('age', parseInt(ageMatch[1], 10), 0.9);

    // Gender (e.g. "Gender: M", "Sex: Female")
    const genderMatch = text.match(/(?:Gender|Sex)\s*[:\-]?\s*(Male|Female|M|F)/i);
    if (genderMatch) {
        let g = genderMatch[1].toUpperCase();
        if (g === 'M' || g === 'MALE') g = 'Male';
        if (g === 'F' || g === 'FEMALE') g = 'Female';
        setF('gender', g, 0.9);
    }

    // Blood Pressure (e.g. "BP 120/80", "Blood Pressure: 130/85")
    const bpMatch = text.match(/(?:BP|Blood Pressure)\s*[:\-]?\s*(\d{2,3}[\/\\]\d{2,3})/i);
    if (bpMatch) setF('bloodPressure', bpMatch[1].replace('\\', '/'), 0.95);

    // Heart Rate (bpm)
    const hrMatch = text.match(/(?:HR|Pulse|Heart Rate)\s*[:\-]?\s*(\d{2,3})\s*(?:bpm)?/i);
    if (hrMatch) setF('heartRate', parseInt(hrMatch[1], 10), 0.85);

    // Glucose (mg/dL)
    const gluMatch = text.match(/(?:Glucose|FBS|RBS|Sugar|mg\/dL).*?(\d{2,3})(?:\.\d)?/i);
    if (gluMatch) setF('glucose', parseInt(gluMatch[1], 10), 0.75);

    // Hemoglobin (g/dL)
    const hbMatch = text.match(/(?:Hb|Hemoglobin|HGB).*?(\d{1,2}\.\d{1,2})/i);
    if (hbMatch) setF('hemoglobin', parseFloat(hbMatch[1]), 0.8);

    // Height (cm)
    const htMatch = text.match(/(?:Height|Ht)\s*[:\-]?\s*(\d{2,3})\s*(?:cm)?/i);
    if (htMatch) setF('height', parseInt(htMatch[1], 10), 0.8);

    // Weight (kg)
    const wtMatch = text.match(/(?:Weight|Wt)\s*[:\-]?\s*(\d{2,3}(?:\.\d)?)\s*(?:kg)?/i);
    if (wtMatch) setF('weight', parseFloat(wtMatch[1]), 0.85);

    // Doctor Name
    const drMatch = text.match(/(?:Dr\.|Doctor|Ref By|Referred By)\s*[:\-]?\s*([A-Za-z\.\s]{3,30})/i);
    if (drMatch) setF('doctorName', drMatch[1].trim(), 0.7);

    // Date
    const dateMatch = text.match(/(?:Date|Collected|Received)\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i);
    if (dateMatch) setF('reportDate', dateMatch[1], 0.8);

    // Calculate how many were found
    const keys = Object.keys(fields).filter(k => k !== 'diagnosis' && k !== 'medications'); // exclude arrays
    const foundKeys = keys.filter(k => fields[k] !== null);
    const regexConfidence = keys.length > 0 ? (foundKeys.length / keys.length) : 0;

    return { params: fields, regexConfidence };
}

/**
 * Extracts data from PDF buffer using hybrid approach (Regex + Groq LLM fallback).
 * @param {Buffer} fileBuffer
 * @returns {Promise<{ extracted: Object, confidence: number, rawText: string }>}
 */
export async function extractFromPDF(fileBuffer) {
    if (!fileBuffer) throw new Error('No valid file buffer provided for PDF extraction');

    // 1. Extract raw text from the PDF
    const { text, confidence: rawTextConfidence } = await extractTextFromBuffer(fileBuffer);
    console.log(`[pdfExtractService] Extracted ${text.length} chars, text confidence: ${rawTextConfidence}`);

    if (rawTextConfidence === 0 || text.trim().length < 20) {
        console.warn('[pdfExtractService] PDF has no extractable text (scanned/image-only PDF or QR-only)');
        return {
            success: false,
            error: 'This PDF appears to be a scanned image or contains only QR/barcode data. No text could be extracted to auto-fill the form.',
            extracted: null,
            confidence: 0
        };
    }

    // 2. Run Regex extraction first (fast, always)
    const { params, regexConfidence } = extractWithRegex(text);
    console.log(`[pdfExtractService] Regex found ${Object.values(params).filter(v => v !== null && !Array.isArray(v)).length} fields, confidence: ${(regexConfidence * 100).toFixed(1)}%`);

    // 3. ALWAYS try Groq for better semantic extraction (Groq is fast, 1-3s)
    let groqFields = null;
    let groqConfidence = 0;
    try {
        console.log('[pdfExtractService] Calling Groq for semantic extraction...');
        const result = await parseMedicalData(text);
        groqFields = result.extractedFields;
        groqConfidence = result.overallConfidence;
        console.log(`[pdfExtractService] Groq extracted ${Object.keys(groqFields).filter(k => groqFields[k]?.value != null).length} fields, confidence: ${(groqConfidence * 100).toFixed(1)}%`);
    } catch (err) {
        console.warn('[pdfExtractService] Groq extraction failed, using regex only:', err.message);
    }

    // 4. Merge: prefer Groq values, fall back to regex values
    const mergedLabValues = {
        bloodPressure: groqFields?.bloodPressure?.value ?? params.bloodPressure?.value ?? null,
        glucose: groqFields?.glucose?.value != null ? String(groqFields.glucose.value) : (params.glucose?.value ? String(params.glucose.value) : null),
        hemoglobin: groqFields?.hemoglobin?.value != null ? String(groqFields.hemoglobin.value) : (params.hemoglobin?.value ? String(params.hemoglobin.value) : null),
        heartRate: groqFields?.heartRate?.value != null ? String(groqFields.heartRate.value) : (params.heartRate?.value ? String(params.heartRate.value) : null),
        height: groqFields?.height?.value != null ? String(groqFields.height.value) : (params.height?.value ? String(params.height.value) : null),
        weight: groqFields?.weight?.value != null ? String(groqFields.weight.value) : (params.weight?.value ? String(params.weight.value) : null),
    };

    const extracted = {
        patientName: params.patientName?.value ?? null,
        age: params.age?.value ?? null,
        gender: params.gender?.value ?? null,
        diagnosis: groqFields?.conditions?.value?.length > 0 ? groqFields.conditions.value : [],
        medications: groqFields?.medications?.value?.length > 0 ? groqFields.medications.value : [],
        labValues: mergedLabValues,
        doctorName: params.doctorName?.value ?? null,
        reportDate: params.reportDate?.value ?? null,
        medicalHistory: groqFields?.medicalHistory?.value ?? null,
        symptoms: groqFields?.symptoms?.value ?? null,
        bloodType: groqFields?.bloodType?.value ?? null,
        rawText: text,
    };

    const finalConfidence = groqFields ? Math.max(groqConfidence * 100, regexConfidence * 100) : regexConfidence * 100;

    console.log('[pdfExtractService] Final extracted:', JSON.stringify({ ...extracted, rawText: '[truncated]' }));
    return { success: true, extracted, confidence: finalConfidence, rawText: text };
}
