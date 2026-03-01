import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import IntakeRecord from '../models/IntakeRecord.js';
import PatientProfile from '../models/PatientProfile.js';
import DoctorProfile from '../models/DoctorProfile.js';

const router = express.Router();

// ── Helper: build safe user payload including intake status ───────────────────
const buildUserPayload = async (user) => {
    const base = {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        specialty: user.specialty,
        dob: user.dob,
        gender: user.gender,
        address: user.address,
        // Legacy flags
        intakeCompleted: user.intakeCompleted || false,
        intakeSkipped: user.intakeSkipped || false,
    };

    // For patients, look up their intake status from IntakeRecord
    if (user.role === 'patient') {
        try {
            const intake = await IntakeRecord.findOne({ userId: user._id });
            if (intake) {
                base.intakeStatus = intake.status;         // 'draft'|'submitted'|'skipped'
                base.intakeProgress = intake.progressPercentage ?? 0;
            } else {
                base.intakeStatus = null;
                base.intakeProgress = 0;
            }
        } catch { /* non-critical — ignore */ }
    }

    return base;
};

// ── Dedicated Doctor Registration ────────────────────────────────────────────
router.post('/register/doctor', async (req, res) => {
    try {
        const {
            name, email, password, phone,
            licenseNumber, specialization, experienceYears,
            clinicName, consultationFee,
            availableDays, availableTimeSlots
        } = req.body;

        // Required field check
        if (!name || !email || !password || !phone || !licenseNumber || !specialization || experienceYears === undefined) {
            return res.status(400).json({ error: 'Name, email, password, phone, license number, specialization, and experience are required.' });
        }

        // Unique email check
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({ error: 'This email is already registered. Please login.' });
        }

        // Unique license number check
        const normalizedLicense = licenseNumber.trim().toUpperCase();
        const existingLicense = await DoctorProfile.findOne({ licenseNumber: normalizedLicense });
        if (existingLicense) {
            return res.status(400).json({ error: 'This license number is already registered.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Create base user with role = doctor
        const user = new User({ name, email, password: hashedPassword, role: 'doctor' });
        await user.save();

        // Create linked DoctorProfile
        const profile = new DoctorProfile({
            userId: user._id,
            phone,
            licenseNumber: normalizedLicense,
            specialization,
            experienceYears: Number(experienceYears),
            clinicName: clinicName || '',
            consultationFee: consultationFee ? Number(consultationFee) : 0,
            availableDays: availableDays || [],
            availableTimeSlots: availableTimeSlots || [],
            isVerified: false
        });
        await profile.save();

        // Issue JWT immediately
        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.status(201).json({
            message: 'Doctor account created! Pending verification.',
            user: { id: user._id, name: user.name, email: user.email, role: user.role }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Dedicated Patient Registration ──────────────────────────────────────────
router.post('/register/patient', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required.' });
        }

        // Unique email check
        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(400).json({ error: 'This email is already registered. Please login.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Create base user with role = patient
        const user = new User({ name, email, password: hashedPassword, role: 'patient' });
        await user.save();

        // Create linked PatientProfile
        const profile = new PatientProfile({
            userId: user._id,
            phone: phone || ''
        });
        await profile.save();

        // Issue JWT immediately so they land on the dashboard
        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.status(201).json({
            message: 'Account created!',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                intakeCompleted: user.intakeCompleted || false,
                intakeSkipped: user.intakeSkipped || false
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Validate role
        const allowedRoles = ['patient', 'doctor', 'admin'];
        const normalizedRole = (role || 'patient').toLowerCase();
        if (!allowedRoles.includes(normalizedRole)) {
            return res.status(400).json({ error: `Invalid role. Must be one of: ${allowedRoles.join(', ')}` });
        }

        // Check if email already exists
        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(400).json({ error: 'Email already registered. Please login.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ name, email, password: hashedPassword, role: normalizedRole });
        await user.save();

        res.status(201).json({
            message: 'Account created successfully! Please login.',
            user: { id: user._id, name: user.name, email: user.email, role: user.role }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Login — strictly enforces role match
router.post('/login', async (req, res) => {
    try {
        const { email, password, role } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: 'No account found with this email.' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Incorrect password.' });

        // Strict role check — if role is sent, it must match the stored role
        if (role) {
            const normalizedRole = role.toLowerCase();
            if (user.role !== normalizedRole) {
                return res.status(403).json({
                    error: `Access denied. This account is registered as a ${user.role}. Please use the ${user.role} portal.`
                });
            }
        }

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        // Return a consistent user object with `id` not `_id` + intake status
        const payload = await buildUserPayload(user);
        res.json({ user: payload });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Logout
router.post('/logout', (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    });
    res.json({ message: 'Logged out successfully' });
});

// Get Current User (/me)
router.get('/me', async (req, res) => {
    try {
        const token = req.cookies.token;
        if (!token) return res.status(401).json({ error: 'Authentication required' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Always return `id` not just `_id` + intake status
        const payload = await buildUserPayload(user);
        res.json(payload);
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

export default router;
