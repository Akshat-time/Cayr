import express from 'express';
import jwt from 'jsonwebtoken';
import Payment from '../models/Payment.js';
import Appointment from '../models/Appointment.js';
import ChatSession from '../models/ChatSession.js';

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

// Create a mock payment (pending)
router.post('/create-mock', requireAuth, async (req, res) => {
    try {
        const { appointmentId, amount, doctorId } = req.body;

        const payment = await Payment.create({
            patientId: req.user.id,
            doctorId,
            appointmentId,
            amount,
            status: 'pending',
            provider: 'mock'
        });

        res.json({ success: true, paymentId: payment._id, mockToken: 'mock_tok_' + Math.random().toString(36).substring(7) });
    } catch (err) {
        console.error('Payment create error:', err);
        res.status(500).json({ error: 'Failed to initiate mock payment' });
    }
});

// Confirm a mock payment and unlock chat
router.post('/confirm-mock', requireAuth, async (req, res) => {
    try {
        const { paymentId, appointmentId } = req.body;

        const payment = await Payment.findByIdAndUpdate(paymentId, {
            status: 'completed',
            providerPaymentId: 'EXT-' + Date.now()
        }, { new: true });

        if (!payment) return res.status(404).json({ error: 'Payment not found' });

        // Unlock Chat Session
        const chatSession = await ChatSession.findOneAndUpdate(
            { appointmentId },
            {
                patientId: req.user.id,
                doctorId: payment.doctorId,
                appointmentId,
                isActive: true,
                accessGrantedAt: new Date()
            },
            { upsert: true, new: true }
        );

        res.json({ success: true, payment, chatSession });
    } catch (err) {
        console.error('Payment confirm error:', err);
        res.status(500).json({ error: 'Failed to confirm payment' });
    }
});

export default router;
