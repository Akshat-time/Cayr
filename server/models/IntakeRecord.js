import mongoose from 'mongoose';

const IntakeRecordSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true  // one intake record per patient
    },

    // ── Status tracking ─────────────────────────────────────────────────────
    status: {
        type: String,
        enum: ['draft', 'submitted', 'skipped'],
        default: 'draft',
    },
    progressPercentage: { type: Number, default: 0 },  // 0–100, recalculated on each save
    lastModifiedAt: { type: Date, default: null },

    // ── Vitals ──────────────────────────────────────────────────────────────
    height: { type: Number, default: 0 },          // cm
    weight: { type: Number, default: 0 },          // kg
    bloodPressure: { type: String, default: '' },  // e.g. "120/80"
    heartRate: { type: Number, default: 0 },       // bpm
    bloodType: { type: String, default: '' },

    // ── Medical Background ──────────────────────────────────────────────────
    allergies: [{ type: String }],
    conditions: [{ type: String }],
    currentMedications: [{ type: String }],
    medicalHistory: { type: String, default: '' },

    // ── Current Symptoms ────────────────────────────────────────────────────
    symptoms: { type: String, default: '' },

    // ── Linked uploaded files (MedicalReport doc IDs) ───────────────────────
    uploadedFiles: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MedicalReport'
    }],

    // Legacy timestamps kept for backward compatibility
    skippedAt: { type: Date, default: null },
    submittedAt: { type: Date, default: null },
}, { timestamps: true });

// ── Helper: calculate progress percentage ───────────────────────────────────
IntakeRecordSchema.methods.calcProgress = function () {
    const checks = [
        this.height > 0,
        this.weight > 0,
        !!this.bloodPressure,
        this.heartRate > 0,
        !!this.bloodType,
        this.allergies?.length > 0,
        this.conditions?.length > 0,
        this.currentMedications?.length > 0,
        !!this.medicalHistory,
        !!this.symptoms,
        this.uploadedFiles?.length > 0,
    ];
    const filled = checks.filter(Boolean).length;
    return Math.round((filled / checks.length) * 100);
};

export default mongoose.model('IntakeRecord', IntakeRecordSchema);
