import mongoose from 'mongoose';

const DoctorProfileSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    phone: {
        type: String,
        required: true
    },
    licenseNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    specialization: {
        type: String,
        required: true
    },
    experienceYears: {
        type: Number,
        required: true,
        min: 0
    },
    clinicName: {
        type: String,
        default: ''
    },
    consultationFee: {
        type: Number,
        default: 0
    },
    availableDays: {
        type: [String],
        default: []
    },
    availableTimeSlots: {
        type: [String],
        default: []
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('DoctorProfile', DoctorProfileSchema);
