import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import IntakeRecord from '../models/IntakeRecord.js';
import MedicalReport from '../models/MedicalReport.js';
import { uploadMiddleware, handleMulterError } from '../middleware/uploadMiddleware.js';
import { extractFromPDF } from '../services/pdfExtractService.js';

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

// ── Helper: parse JSON-stringified arrays ─────────────────────────────────────
const parseArr = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    try { return JSON.parse(val); } catch { return val.split(',').map(s => s.trim()).filter(Boolean); }
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

// ── PATCH /api/intake/save-draft ───────────────────────────────────────────────
// Unified endpoint for saving drafts AND updating submitted intakes.
// Accepts partial JSON body — only provided fields are updated.
// Status is determined by the caller: 'draft' (default) or 'submitted'.
router.patch('/save-draft', requireAuth, async (req, res) => {
    try {
        const {
            height, weight, bloodPressure, heartRate, bloodType,
            allergies, conditions, currentMedications,
            medicalHistory, symptoms,
            status: requestedStatus,
        } = req.body;

        // Build only the fields that were actually sent
        const update = { lastModifiedAt: new Date() };

        if (height !== undefined) update.height = parseFloat(height) || 0;
        if (weight !== undefined) update.weight = parseFloat(weight) || 0;
        if (bloodPressure !== undefined) update.bloodPressure = bloodPressure;
        if (heartRate !== undefined) update.heartRate = parseFloat(heartRate) || 0;
        if (bloodType !== undefined) update.bloodType = bloodType;
        if (allergies !== undefined) update.allergies = parseArr(allergies);
        if (conditions !== undefined) update.conditions = parseArr(conditions);
        if (currentMedications !== undefined) update.currentMedications = parseArr(currentMedications);
        if (medicalHistory !== undefined) update.medicalHistory = medicalHistory;
        if (symptoms !== undefined) update.symptoms = symptoms;

        // Status: caller may pass 'draft' or keep current; never demote 'submitted' back to 'draft'
        // If current status is submitted and caller sends 'draft', keep submitted (update is still allowed)
        const existing = await IntakeRecord.findOne({ userId: req.user.id });
        const currentStatus = existing?.status ?? 'draft';
        if (requestedStatus === 'submitted') {
            update.status = 'submitted';
            update.submittedAt = new Date();
            update.skippedAt = null;
        } else if (currentStatus !== 'submitted') {
            update.status = 'draft';
        }
        // if currentStatus is 'submitted' and no new status requested → leave as submitted

        const intake = await IntakeRecord.findOneAndUpdate(
            { userId: req.user.id },
            { $set: update, $setOnInsert: { userId: req.user.id } },
            { upsert: true, new: true, runValidators: true }
        ).populate('uploadedFiles', 'fileName title extractionStatus mimeType createdAt');

        // Recalculate and persist progress
        const progress = intake.calcProgress();
        intake.progressPercentage = progress;
        await intake.save();

        // Update User.intakeCompleted / intakeSkipped flags for backward compat
        if (update.status === 'submitted') {
            await User.findByIdAndUpdate(req.user.id, { intakeCompleted: true, intakeSkipped: false });
        }

        res.json({ success: true, intake, progressPercentage: progress, message: 'Draft saved' });
    } catch (err) {
        console.error('PATCH /api/intake/save-draft error:', err);
        res.status(500).json({ error: 'Failed to save draft' });
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

            // Save each uploaded file as a MedicalReport document
            const uploadedFileIds = [];
            if (req.files && req.files.length > 0) {
                for (const file of req.files) {
                    const base64 = file.buffer.toString('base64');
                    const report = await MedicalReport.create({
                        patientId: req.user.id,
                        title: file.originalname,
                        fileName: file.originalname,
                        fileUrl: `data:${file.mimetype};base64,${base64.slice(0, 50)}...`,
                        fileData: base64,
                        mimeType: file.mimetype,
                        uploadedBy: 'patient',
                        extractionStatus: 'pending',
                    });
                    uploadedFileIds.push(report._id);
                }
            }

            // Upsert intake record and mark submitted
            const intake = await IntakeRecord.findOneAndUpdate(
                { userId: req.user.id },
                {
                    userId: req.user.id,
                    status: 'submitted',
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
                    lastModifiedAt: new Date(),
                    $push: uploadedFileIds.length > 0 ? { uploadedFiles: { $each: uploadedFileIds } } : undefined,
                },
                { upsert: true, new: true, omitUndefined: true }
            );

            // Recalculate progress (should be high since all fields submitted)
            const progress = intake.calcProgress();
            intake.progressPercentage = progress;
            await intake.save();

            // Mark user intake as completed
            await User.findByIdAndUpdate(req.user.id, { intakeCompleted: true, intakeSkipped: false });

            // Trigger async Gemini extraction for any newly uploaded files
            if (uploadedFileIds.length > 0) {
                setImmediate(() => extractFilesAsync(uploadedFileIds));
            }

            res.json({ success: true, intake, progressPercentage: progress });
        } catch (err) {
            console.error('POST /api/intake/submit error:', err);
            res.status(500).json({ error: 'Failed to save intake record' });
        }
    }
);

