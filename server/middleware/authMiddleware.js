import jwt from 'jsonwebtoken';

export const protect = async (req, res, next) => {
    try {
        const token = req.cookies.token;

        if (!token) {
            return res.status(401).json({ error: 'Not authorized, no token' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        console.error('Auth Middleware Error:', err.message);
        res.status(401).json({ error: 'Not authorized, token failed' });
    }
};

export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                error: `User role ${req.user?.role} is not authorized to access this route`
            });
        }
        next();
    };
};

// Alias so both `requireRole` and `authorize` work
export const requireRole = (...roles) => authorize(...roles);
