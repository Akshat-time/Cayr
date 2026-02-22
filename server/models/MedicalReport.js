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
    // Base64 file content (MVP — no object storage needed)
    fileData: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    extractionStatus: {
        type: String,
        enum: ['pending', 'processing', 'done', 'failed'],
        default: 'pending'
    },
    extractedSummary: {
        bloodPressure: String,
        glucose: String,
        hemoglobin: String,
        heartRate: String,
        medications: [String],
        diagnoses: [String],
        rawText: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('MedicalReport', MedicalReportSchema);
