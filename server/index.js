const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '💜 SoulSync API is running' });
});

// Route imports
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const discoverRoutes = require('./routes/discover');
const matchRoutes = require('./routes/matches');
const photoRoutes = require('./routes/photos');
const messageRoutes = require('./routes/messages');
const aiRoutes = require('./routes/ai');
const economyRoutes = require('./routes/economy');
const reportsRoutes = require('./routes/reports');
const adminRoutes = require('./routes/admin');
const notificationsRoutes = require('./routes/notifications');
const vibeCheckRoutes = require('./routes/vibecheck');
const aiWriterRoutes = require('./routes/aiwriter');
const adsRoutes = require('./routes/ads');
const chatRoomsRoutes = require('./routes/chatRooms');
const blocksRoutes = require('./routes/blocks');

const registerChatHandlers = require('./socket/chat');

// Route mounts
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/discover', discoverRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/economy', economyRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/vibe-check', vibeCheckRoutes);
app.use('/api/ai-writer', aiWriterRoutes);
app.use('/api/ads', adsRoutes);
app.use('/api/chat-rooms', chatRoomsRoutes);
app.use('/api/blocks', blocksRoutes);

// Register Socket.io chat handlers
registerChatHandlers(io);

// Make io accessible to routes
app.set('io', io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀 SoulSync Server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health\n`);

  // ── Render free-tier keep-alive ──────────────────────────────────────────
  // Render spins down free services after 15 minutes of inactivity, causing
  // a ~30-second cold start on the next request. This self-ping runs every
  // 14 minutes to keep the dyno warm. Only active on Render (RENDER=true).
  if (process.env.RENDER === 'true') {
    const SELF_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
    const PING_INTERVAL_MS = 14 * 60 * 1000; // 14 minutes

    setInterval(async () => {
      try {
        await fetch(`${SELF_URL}/api/health`);
        console.log(`[keep-alive] ✅ Self-ping OK at ${new Date().toISOString()}`);
      } catch (err) {
        console.warn(`[keep-alive] ⚠️  Self-ping failed: ${err.message}`);
      }
    }, PING_INTERVAL_MS);

    console.log(`[keep-alive] 🔄 Self-ping active every 14 min → ${SELF_URL}/api/health`);
  }
  // ────────────────────────────────────────────────────────────────────────
});
