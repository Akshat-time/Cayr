import express from 'express';
import MedicalReport from '../models/MedicalReport.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';
import { uploadMiddleware, handleMulterError } from '../middleware/uploadMiddleware.js';
import { extractFromPDF } from '../services/pdfExtractService.js';

const router = express.Router();

// POST /generate-doctor-report — Doctor submits notes → Groq AI formats them → save report
router.post('/generate-doctor-report', protect, requireRole('doctor'), async (req, res) => {
    try {
        const { patientId, patientName, patientAge, patientBloodType, patientAllergies, diagnosis, notes, medicines } = req.body;
        if (!patientId || !diagnosis) {
            return res.status(400).json({ success: false, error: 'patientId and diagnosis are required' });
        }

        const prescriptionLines = (medicines || []).map((m, i) =>
            `${i + 1}. ${m.name} — ${m.dose || 'as directed'} for ${m.daysCount || 1} day(s)`
        ).join('\n');

        const prompt = `You are a clinical documentation assistant for CAYR Healthcare Portal. 
A doctor has provided the following consultation notes. Generate a professional, concise medical consultation report in plain text (no markdown, no headers with #).

Patient: ${patientName || 'Unknown'}, Age: ${patientAge || 'N/A'}, Blood Type: ${patientBloodType || 'N/A'}
Allergies: ${patientAllergies || 'None known'}
Doctor: ${req.user.name}
Date: ${new Date().toLocaleDateString('en-IN')}

Diagnosis: ${diagnosis}
Clinical Notes: ${notes || 'N/A'}
Prescriptions:
${prescriptionLines || 'None prescribed'}

Write a formal 3-4 sentence clinical summary that includes the diagnosis, key clinical findings from the notes, and the treatment plan. Use medical professional language. Start directly with the summary (no intro line).`;

        let aiSummary = '';
        try {
            const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'llama3-8b-8192',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.4,
                    max_tokens: 400,
                }),
            });
            if (groqResponse.ok) {
                const groqData = await groqResponse.json();
                aiSummary = groqData.choices?.[0]?.message?.content?.trim() || '';
            } else {
                throw new Error(`Groq HTTP ${groqResponse.status}`);
            }
        } catch (groqErr) {
            console.warn('[reports] Groq AI failed, using fallback summary:', groqErr.message);
            aiSummary = `Patient ${patientName} presented with ${diagnosis}. ${notes || ''}`;
        }

        // Save to DB — fileData/fileUrl will be filled by frontend after PDF gen
        const report = new MedicalReport({
            patientId,
            doctorId: req.user.id,
            title: `Consultation: ${diagnosis}`,
            description: diagnosis,
            fileName: `Doctor_Report_${(patientName || 'Patient').replace(/\s+/g, '_')}_${Date.now()}.pdf`,
            fileUrl: 'pending',
            fileData: '',
            mimeType: 'application/pdf',
            uploadedBy: 'doctor',
            reportType: 'doctor_consultation',
            extractionStatus: 'done',
            diagnosis,
            clinicalNotes: notes || '',
            aiReportSummary: aiSummary,
            generatedBy: 'ai',
            prescriptions: (medicines || []).map(m => ({
                name: m.name,
                dose: m.dose || '',
                daysCount: parseInt(m.daysCount) || 1,
            })),
        });

        await report.save();
        res.status(201).json({ success: true, report, aiSummary });
    } catch (err) {
        console.error('POST /api/reports/generate-doctor-report error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// PATCH /reports/:id/attach-pdf — Attach base64 PDF to an already-saved report
router.patch('/:id/attach-pdf', protect, requireRole('doctor'), async (req, res) => {
    try {
        const { fileData } = req.body;
        if (!fileData) return res.status(400).json({ success: false, error: 'fileData is required' });
        const updated = await MedicalReport.findByIdAndUpdate(
            req.params.id,
            { fileData, fileUrl: `data:application/pdf;base64,...` },
            { new: true }
        );
        if (!updated) return res.status(404).json({ success: false, error: 'Report not found' });
        res.json({ success: true, report: updated });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});



// POST /upload — Upload report with physical file (multipart/form-data)
router.post(
    '/upload',
    protect,
    uploadMiddleware.single('file'),
    handleMulterError,
    async (req, res) => {
        try {
            const { title, description, reportType } = req.body;

            // Effective patient is always the logged-in user for this flow 
            // (doctors have a different flow but could be extended here)
            const effectivePatientId = req.user.role === 'patient' ? req.user.id : req.body.patientId;
            if (!effectivePatientId) return res.status(400).json({ success: false, error: 'patientId is required' });

            if (!req.file) {
                return res.status(400).json({ success: false, error: 'File is required' });
            }

            const base64 = req.file.buffer.toString('base64');
            const fileUrl = `data:${req.file.mimetype};base64,${base64.slice(0, 50)}...`; // truncated for MVP db storage

            const report = new MedicalReport({
                patientId: effectivePatientId,
                doctorId: req.user.role === 'doctor' ? req.user.id : undefined,
                title: title || req.file.originalname,
                description: description || '',
                fileName: req.file.originalname,
                fileUrl: fileUrl,
                fileData: base64,
                mimeType: req.file.mimetype,
                reportType: reportType || (req.user.role === 'doctor' ? 'doctor_consultation' : 'ai_intake'),
                uploadedBy: req.user.role,
                extractionStatus: req.file.mimetype === 'application/pdf' ? 'processing' : 'done',
                extractedSummary: {}
            });

            await report.save();

            // Fire async extraction if it's a PDF
            if (req.file.mimetype === 'application/pdf') {
                setImmediate(async () => {
                    try {
                        console.log(`[Reports API] Starting async extraction for report ${report._id}`);
                        const { extracted, confidence, rawText } = await extractFromPDF(req.file.buffer);

                        await MedicalReport.findByIdAndUpdate(report._id, {
                            extractionStatus: 'done',
                            extractedSummary: extracted,
                            extractedRawText: rawText,
                        });
                        console.log(`[Reports API] Async extraction completed for report ${report._id} (conf: ${confidence})`);
                    } catch (err) {
                        console.error(`[Reports API] Async extraction failed for report ${report._id}:`, err);
                        await MedicalReport.findByIdAndUpdate(report._id, { extractionStatus: 'failed' });
                    }
                });
            }

            res.status(201).json({ success: true, report });
        } catch (err) {
            console.error('POST /api/reports/upload error:', err);
            res.status(500).json({ success: false, error: err.message });
        }
    }
);

// POST / — Legacy JSON-only upload report (can be AI report by patient or consultation by doctor)

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
