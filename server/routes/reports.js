import express from 'express';
import MedicalReport from '../models/MedicalReport.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST / — Upload report (can be AI report by patient or consultation by doctor)
router.post('/', protect, async (req, res) => {
    try {
        const { patientId, title, description, fileName, fileUrl, fileData, reportType, medications } = req.body;

        // If patient, they can only upload for themselves
        const effectivePatientId = req.user.role === 'patient' ? req.user.id : patientId;
        if (!effectivePatientId) return res.status(400).json({ error: 'patientId is required' });

        const report = new MedicalReport({
            patientId: effectivePatientId,
            doctorId: req.user.role === 'doctor' ? req.user.id : undefined,
            title: title || (reportType === 'ai_intake' ? 'AI Intake Report' : 'Medical Report'),
            description: description || '',
            fileName: fileName || title || 'report',
            fileUrl: fileUrl || '#',
            fileData: fileData || '',
            reportType: reportType || (req.user.role === 'doctor' ? 'doctor_consultation' : 'ai_intake'),
            uploadedBy: req.user.role,
            extractedSummary: {
                medications: medications || []
            }
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

// GET /doctor — Doctor views reports for all their patients
router.get('/doctor', protect, requireRole('doctor'), async (req, res) => {
    try {
        const { patientId } = req.query;
        let query = {};

        if (patientId) {
            // If specific patient requested, show their reports
            query = { patientId };
        } else {
            // Default: show reports where this doctor is assigned 
            // OR if the patient has an appointment with this doctor (more complex, for MVP let's allow visibility)
            query = { doctorId: req.user.id };
        }

        const reports = await MedicalReport.find(query)
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
