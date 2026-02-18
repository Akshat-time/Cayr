import express from 'express';
import MedicalReport from '../models/MedicalReport.js';

const router = express.Router();

// Get all reports
router.get('/', async (req, res) => {
    try {
        const reports = await MedicalReport.find();
        res.json(reports);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create report
router.post('/', async (req, res) => {
    try {
        const report = new MedicalReport(req.body);
        await report.save();
        res.status(201).json(report);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
