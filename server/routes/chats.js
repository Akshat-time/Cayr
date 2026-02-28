import express from 'express';
import jwt from 'jsonwebtoken';
import ChatSession from '../models/ChatSession.js';
import Message from '../models/Message.js';
import Appointment from '../models/Appointment.js';

const router = express.Router();

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

// GET messages for a session (polling)
router.get('/:appointmentId/messages', requireAuth, async (req, res) => {
    try {
        const { appointmentId } = req.params;
        let session = await ChatSession.findOne({ appointmentId });

        if (!session) {
            const appointment = await Appointment.findById(appointmentId);
            if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
            if (appointment.status !== 'confirmed' && appointment.status !== 'completed') {
                return res.status(403).json({ error: 'Appointment not active' });
            }
            session = await ChatSession.create({
                appointmentId,
                patientId: appointment.patientId,
                doctorId: appointment.doctorId,
                isActive: true
            });
        }

        // Ownership check
        if (session.patientId.toString() !== req.user.id && session.doctorId.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Expiry check
        const isExpired = session.expiresAt && new Date() > new Date(session.expiresAt);

        const messages = await Message.find({ chatSessionId: session._id }).sort({ createdAt: 1 });

        res.json({
            success: true,
            messages,
            session: {
                isActive: session.isActive && !isExpired,
                expiresAt: session.expiresAt,
                isExpired
            }
        });
    } catch (err) {
        console.error('Fetch messages error:', err);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// POST a new message
router.post('/:appointmentId/messages', requireAuth, async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { text, type = 'text' } = req.body;

        try {
            import('fs').then(fs => fs.appendFileSync('chat.log', `[POST] Received chat for ${appointmentId} text=${text}\n`));
        } catch (e) { }

        let session = await ChatSession.findOne({ appointmentId });

        if (!session) {
            const appointment = await Appointment.findById(appointmentId);
            if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
            if (appointment.status !== 'confirmed' && appointment.status !== 'completed') {
                return res.status(403).json({ error: 'Appointment not active' });
            }
            session = await ChatSession.create({
                appointmentId,
                patientId: appointment.patientId,
                doctorId: appointment.doctorId,
                isActive: true
            });
        }

        // Expiry/Active check
        if (!session.isActive) return res.status(403).json({ error: 'Chat session is not active' });
        if (session.expiresAt && new Date() > new Date(session.expiresAt)) {
            return res.status(403).json({ error: 'Chat session has expired' });
        }

        const message = await Message.create({
            chatSessionId: session._id,
            senderId: req.user.id,
            text,
            type
        });

        res.json({ success: true, message });
    } catch (err) {
        try {
            import('fs').then(fs => fs.appendFileSync('chat.log', `[POST ERROR] ${err.message}\n`));
        } catch (e) { }
        console.error('Post message error:', err);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

export default router;
