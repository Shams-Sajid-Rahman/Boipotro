import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { getAccessToken, refreshSession } from '../lib/api.js';
import { useAuth } from './AuthContext.jsx';

const SocketContext = createContext(null);

/** One Socket.IO connection per logged-in session, authenticated with the access token. */
export function SocketProvider({ children }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!user) return undefined;

    const s = io({
      // Called on every (re)connect, so a refreshed token is always used.
      auth: (cb) => cb({ token: getAccessToken() }),
      transports: ['websocket', 'polling'],
    });

    s.on('connect_error', async (err) => {
      if (err.message !== 'unauthorized') return;
      try {
        await refreshSession();
        s.connect();
      } catch {
        // Session is gone; AuthContext will log the user out on the next API call.
      }
    });

    // Keep unread badges and inbox order fresh wherever the user is in the app.
    const refreshInbox = () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['unread'] });
    };
    s.on('message:new', refreshInbox);
    s.on('conversation:read', refreshInbox);

    setSocket(s);
    return () => {
      s.disconnect();
      setSocket(null);
    };
  }, [user, queryClient]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export const useSocket = () => useContext(SocketContext);
