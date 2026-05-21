# Justice Link – Video Conferencing (Judge & Registrar)

This document describes how the judge and registrar (clerk) use the built-in video conferencing, how notifications work, and the roadmap to a production-ready experience inspired by tools like Jitsi/Zoom and court deployments using WebRTC SFUs (e.g., LiveKit, Janus, mediasoup).

## Current UX (MVP)

- Judge
  - From the Judicial Dashboard, click “Video Conference” → select a case → Start Now.
  - A session is created and the judge auto-joins. Controls: mic/cam, share screen, mark attendance, request evidence, record ruling (notes), adjourn, proceed in absence, end session.
  - A side panel shows Case details, Notes, and live Activity.

- Registrar (Clerk)
  - From the Registrar Dashboard, open a case card and click “Monitor Video”. The monitor opens and auto-joins the active session when the judge starts it.
  - Controls: mute/unmute, Present Screen (start/stop), Mark Attendance, Fullscreen Display (to project in courtroom).
  - Participants and recent Activity are visible; actions are audited to the case timeline.

- Notifications (cross-side)
  - When sessions start/end, a participant joins, or an action is recorded (ruling, adjournment, presentation start/stop, etc.), both the judge and all active registrars receive in-app notifications. The bell icon shows unread counts.

## Architecture Snapshot (MVP)

- Presence & Audit via REST
  - Session lifecycle and actions are persisted via REST endpoints.
  - Frontend polls session state every 5 seconds to update participants and activity.
- Media
  - Local getUserMedia + getDisplayMedia used for controls. In MVP, streams are placeholders; real media routing is introduced in the roadmap.

## Roadmap to Production

1) WebSocket Signaling (Low-latency events)
   - Add a WebSocket gateway so join/leave/action events are pushed in real time to judge and registrar (no polling).

2) WebRTC SFU for Media Routing (Scalable video)
   - Integrate an SFU (LiveKit, mediasoup, Janus, or Jitsi) to handle multi-party audio/video.
   - Clerk’s “Courtroom Display” subscribes to judge’s feed; judge can spotlight speakers or shared content.

3) Moderation & Roles
   - Judge as moderator: admit/remove participants, mute-all, request to speak.
   - Registrar: present court materials, manage lobby/labels.

4) Recording & Compliance
   - Server-side recording (SFU feature) with consent banner and retention policies.
   - Redaction tools and secure evidence linking.

5) Device Management & Accessibility
   - Device pickers, echo test, captions, and language interpretation.

This roadmap mirrors proven patterns in national e-court deployments that use SFUs with role-based moderation and audit trails.
