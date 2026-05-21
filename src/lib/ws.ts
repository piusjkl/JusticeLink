export function connectWS(token: string) {
  const base = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/api$/, '');
  const url = base.replace('http', 'ws') + `/ws?token=${encodeURIComponent(token)}`;
  const ws = new WebSocket(url);
  return ws;
}

export function subscribeSession(ws: WebSocket, sessionId: string) {
  ws.send(JSON.stringify({ type: 'subscribe_session', sessionId }));
}
export function unsubscribeSession(ws: WebSocket, sessionId: string) {
  ws.send(JSON.stringify({ type: 'unsubscribe_session', sessionId }));
}
export function subscribeCase(ws: WebSocket, caseId: string) {
  ws.send(JSON.stringify({ type: 'subscribe_case', caseId }));
}
export function unsubscribeCase(ws: WebSocket, caseId: string) {
  ws.send(JSON.stringify({ type: 'unsubscribe_case', caseId }));
}