// ── POST /api/intake/extract-pdf ───────────────────────────────────────────
// Called on upload from Step 1 — synchronous, returns preview structured data via Regex/Groq
router.post(
    '/extract-pdf',
    requireAuth,
    uploadMiddleware.single('file'), // Only process one explicitly uploaded file for extraction preview
    handleMulterError,
    async (req, res) => {
        try {
            if (!req.file || req.file.mimetype !== 'application/pdf') {
                return res.status(400).json({ success: false, error: 'A valid PDF file is required' });
            }

            console.log(`[extract-pdf] Processing file: ${req.file.originalname}, size: ${req.file.size} bytes`);
            const extractionResult = await extractFromPDF(req.file.buffer);
            console.log(`[extract-pdf] Result: success=${extractionResult.success}, confidence=${extractionResult.confidence}`);
            // extractFromPDF now returns { success, extracted, confidence, ... }
            // If success is false, send it as 200 with success:false (not a crash)
            return res.json(extractionResult);

        } catch (err) {
            console.error('POST /api/intake/extract-pdf FATAL error:', err.stack || err);
            res.status(500).json({ success: false, error: `Extraction failed: ${err.message}` });
        }
    }
);

// ── POST /api/intake/skip ──────────────────────────────────────────────────────
router.post('/skip', requireAuth, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user.id, { intakeSkipped: true, intakeCompleted: false });
        const intake = await IntakeRecord.findOneAndUpdate(
            { userId: req.user.id },
            { userId: req.user.id, status: 'skipped', skippedAt: new Date(), submittedAt: null, lastModifiedAt: new Date() },
            { upsert: true, new: true }
        );
        const progress = intake.calcProgress();
        intake.progressPercentage = progress;
        await intake.save();
        res.json({ success: true, progressPercentage: progress });
    } catch (err) {
        console.error('POST /api/intake/skip error:', err);
        res.status(500).json({ error: 'Failed to skip intake' });
    }
});

// ── Async extraction (called after submit, in background) ─────────────────────
async function extractFilesAsync(fileIds) {
    for (const id of fileIds) {
        try {
            await MedicalReport.findByIdAndUpdate(id, { extractionStatus: 'processing' });
            const report = await MedicalReport.findById(id);
            if (!report || !report.fileData) {
                await MedicalReport.findByIdAndUpdate(id, { extractionStatus: 'failed' });
                continue;
            }

            // Only attempt text extraction on PDFs
            if (report.mimeType !== 'application/pdf') {
                await MedicalReport.findByIdAndUpdate(id, { extractionStatus: 'done' });
                continue;
            }

            const { text } = await extractTextFromBuffer(Buffer.from(report.fileData, 'base64'));
            const { extractedFields, overallConfidence, validationWarnings } = await parseMedicalData(text);

            // Build fieldConfidence map
            const fieldConfidence = {};
            for (const [key, entry] of Object.entries(extractedFields)) {
                if (entry && typeof entry.confidence === 'number') fieldConfidence[key] = entry.confidence;
            }

            // Build extractedSummary
            const get = (key) => extractedFields[key]?.value ?? null;
            const summary = {
                bloodPressure: get('bloodPressure') ? String(get('bloodPressure')) : undefined,
                heartRate: get('heartRate') ? String(get('heartRate')) : undefined,
                glucose: get('glucose') ? String(get('glucose')) : undefined,
                hemoglobin: get('hemoglobin') ? String(get('hemoglobin')) : undefined,
                height: get('height') ? String(get('height')) : undefined,
                weight: get('weight') ? String(get('weight')) : undefined,
                bloodType: get('bloodType') || undefined,
                allergies: get('allergies') || [],
                conditions: get('conditions') || [],
                medications: get('medications') || [],
                medicalHistory: get('medicalHistory') || undefined,
                symptoms: get('symptoms') || undefined,
                rawText: text.slice(0, 2000),
            };

            await MedicalReport.findByIdAndUpdate(id, {
                extractionStatus: 'done',
                extractedRawText: text,
                extractedSummary: summary,
                fieldConfidence,
                validationWarnings,
            });
        } catch (err) {
            console.error(`Extraction failed for report ${id}:`, err);
            await MedicalReport.findByIdAndUpdate(id, { extractionStatus: 'failed' });
        }
    }
}

export default router;
