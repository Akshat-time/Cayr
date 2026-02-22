import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import IntakeRecord from '../models/IntakeRecord.js';
import MedicalReport from '../models/MedicalReport.js';
import { uploadMiddleware, handleMulterError } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// ── Auth middleware ────────────────────────────────────────────────────────────
const requireAuth = (req, res, next) => {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// ── GET /api/intake/me ─────────────────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
    try {
        const record = await IntakeRecord.findOne({ userId: req.user.id })
            .populate('uploadedFiles', 'fileName title extractionStatus extractedSummary mimeType createdAt');
        res.json({ intake: record });
    } catch (err) {
        console.error('GET /api/intake/me error:', err);
        res.status(500).json({ error: 'Failed to fetch intake record' });
    }
});

// ── POST /api/intake/submit ────────────────────────────────────────────────────
// Accepts multipart/form-data with up to 5 files
router.post(
    '/submit',
    requireAuth,
    uploadMiddleware.array('files', 5),
    handleMulterError,
    async (req, res) => {
        try {
            const {
                height, weight, bloodPressure, heartRate, bloodType,
                allergies, conditions, currentMedications,
                medicalHistory, symptoms
            } = req.body;

            // Helper: parse JSON-stringified arrays sent as form fields
            const parseArr = (val) => {
                if (!val) return [];
                try { return JSON.parse(val); } catch { return val.split(',').map(s => s.trim()).filter(Boolean); }
            };

            // Save each uploaded file as a MedicalReport document
            const uploadedFileIds = [];
            if (req.files && req.files.length > 0) {
                for (const file of req.files) {
                    const base64 = file.buffer.toString('base64');
                    const report = await MedicalReport.create({
                        patientId: req.user.id,
                        title: file.originalname,
                        fileName: file.originalname,
                        fileUrl: `data:${file.mimetype};base64,${base64.slice(0, 50)}...`, // preview URL stub
                        fileData: base64,
                        mimeType: file.mimetype,
                        uploadedBy: 'patient',
                        extractionStatus: 'pending',
                    });
                    uploadedFileIds.push(report._id);
                }
            }

            // Upsert intake record
            const intake = await IntakeRecord.findOneAndUpdate(
                { userId: req.user.id },
                {
                    userId: req.user.id,
                    height: parseFloat(height) || 0,
                    weight: parseFloat(weight) || 0,
                    bloodPressure: bloodPressure || '',
                    heartRate: parseFloat(heartRate) || 0,
                    bloodType: bloodType || '',
                    allergies: parseArr(allergies),
                    conditions: parseArr(conditions),
                    currentMedications: parseArr(currentMedications),
                    medicalHistory: medicalHistory || '',
                    symptoms: symptoms || '',
                    submittedAt: new Date(),
                    skippedAt: null,
                    $push: uploadedFileIds.length > 0 ? { uploadedFiles: { $each: uploadedFileIds } } : undefined,
                },
                { upsert: true, new: true, omitUndefined: true }
            );

            // Mark user intake as completed
            await User.findByIdAndUpdate(req.user.id, { intakeCompleted: true, intakeSkipped: false });

            // Trigger async Gemini extraction for any newly uploaded files
            if (uploadedFileIds.length > 0) {
                setImmediate(() => extractFilesAsync(uploadedFileIds));
            }

            res.json({ success: true, intake });
        } catch (err) {
            console.error('POST /api/intake/submit error:', err);
            res.status(500).json({ error: 'Failed to save intake record' });
        }
    }
);

// ── POST /api/intake/skip ──────────────────────────────────────────────────────
router.post('/skip', requireAuth, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user.id, { intakeSkipped: true, intakeCompleted: false });
        await IntakeRecord.findOneAndUpdate(
            { userId: req.user.id },
            { userId: req.user.id, skippedAt: new Date(), submittedAt: null },
            { upsert: true, new: true }
        );
        res.json({ success: true });
    } catch (err) {
        console.error('POST /api/intake/skip error:', err);
        res.status(500).json({ error: 'Failed to skip intake' });
    }
});

// ── Async extraction placeholder (Phase 3 wires in Gemini) ────────────────────
async function extractFilesAsync(fileIds) {
    for (const id of fileIds) {
        try {
            await MedicalReport.findByIdAndUpdate(id, { extractionStatus: 'processing' });

            const report = await MedicalReport.findById(id);
            if (!report || !report.fileData) continue;

            // Phase 3: call Gemini here
            // const extracted = await extractMedicalDataFromFile(report.fileData, report.mimeType);
            // For now, mark as done with empty summary
            await MedicalReport.findByIdAndUpdate(id, {
                extractionStatus: 'done',
                'extractedSummary.rawText': '(Extraction will be available in Phase 3)'
            });
        } catch (err) {
            console.error(`Extraction failed for report ${id}:`, err);
            await MedicalReport.findByIdAndUpdate(id, { extractionStatus: 'failed' });
        }
    }
}

export default router;
