import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import reportsRoutes from './routes/reports.js';
import appointmentsRoutes from './routes/appointments.js';
import intakeRoutes from './routes/intake.js';
import paymentsRoutes from './routes/payments.js';
import chatsRoutes from './routes/chats.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middleware
app.use(helmet());

// CORS
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(cookieParser());

// Strict Rate Limiter for Login/Register (5 per minute)
const strictAuthLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 5,
    message: { error: 'Too many login attempts, please try again later.' }
});

// CSRF Protection (Origin Check)
const csrfProtection = (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

    const origin = req.headers.origin;
    const referer = req.headers.referer;
    const allowedOrigins = ['http://localhost:3000'];

    const isAllowed = allowedOrigins.includes(origin) ||
        (referer && allowedOrigins.some(ao => referer.startsWith(ao)));

    if (!isAllowed) {
        return res.status(403).json({ error: 'CSRF Restricted: Invalid Origin' });
    }
    next();
};

app.use(csrfProtection);

// Logging Middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Routes
app.use('/api/auth', strictAuthLimiter, authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/intake', intakeRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/chats', chatsRoutes);

// Health Check
app.get('/api/health', (req, res) => {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    res.json({
        status: 'ok',
        dbState: dbStatus,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch((err) => console.error('❌ MongoDB Connection Error:', err));

mongoose.connection.on('disconnected', () => console.log('⚠️ MongoDB Disconnected'));
mongoose.connection.on('reconnected', () => console.log('🔄 MongoDB Reconnected'));

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
