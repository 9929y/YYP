# Work popup carousel — portfolio navigation redesign

Date: 2026-08-27  
Status: approved (direct navigate; keep orbit/zoom; horizontal scroll yaw)

## Intent
Work panel is a **clickable project shelf**, not a decorative drum preview.

## Decisions
- Click card → navigate to project `href` when set
- Orbit, pitch, zoom, pinch remain available
- Horizontal scroll / trackpad X → yaw the cylinder
- Face-on open (near-zero lean), larger panel stage, sharp covers
- Blur the **page behind** the panel; no `backdrop-filter` on photo glass
- Replay fan-out when Work opens
- Hover: lift + title/scope; pause idle spin while hovered

## Out of scope
- In-panel project detail sheet
- WebGL bent meshes
