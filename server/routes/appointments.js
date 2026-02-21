import express from 'express';
import Appointment from '../models/Appointment.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST / — Book appointment (Patient)
router.post('/', protect, requireRole('patient'), async (req, res) => {
    try {
        const { doctorId, doctorName, date, time } = req.body;
        if (!doctorId || !date || !time) {
            return res.status(400).json({ error: 'doctorId, date, and time are required' });
        }

        const appointment = new Appointment({
            patientId: req.user.id,
            patientName: req.user.name,
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
        const appointments = await Appointment.find({ patientId: req.user.id }).sort({ createdAt: -1 });
        res.json(appointments);
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
        await appointment.save();
        res.json(appointment);
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
