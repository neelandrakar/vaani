import express from 'express';
import http from 'http';
import cors from 'cors';
import { config } from './config/env.js';
import { rateLimit } from './middleware/rate-limit.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';
import { voiceServer } from './websocket/voice-server.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import leadRoutes from './routes/lead.routes.js';
import conversationRoutes from './routes/conversation.routes.js';
import callbackRoutes from './routes/callback.routes.js';
import configRoutes from './routes/config.routes.js';
import propertyRoutes from './routes/property.routes.js';
import knowledgeRoutes from './routes/knowledge.routes.js';
import healthRoutes from './routes/health.routes.js';
import telephonyRoutes from './routes/telephony.routes.js';

const app = express();
const server = http.createServer(app);

// Global Middlewares
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(rateLimit({ windowMs: 60 * 1000, max: 200 }));

// Liveness & Readiness
app.use('/', healthRoutes);

// API v1 Routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/callbacks', callbackRoutes);
app.use('/api/config', configRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/telephony', telephonyRoutes);

// Centralized Error Handler
app.use(errorHandler);

// Initialize Voice WebSocket Server on same HTTP server
voiceServer.initialize(server);

// Start HTTP & WS Server
server.listen(config.port, () => {
  console.log(`🚀 Vaani Backend API & Voice Server running at http://localhost:${config.port}`);
  console.log(`📡 WebSocket endpoint ready at ws://localhost:${config.port}/ws/voice`);
  console.log(`⚙️ Mode: ${config.nodeEnv} | Timezone: ${config.defaultTimezone}`);
});

export { app, server };
