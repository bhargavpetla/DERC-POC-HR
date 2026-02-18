const mongoose = require('mongoose');

const chatHistorySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  title: { type: String, default: 'New Chat' },
  messages: [{
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    data: { type: mongoose.Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

module.exports = mongoose.model('ChatHistory', chatHistorySchema);
