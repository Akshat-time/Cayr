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

// Helper: find or create session
async function getOrCreateSession(appointmentId, userId) {
    let session = await ChatSession.findOne({ appointmentId });
    if (!session) {
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) return { error: 'Appointment not found', status: 404 };
        if (appointment.status !== 'confirmed' && appointment.status !== 'completed') {
            return { error: 'Appointment not active', status: 403 };
        }
        session = await ChatSession.create({
            appointmentId,
            patientId: appointment.patientId,
            doctorId: appointment.doctorId,
            isActive: true
        });
    }
    if (session.patientId.toString() !== userId && session.doctorId.toString() !== userId) {
        return { error: 'Access denied', status: 403 };
    }
    return { session };
}

// GET messages for a session (polling)
router.get('/:appointmentId/messages', requireAuth, async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const result = await getOrCreateSession(appointmentId, req.user.id);
        if (result.error) return res.status(result.status).json({ error: result.error });
        const { session } = result;

        const isExpired = session.expiresAt && new Date() > new Date(session.expiresAt);
        const messages = await Message.find({ chatSessionId: session._id }).sort({ createdAt: 1 });

        res.json({
            success: true,
            messages,
            session: {
                isActive: session.isActive && !isExpired,
                expiresAt: session.expiresAt,
                isExpired,
                videoCallRequested: session.videoCallRequested || false
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
        const { text = '', type = 'text', audioData } = req.body;

        try {
            import('fs').then(fs => fs.appendFileSync('chat.log', `[POST] Received chat for ${appointmentId} text=${text} type=${type}\n`));
        } catch (e) { }

        const result = await getOrCreateSession(appointmentId, req.user.id);
        if (result.error) return res.status(result.status).json({ error: result.error });
        const { session } = result;

        if (!session.isActive) return res.status(403).json({ error: 'Chat session is not active' });
        if (session.expiresAt && new Date() > new Date(session.expiresAt)) {
            return res.status(403).json({ error: 'Chat session has expired' });
        }

        const msgData = {
            chatSessionId: session._id,
            senderId: req.user.id,
            text: text || '',
            type
        };
        if (audioData) msgData.audioData = audioData;

        const message = await Message.create(msgData);
        res.json({ success: true, message });
    } catch (err) {
        try {
            import('fs').then(fs => fs.appendFileSync('chat.log', `[POST ERROR] ${err.message}\n`));
        } catch (e) { }
        console.error('Post message error:', err);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// POST - Patient requests video consultation (only sets flag, does NOT start call)
router.post('/:appointmentId/notify-video', requireAuth, async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const result = await getOrCreateSession(appointmentId, req.user.id);
        if (result.error) return res.status(result.status).json({ error: result.error });
        const { session } = result;

        // Only patients can send video requests
        if (session.doctorId.toString() === req.user.id) {
            return res.status(403).json({ error: 'Only patients can request video consultation' });
        }

        await ChatSession.findByIdAndUpdate(session._id, { videoCallRequested: true });
        res.json({ success: true, message: 'Video consultation request sent to doctor' });
    } catch (err) {
        console.error('Notify video error:', err);
        res.status(500).json({ error: 'Failed to send video request' });
    }
});

// PATCH - Doctor accepts video call (clears the flag)
router.patch('/:appointmentId/video-accepted', requireAuth, async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const result = await getOrCreateSession(appointmentId, req.user.id);
        if (result.error) return res.status(result.status).json({ error: result.error });
        const { session } = result;

        // Only doctors can accept
        if (session.patientId.toString() === req.user.id) {
            return res.status(403).json({ error: 'Only doctors can initiate video calls' });
        }

        await ChatSession.findByIdAndUpdate(session._id, { videoCallRequested: false });
        res.json({ success: true });
    } catch (err) {
        console.error('Video accepted error:', err);
        res.status(500).json({ error: 'Failed to update video status' });
    }
});

export default router;
