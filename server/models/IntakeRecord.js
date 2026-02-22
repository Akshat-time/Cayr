import mongoose from 'mongoose';

const IntakeRecordSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true  // one intake record per patient
    },
    // Vitals
    height: { type: Number, default: 0 },          // cm
    weight: { type: Number, default: 0 },          // kg
    bloodPressure: { type: String, default: '' },  // e.g. "120/80"
    heartRate: { type: Number, default: 0 },       // bpm
    bloodType: { type: String, default: '' },

    // Medical Background
    allergies: [{ type: String }],
    conditions: [{ type: String }],
    currentMedications: [{ type: String }],
    medicalHistory: { type: String, default: '' },

    // Current Symptoms
    symptoms: { type: String, default: '' },

    // Linked uploaded files (MedicalReport doc IDs)
    uploadedFiles: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MedicalReport'
    }],

    skippedAt: { type: Date, default: null },
    submittedAt: { type: Date, default: null },
}, { timestamps: true });

export default mongoose.model('IntakeRecord', IntakeRecordSchema);
