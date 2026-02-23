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
    specialty: String,
    dob: String,
    gender: String,
    address: String,
    // Extended profile fields
    profilePicture: { type: String, default: '' },   // base64 data-url
    addressDetails: {
        street: { type: String, default: '' },
        city: { type: String, default: '' },
        state: { type: String, default: '' },
        zip: { type: String, default: '' },
        country: { type: String, default: 'India' }
    },
    bloodType: { type: String, default: '' },
    height: { type: Number, default: 0 },
    weight: { type: Number, default: 0 },
    notifications: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: false }
    },
    twoFactorEnabled: { type: Boolean, default: false },
    intakeCompleted: { type: Boolean, default: false },
    intakeSkipped: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('User', userSchema);
