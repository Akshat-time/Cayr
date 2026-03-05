import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
    chatSessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ChatSession',
        required: true,
        index: true
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    text: {
        type: String,
        default: ''
    },
    audioData: {
        type: String,
        default: null
    },
    type: {
        type: String,
        enum: ['text', 'signal', 'voice'],
        default: 'text'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Auto-delete messages after session expiry might be a future task
// For now, we rely on session state checks

export default mongoose.model('Message', MessageSchema);
