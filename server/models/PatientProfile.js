import mongoose from 'mongoose';

const PatientProfileSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    phone: {
        type: String,
        default: ''
    },
    dateOfBirth: {
        type: String,
        default: ''
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other', ''],
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('PatientProfile', PatientProfileSchema);
