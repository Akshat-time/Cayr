import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middleware
app.use(helmet());

// Update CORS to allow credentials
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(cookieParser());

// Rate Limiter for Auth Routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes window (standard fallback, but we override below)
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
});

// Strict Rate Limiter for Login/Register (5 per minute)
const strictAuthLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 5, // Limit each IP to 5 requests per windowMs
    message: { error: 'Too many login attempts, please try again later.' }
});

// CSRF Protection (Origin Check)
const csrfProtection = (req, res, next) => {
    // Skip for GET/HEAD/OPTIONS
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    const origin = req.headers.origin;
    const referer = req.headers.referer;
    // Allow localhost:3000 and any production domains
    const allowedOrigins = ['http://localhost:3000'];

    // Check if origin matches allowed list
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
// Routes
app.use('/api/auth', strictAuthLimiter, authRoutes);

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

// MongoDB Connection with Event Logging
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch((err) => console.error('❌ MongoDB Connection Error:', err));

mongoose.connection.on('disconnected', () => {
    console.log('⚠️ MongoDB Disconnected');
});

mongoose.connection.on('reconnected', () => {
    console.log('🔄 MongoDB Reconnected');
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
