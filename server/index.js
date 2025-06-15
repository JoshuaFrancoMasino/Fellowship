const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Dynamic CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In development, allow all origins
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // In production, check against allowed origins
    const allowedOrigins = [
      'http://localhost:5173',
      'https://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ["GET", "POST"],
  credentials: true
};

// Configure CORS for Socket.IO with dynamic origin support
const io = socketIo(server, {
  cors: corsOptions
});

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Store connected users and their socket IDs
const connectedUsers = new Map();
const userSockets = new Map();

// In-memory message storage (in production, use a database)
const messageStore = new Map(); // key: conversationId, value: array of messages

// Helper function to get conversation ID
function getConversationId(user1, user2) {
  return [user1, user2].sort().join('_');
}

// Helper function to store message
function storeMessage(from, to, message, timestamp) {
  const conversationId = getConversationId(from, to);
  if (!messageStore.has(conversationId)) {
    messageStore.set(conversationId, []);
  }
  
  const messageData = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    from,
    to,
    message,
    timestamp,
    delivered: false,
    read: false
  };
  
  messageStore.get(conversationId).push(messageData);
  return messageData;
}

// Helper function to get conversation messages
function getConversationMessages(user1, user2) {
  const conversationId = getConversationId(user1, user2);
  return messageStore.get(conversationId) || [];
}

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    connectedUsers: connectedUsers.size,
    totalMessages: Array.from(messageStore.values()).reduce((total, messages) => total + messages.length, 0),
    timestamp: new Date().toISOString()
  });
});

// API endpoint to get conversation history
app.get('/api/messages/:user1/:user2', (req, res) => {
  const { user1, user2 } = req.params;
  const messages = getConversationMessages(user1, user2);
  res.json({ messages });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`🔌 New client connected: ${socket.id}`);

  // Handle user joining
  socket.on('user_join', (userData) => {
    const { username, isAuthenticated } = userData;
    console.log(`👤 User joined: ${username} (${isAuthenticated ? 'authenticated' : 'guest'})`);
    
    // Store user information
    connectedUsers.set(username, {
      socketId: socket.id,
      isAuthenticated,
      joinedAt: new Date().toISOString()
    });
    userSockets.set(socket.id, username);
    
    // Join user to their own room for private messages
    socket.join(`user_${username}`);
    
    console.log(`📊 Total connected users: ${connectedUsers.size}`);
    
    // Send any undelivered messages to the user
    deliverPendingMessages(username);
  });

  // Function to deliver pending messages
  function deliverPendingMessages(username) {
    // Check all conversations for undelivered messages to this user
    for (const [conversationId, messages] of messageStore.entries()) {
      const undeliveredMessages = messages.filter(msg => 
        msg.to === username && !msg.delivered
      );
      
      undeliveredMessages.forEach(msg => {
        socket.emit('private_message', msg);
        msg.delivered = true;
        console.log(`📬 Delivered pending message to ${username} from ${msg.from}`);
      });
    }
  }

  // Handle private messages
  socket.on('private_message', (messageData) => {
    const { to, from, message, timestamp } = messageData;
    console.log(`💬 Private message from ${from} to ${to}: ${message}`);
    
    // Store the message
    const storedMessage = storeMessage(from, to, message, timestamp);
    
    // Check if recipient is online
    const recipient = connectedUsers.get(to);
    if (recipient) {
      // Send to recipient immediately
      io.to(`user_${to}`).emit('private_message', storedMessage);
      storedMessage.delivered = true;
      
      // Send confirmation back to sender
      socket.emit('message_sent', {
        to,
        message,
        timestamp,
        status: 'delivered',
        messageId: storedMessage.id
      });
      
      console.log(`✅ Message delivered to ${to}`);
    } else {
      // User is offline, message is stored and will be delivered when they come online
      socket.emit('message_sent', {
        to,
        message,
        timestamp,
        status: 'stored',
        messageId: storedMessage.id
      });
      
      console.log(`📦 Message stored for offline user ${to}`);
    }
  });

  // Handle message read receipts
  socket.on('message_read', (data) => {
    const { messageId, conversationId } = data;
    const messages = messageStore.get(conversationId);
    if (messages) {
      const message = messages.find(msg => msg.id === messageId);
      if (message) {
        message.read = true;
        // Notify sender that message was read
        const sender = connectedUsers.get(message.from);
        if (sender) {
          io.to(sender.socketId).emit('message_read_receipt', {
            messageId,
            readBy: message.to,
            readAt: new Date().toISOString()
          });
        }
      }
    }
  });

  // Handle typing indicators
  socket.on('typing_start', (data) => {
    const { to, from } = data;
    const recipient = connectedUsers.get(to);
    if (recipient) {
      io.to(`user_${to}`).emit('user_typing', { from, typing: true });
    }
  });

  socket.on('typing_stop', (data) => {
    const { to, from } = data;
    const recipient = connectedUsers.get(to);
    if (recipient) {
      io.to(`user_${to}`).emit('user_typing', { from, typing: false });
    }
  });

  // Handle conversation history request
  socket.on('get_conversation', (data) => {
    const { with: otherUser } = data;
    const username = userSockets.get(socket.id);
    if (username) {
      const messages = getConversationMessages(username, otherUser);
      socket.emit('conversation_history', {
        with: otherUser,
        messages
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const username = userSockets.get(socket.id);
    if (username) {
      console.log(`👋 User disconnected: ${username}`);
      connectedUsers.delete(username);
      userSockets.delete(socket.id);
      
      console.log(`📊 Total connected users: ${connectedUsers.size}`);
    } else {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    }
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error(`❌ Socket error for ${socket.id}:`, error);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Fellowship Finder Chat Server running on port ${PORT}`);
  console.log(`📡 Socket.IO server ready for connections`);
  console.log(`🌐 CORS enabled for dynamic origins in development`);
  console.log(`💾 Message persistence enabled`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});