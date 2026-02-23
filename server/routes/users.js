import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import DoctorProfile from '../models/DoctorProfile.js';

const router = express.Router();

// ── Auth helper ───────────────────────────────────────────────────────────────
const requireAuth = (req, res, next) => {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    try {
        req.tokenUser = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// ── GET all users (admin/doctor use) ─────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const { role } = req.query;
        const filter = role ? { role } : {};
        const users = await User.find(filter).select('-password -profilePicture');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── GET /me/profile — fetch own profile (merged with DoctorProfile) ──────────
router.get('/me/profile', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.tokenUser.id).select('-password');
        if (!user) return res.status(404).json({ error: 'User not found' });

        let docProfile = null;
        if (user.role === 'doctor') {
            docProfile = await DoctorProfile.findOne({ userId: user._id });
        }

        res.json({
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone || '',
            dob: user.dob || '',
            gender: user.gender || '',
            profilePicture: user.profilePicture || '',
            addressDetails: user.addressDetails || { street: '', city: '', state: '', zip: '', country: 'India' },
            bloodType: user.bloodType || '',
            height: user.height || 0,
            weight: user.weight || 0,
            notifications: user.notifications || { email: true, sms: false },
            twoFactorEnabled: user.twoFactorEnabled || false,
            // Doctor-specific
            ...(docProfile ? {
                specialty: docProfile.specialization || '',
                licenseNumber: docProfile.licenseNumber || '',
                experienceYears: docProfile.experienceYears || 0,
                clinicName: docProfile.clinicName || '',
                consultationFee: docProfile.consultationFee || 0,
                bio: docProfile.bio || '',
            } : {})
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── PUT /me/profile — update own profile ─────────────────────────────────────
router.put('/me/profile', requireAuth, async (req, res) => {
    try {
        const userId = req.tokenUser.id;
        const {
            firstName, lastName, phone, dob, gender,
            profilePicture, addressDetails,
            bloodType, height, weight, notifications, twoFactorEnabled,
            // Doctor-specific
            specialty, licenseNumber, experienceYears, clinicName, consultationFee, bio
        } = req.body;

        // Build User update object
        const userUpdate = {};
        const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
        if (fullName) userUpdate.name = fullName;
        if (phone !== undefined) userUpdate.phone = phone;
        if (dob !== undefined) userUpdate.dob = dob;
        if (gender !== undefined) userUpdate.gender = gender;
        if (profilePicture !== undefined) userUpdate.profilePicture = profilePicture;
        if (addressDetails !== undefined) userUpdate.addressDetails = addressDetails;
        if (bloodType !== undefined) userUpdate.bloodType = bloodType;
        if (height !== undefined) userUpdate.height = Number(height) || 0;
        if (weight !== undefined) userUpdate.weight = Number(weight) || 0;
        if (notifications !== undefined) userUpdate.notifications = notifications;
        if (twoFactorEnabled !== undefined) userUpdate.twoFactorEnabled = twoFactorEnabled;

        const updatedUser = await User.findByIdAndUpdate(
            userId, { $set: userUpdate }, { new: true }
        ).select('-password');

        if (!updatedUser) return res.status(404).json({ error: 'User not found' });

        // Update DoctorProfile for doctor role
        let docProfile = null;
        if (updatedUser.role === 'doctor') {
            const doctorUpdate = {};
            if (specialty !== undefined) doctorUpdate.specialization = specialty;
            if (licenseNumber !== undefined) doctorUpdate.licenseNumber = licenseNumber;
            if (experienceYears !== undefined) doctorUpdate.experienceYears = Number(experienceYears) || 0;
            if (clinicName !== undefined) doctorUpdate.clinicName = clinicName;
            if (consultationFee !== undefined) doctorUpdate.consultationFee = Number(consultationFee) || 0;
            if (bio !== undefined) doctorUpdate.bio = bio;
            if (phone !== undefined) doctorUpdate.phone = phone;

            docProfile = await DoctorProfile.findOneAndUpdate(
                { userId },
                { $set: doctorUpdate },
                { new: true, upsert: true }
            );
        }

        res.json({
            message: 'Profile updated successfully',
            user: {
                id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                phone: updatedUser.phone || '',
                dob: updatedUser.dob || '',
                gender: updatedUser.gender || '',
                profilePicture: updatedUser.profilePicture || '',
                addressDetails: updatedUser.addressDetails || {},
                bloodType: updatedUser.bloodType || '',
                height: updatedUser.height || 0,
                weight: updatedUser.weight || 0,
                notifications: updatedUser.notifications || {},
                twoFactorEnabled: updatedUser.twoFactorEnabled || false,
                ...(docProfile ? {
                    specialty: docProfile.specialization || '',
                    licenseNumber: docProfile.licenseNumber || '',
                    experienceYears: docProfile.experienceYears || 0,
                    clinicName: docProfile.clinicName || '',
                    consultationFee: docProfile.consultationFee || 0,
                    bio: docProfile.bio || '',
                } : {})
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── PUT /:id — generic update (kept for admin use) ───────────────────────────
router.put('/:id', async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).select('-password');
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
