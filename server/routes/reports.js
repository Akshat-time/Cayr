import express from 'express';
import MedicalReport from '../models/MedicalReport.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST / — Doctor uploads report for a patient (JSON, no file for now)
router.post('/', protect, requireRole('doctor'), async (req, res) => {
    try {
        const { patientId, title, description, fileUrl } = req.body;
        if (!patientId) return res.status(400).json({ error: 'patientId is required' });

        const report = new MedicalReport({
            patientId,
            doctorId: req.user.id,
            title: title || 'Medical Report',
            description: description || '',
            fileName: title || 'report',
            fileUrl: fileUrl || '#',
            uploadedBy: 'doctor'
        });

        await report.save();
        res.status(201).json(report);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /patient — Patient views their own reports
router.get('/patient', protect, requireRole('patient'), async (req, res) => {
    try {
        const reports = await MedicalReport.find({ patientId: req.user.id })
            .populate('doctorId', 'name specialty')
            .sort({ createdAt: -1 });
        res.json(reports);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /doctor — Doctor views reports they uploaded
router.get('/doctor', protect, requireRole('doctor'), async (req, res) => {
    try {
        const reports = await MedicalReport.find({ doctorId: req.user.id })
            .populate('patientId', 'name email')
            .sort({ createdAt: -1 });
        res.json(reports);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET / — General (used by App.tsx fetch for all reports, no auth for now)
router.get('/', protect, async (req, res) => {
    try {
        let query = {};
        if (req.user.role === 'patient') query.patientId = req.user.id;
        else if (req.user.role === 'doctor') query.doctorId = req.user.id;

        const reports = await MedicalReport.find(query).sort({ createdAt: -1 });
        res.json(reports);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
