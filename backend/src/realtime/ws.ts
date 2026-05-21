import type { Server } from 'http';
import url from 'url';
import jwt from 'jsonwebtoken';
import { env } from '../utils/env';

// Import WebSocket module directly since it's now installed
import { WebSocket, WebSocketServer } from 'ws';
const WSAvail = true;
const WSModule = { WebSocket, WebSocketServer };

type Client = {
  ws: any;
  userId: string;
  role: string;
};

const sessionSubs = new Map<string, Set<Client>>();
const caseSubs = new Map<string, Set<Client>>();

function addSub(map: Map<string, Set<Client>>, key: string, client: Client) {
  if (!map.has(key)) map.set(key, new Set());
  map.get(key)!.add(client);
}
function removeClientFromAll(client: Client) {
  for (const set of sessionSubs.values()) set.delete(client);
  for (const set of caseSubs.values()) set.delete(client);
}

export function initWebSocketServer(server: Server) {
  if (!WSAvail) {
    console.log('[Realtime] ws not installed; realtime disabled.');
    return;
  }
  const { WebSocketServer } = WSModule as any;
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const parsed = url.parse(req.url || '', true);
    if (!parsed.pathname?.startsWith('/ws')) return; // ignore other upgrade paths
    const token = parsed.query.token;
    if (typeof token !== 'string') {
      socket.destroy();
      return;
    }
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as any;
      (req as any).authUser = { sub: payload.sub, role: payload.role };
    } catch {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket as any, head, (ws: any) => {
      wss.emit('connection', ws, req);
    });
  });

  wss.on('connection', (ws: any, req: any) => {
    const authUser = (req as any).authUser as { sub: string; role: string } | undefined;
    if (!authUser) { ws.close(); return; }
    const client: Client = { ws, userId: authUser.sub, role: authUser.role };

    ws.on('message', (data: any) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg?.type === 'subscribe_session' && typeof msg.sessionId === 'string') {
          addSub(sessionSubs, msg.sessionId, client);
        } else if (msg?.type === 'unsubscribe_session' && typeof msg.sessionId === 'string') {
          sessionSubs.get(msg.sessionId)?.delete(client);
        } else if (msg?.type === 'subscribe_case' && typeof msg.caseId === 'string') {
          addSub(caseSubs, msg.caseId, client);
        } else if (msg?.type === 'unsubscribe_case' && typeof msg.caseId === 'string') {
          caseSubs.get(msg.caseId)?.delete(client);
        }
      } catch {}
    });

    ws.on('close', () => {
      removeClientFromAll(client);
    });
  });
}

function safeSend(ws: any, payload: any) {
  try { ws.send(JSON.stringify(payload)); } catch {}
}

export function broadcastSession(sessionId: string, payload: { event: string; [k: string]: any }) {
  if (!WSAvail) return;
  const subs = sessionSubs.get(sessionId);
  if (!subs) return;
  for (const c of subs) {
    safeSend(c.ws, { type: 'session_event', sessionId, ...payload });
  }
}

export function broadcastCase(caseId: string, payload: { event: string; [k: string]: any }) {
  if (!WSAvail) return;
  const subs = caseSubs.get(caseId);
  if (!subs) return;
  for (const c of subs) {
    safeSend(c.ws, { type: 'case_event', caseId, ...payload });
  }
}
