const express = require('express');
const ChatHistory = require('../models/ChatHistory');
const authMiddleware = require('../middleware/auth');
const { processMessage } = require('../services/chatEngine');

const router = express.Router();

// POST /api/chat
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { message, chatId } = req.body;
    if (!message) return res.status(400).json({ message: 'Message is required' });

    const response = await processMessage(message, req.user);

    const userMsg = { role: 'user', content: message, timestamp: new Date() };
    const assistantMsg = { role: 'assistant', content: response.content, data: response, timestamp: new Date() };

    let chat;
    if (chatId) {
      chat = await ChatHistory.findById(chatId);
      if (chat) {
        chat.messages.push(userMsg, assistantMsg);
        if (chat.messages.length === 2) {
          chat.title = message.substring(0, 40) + (message.length > 40 ? '...' : '');
        }
        await chat.save();
      }
    }

    if (!chat) {
      chat = await ChatHistory.create({
        userId: req.user.employeeCode,
        title: message.substring(0, 40) + (message.length > 40 ? '...' : ''),
        messages: [userMsg, assistantMsg],
      });
    }

    res.json({ response, chatId: chat._id });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ message: 'Server error processing your message' });
  }
});

// GET /api/chat/history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const chats = await ChatHistory.find({ userId: req.user.employeeCode })
      .select('title createdAt messages')
      .sort({ updatedAt: -1 });

    const summary = chats.map(c => ({
      _id: c._id,
      title: c.title,
      createdAt: c.createdAt,
      messageCount: c.messages.length,
    }));

    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/chat/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const chat = await ChatHistory.findOne({ _id: req.params.id, userId: req.user.employeeCode });
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/chat/new
router.post('/new', authMiddleware, async (req, res) => {
  try {
    const chat = await ChatHistory.create({
      userId: req.user.employeeCode,
      title: 'New Chat',
      messages: [],
    });
    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
