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
    extractedSummary: {
        bloodPressure: String,
        glucose: String,
        hemoglobin: String,
        heartRate: String,
        rawText: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('MedicalReport', MedicalReportSchema);
