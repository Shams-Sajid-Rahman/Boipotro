import { Server } from 'socket.io';
import { z } from 'zod';
import { env } from '../config/env.js';
import { verifyAccessToken } from '../utils/tokens.js';
import { query } from '../db/pool.js';
import * as conversations from '../services/conversation.service.js';

let io = null;

export const userRoom = (userId) => `user:${userId}`;

/** Emit to every open tab/device of each user. Safe to call before init (no-op). */
export function emitToUsers(userIds, event, payload) {
  if (!io) return;
  for (const id of new Set(userIds)) io.to(userRoom(id)).emit(event, payload);
}

const sendSchema = z.object({
  conversationId: z.coerce.number().int().positive(),
  body: z.string().trim().min(1, 'Message cannot be empty').max(2000, 'Message is too long'),
});
const readSchema = z.object({ conversationId: z.coerce.number().int().positive() });

/** Wraps a handler so errors go back through the client's ack callback. */
const withAck = (handler) => async (payload, ack) => {
  const reply = typeof ack === 'function' ? ack : () => {};
  try {
    reply({ ok: true, ...(await handler(payload)) });
  } catch (err) {
    reply({ ok: false, error: err.issues?.[0]?.message || err.message || 'Something went wrong' });
  }
};

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.CLIENT_URL, credentials: true },
  });

  // Authenticate the handshake with the same access token the REST API uses.
  io.use(async (socket, next) => {
    try {
      const payload = verifyAccessToken(socket.handshake.auth?.token);
      const userId = Number(payload.sub);
      const { rows } = await query('SELECT is_banned FROM users WHERE id = $1', [userId]);
      if (!rows[0] || rows[0].is_banned) return next(new Error('unauthorized'));
      socket.data.userId = userId;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const { userId } = socket.data;
    socket.join(userRoom(userId));

    socket.on('message:send', withAck(async (payload) => {
      const { conversationId, body } = sendSchema.parse(payload);
      const { message, participants } = await conversations.sendMessage(conversationId, userId, body);
      emitToUsers(participants, 'message:new', message);
      return { message };
    }));

    socket.on('conversation:read', withAck(async (payload) => {
      const { conversationId } = readSchema.parse(payload);
      const { participants } = await conversations.markRead(conversationId, userId);
      emitToUsers(participants, 'conversation:read', { conversationId, readerId: userId });
      return {};
    }));
  });

  return io;
}
