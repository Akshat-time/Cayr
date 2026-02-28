import express from 'express';
import Appointment from '../models/Appointment.js';
import ChatSession from '../models/ChatSession.js';
import DoctorProfile from '../models/DoctorProfile.js';
import User from '../models/User.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

const calculatePriceDetails = (fee) => {
    const baseFee = fee || 0;
    const tax = Math.round(baseFee * 0.1);
    const total = baseFee + tax;
    return { baseFee, tax, total };
};

// POST / — Book appointment (Patient)
router.post('/', protect, requireRole('patient'), async (req, res) => {
    try {
        const { doctorId, doctorName, date, time } = req.body;
        if (!doctorId || !date || !time) {
            return res.status(400).json({ error: 'doctorId, date, and time are required' });
        }

        const patient = await User.findById(req.user.id);
        if (!patient) return res.status(404).json({ error: 'Patient not found' });

        const appointment = new Appointment({
            patientId: req.user.id,
            patientName: patient.name,
            doctorId,
            doctorName: doctorName || 'Unknown Doctor',
            date,
            time,
            status: 'pending'
        });

        await appointment.save();
        res.status(201).json(appointment);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /patient — Patient's own appointments
router.get('/patient', protect, requireRole('patient'), async (req, res) => {
    try {
        const appointments = await Appointment.find({ patientId: req.user.id }).sort({ createdAt: -1 }).lean();

        // Populate doctor info and prices
        const enriched = await Promise.all(appointments.map(async (appt) => {
            const profile = await DoctorProfile.findOne({ userId: appt.doctorId }).lean();
            return {
                ...appt,
                id: appt._id, // Add id for frontend compatibility if missing
                doctorProfile: profile ? {
                    specialization: profile.specialization,
                    consultationFee: profile.consultationFee,
                    clinicName: profile.clinicName
                } : null,
                priceDetails: calculatePriceDetails(profile?.consultationFee)
            };
        }));

        res.json(enriched);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /doctor — Doctor's assigned appointments
router.get('/doctor', protect, requireRole('doctor'), async (req, res) => {
    try {
        const appointments = await Appointment.find({ doctorId: req.user.id }).sort({ createdAt: -1 });
        res.json(appointments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /:id/confirm — Doctor confirms appointment
router.patch('/:id/confirm', protect, requireRole('doctor'), async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
        if (appointment.doctorId.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        appointment.status = 'confirmed';
        appointment.consultationLink = `https://meet.cayr.io/${appointment._id}`;
        appointment.paymentRequired = true;
        await appointment.save();

        const profile = await DoctorProfile.findOne({ userId: appointment.doctorId }).lean();
        const responseData = {
            ...appointment.toObject(),
            id: appointment._id,
            doctorProfile: profile ? {
                specialization: profile.specialization,
                consultationFee: profile.consultationFee,
                clinicName: profile.clinicName
            } : null,
            priceDetails: calculatePriceDetails(profile?.consultationFee)
        };

        res.json(responseData);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /:id/complete — Doctor marks appointment complete
router.patch('/:id/complete', protect, requireRole('doctor'), async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
        if (appointment.doctorId.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        appointment.status = 'completed';
        await appointment.save();

        // Expire chat 5 hours from now
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 5);

        await ChatSession.findOneAndUpdate(
            { appointmentId: req.params.id },
            { expiresAt, isActive: true },
            { upsert: true }
        );

        res.json(appointment);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /:id/cancel — Patient or Doctor cancels
router.patch('/:id/cancel', protect, async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

        const isOwner =
            appointment.patientId.toString() === req.user.id ||
            appointment.doctorId.toString() === req.user.id;

        if (!isOwner) return res.status(403).json({ error: 'Not authorized' });

        appointment.status = 'cancelled';
        await appointment.save();
        res.json(appointment);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
