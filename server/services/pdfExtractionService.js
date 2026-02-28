import { createRequire } from 'module';

// pdf-parse is a CJS module; use createRequire to load it in an ESM server.
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

/**
 * Fallback: extract readable text directly from raw PDF byte streams.
 * Works for simple generated PDFs where pdf-parse fails to decode font encoding.
 * Searches for PDF text operators (Tj, TJ) in the raw latin1 content.
 */
function extractRawTextFromPDFBytes(buffer) {
    try {
        const str = buffer.toString('latin1');
        const texts = [];

        // Match Tj operator: (text) Tj
        const tjRegex = /\(([^)]{1,300})\)\s*Tj/g;
        let m;
        while ((m = tjRegex.exec(str)) !== null) {
            const t = m[1].replace(/\\n/g, '\n').replace(/\\r/g, '').replace(/\\/g, '').trim();
            if (t.length > 1 && /[A-Za-z0-9]/.test(t)) texts.push(t);
        }

        // Match TJ array operator: [(text) 0 (text)] TJ
        const tjArrayRegex = /\[([^\]]{1,500})\]\s*TJ/g;
        while ((m = tjArrayRegex.exec(str)) !== null) {
            const inner = m[1];
            const parts = inner.match(/\(([^)]*)\)/g) || [];
            const combined = parts.map(p => p.slice(1, -1)).join('').replace(/\\/g, '').trim();
            if (combined.length > 1 && /[A-Za-z0-9]/.test(combined)) texts.push(combined);
        }

        const result = texts.join(' ').replace(/\s{2,}/g, ' ').trim();
        console.log(`[pdfExtractionService] Raw byte extraction found ${result.length} chars`);
        return result;
    } catch (e) {
        console.warn('[pdfExtractionService] Raw byte extraction failed:', e.message);
        return '';
    }
}

/**
 * Extract raw text from a Buffer containing a PDF.
 * Tries pdf-parse first; falls back to raw byte stream extraction.
 * @param {Buffer} buffer - The raw PDF buffer
 * @returns {{ text: string, confidence: number, pageCount: number }}
 */
export async function extractTextFromBuffer(buffer) {
    let pageCount = 1;

    // Attempt 1: pdf-parse (handles most standard PDFs)
    try {
        const data = await pdfParse(buffer);
        pageCount = data.numpages || 1;
        // Strip non-printable/binary chars (QR code artifacts, barcodes, etc.)
        const rawText = (data.text || '')
            .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, ' ')
            .replace(/\s{3,}/g, '\n')
            .trim();

        if (rawText.length >= 20) {
            console.log(`[pdfExtractionService] pdf-parse succeeded: ${rawText.length} chars`);
            const confidence = Math.min(1, rawText.length / 500);
            return { text: rawText, confidence: parseFloat(confidence.toFixed(2)), pageCount };
        }
        console.warn('[pdfExtractionService] pdf-parse returned too little text, trying raw extraction...');
    } catch (err) {
        console.warn('[pdfExtractionService] pdf-parse threw:', err.message, '— trying raw extraction...');
    }

    // Attempt 2: raw PDF byte stream parsing (works for simple generated PDFs)
    const rawText = extractRawTextFromPDFBytes(buffer);
    if (rawText.length >= 20) {
        console.log(`[pdfExtractionService] Raw extraction succeeded: ${rawText.length} chars`);
        const confidence = Math.min(1, rawText.length / 500);
        return { text: rawText, confidence: parseFloat(confidence.toFixed(2)), pageCount };
    }

    // Both methods failed — return empty
    console.warn('[pdfExtractionService] Both extraction methods failed — PDF has no readable text layer');
    return { text: '', confidence: 0, pageCount };
}

/**
 * Extract raw text from a base64-encoded PDF string.
 * @param {string} base64 - Base64-encoded PDF data
 * @returns {{ text: string, confidence: number, pageCount: number }}
 */
export async function extractTextFromBase64(base64) {
    const buffer = Buffer.from(base64, 'base64');
    return extractTextFromBuffer(buffer);
}
