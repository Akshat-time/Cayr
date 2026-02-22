import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
        type: String,
        enum: ['patient', 'doctor', 'admin'],
        default: 'patient'
    },
    phone: String,
    specialty: String, // For doctors
    dob: String,
    gender: String,
    address: String,
    intakeCompleted: { type: Boolean, default: false },
    intakeSkipped: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('User', userSchema);
