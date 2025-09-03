import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(token: string) {
  if (socket && socket.connected) return socket;

  socket = io(`${process.env.NEXT_PUBLIC_API_URL!}/ws`, {
    path: '/socket.io',
    auth: { token },
  });

  // Log utile pour voir les erreurs de handshake (JWT, etc.)
  socket.on('connect_error', (err) => {
    console.error('WS connect_error:', err.message, err);
  });

  return socket!;
}
