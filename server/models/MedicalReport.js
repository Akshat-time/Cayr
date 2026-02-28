import mongoose from 'mongoose';

const MedicalReportSchema = new mongoose.Schema({
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    title: {
        type: String,
        default: 'Medical Report'
    },
    description: {
        type: String,
        default: ''
    },
    fileName: {
        type: String,
        required: true
    },
    fileUrl: {
        type: String,
        required: true
    },
    uploadedBy: {
        type: String,
        enum: ['patient', 'doctor'],
        required: true
    },
    reportType: {
        type: String,
        enum: ['ai_intake', 'doctor_consultation'],
        default: 'doctor_consultation'
    },
    // Base64 file content (MVP — no object storage needed)
    fileData: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    extractionStatus: {
        type: String,
        enum: ['pending', 'processing', 'done', 'failed'],
        default: 'pending'
    },
    extractedSummary: {
        patientName: { type: String, default: null },
        age: { type: Number, default: null },
        gender: { type: String, default: null },
        doctorName: { type: String, default: null },
        reportDate: { type: String, default: null },
        diagnosis: [{ type: String }],
        medications: [{ type: String }],
        labValues: {
            bloodPressure: { type: String, default: null },
            heartRate: { type: String, default: null },
            glucose: { type: String, default: null },
            hemoglobin: { type: String, default: null },
            height: { type: String, default: null },
            weight: { type: String, default: null },
        },
        bloodType: String,
        diagnoses: [String],
        allergies: [String],
        conditions: [String],
        symptoms: String,
        medicalHistory: String,
        rawText: String,
        confidence: { type: Number, default: 0 }
    },
    // ── Extraction metadata ───────────────────────────────────────────────────
    extractedRawText: { type: String, default: '' },
    fieldConfidence: {
        bloodPressure: { type: Number, default: null },
        heartRate: { type: Number, default: null },
        glucose: { type: Number, default: null },
        hemoglobin: { type: Number, default: null },
        height: { type: Number, default: null },
        weight: { type: Number, default: null },
        bloodType: { type: Number, default: null },
        allergies: { type: Number, default: null },
        conditions: { type: Number, default: null },
        medications: { type: Number, default: null },
        medicalHistory: { type: Number, default: null },
        symptoms: { type: Number, default: null },
    },
    validationWarnings: [{ type: String }],

    // ── Doctor Consultation Fields ────────────────────────────────────────────
    /** Doctor's diagnosis text */
    diagnosis: { type: String, default: '' },
    /** Doctor's clinical notes */
    clinicalNotes: { type: String, default: '' },
    /** AI-generated formatted report summary (from Groq) */
    aiReportSummary: { type: String, default: '' },
    /** Who generated this report: 'doctor' | 'ai' */
    generatedBy: { type: String, enum: ['doctor', 'ai', ''], default: '' },
    /** Structured prescription list */
    prescriptions: [{
        name: { type: String, required: true },
        dose: { type: String, default: '' },      // e.g. "500mg twice daily"
        daysCount: { type: Number, default: 1 },  // e.g. 5 (days)
    }],

    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('MedicalReport', MedicalReportSchema);
