Title: Vencord OpenSnap-Style Image Editor (Design)
Date: 2026-04-03
Status: Draft

## Overview
Build a Vencord plugin that provides a Discord-native image editor inspired by OpenSnap. The editor opens from a new "Edit Image" button next to the message box/upload button and edits a pending image attachment. Users can set backgrounds (transparent, solid, gradient, image URL), apply effects (padding, border radius, drop shadow), and add arrow annotations. On Apply, the edited image replaces the pending attachment.

## Goals
- Discord-native look and feel for the editor UI.
- Feature parity with the requested subset of OpenSnap: backgrounds, effects, arrow annotations.
- Replace the pending attachment with the edited PNG on Apply.
- Responsive preview with full-resolution export.

## Non-Goals
- Full OpenSnap feature set (e.g., multi-tool annotations, cropping, text, freehand).
- Standalone desktop app or external editor embed.
- Persistent asset library or history of edits.

## Architecture
The plugin consists of three primary parts:

1. **UI Layer (React in Vencord)**
   - Adds an "Edit Image" button in the message composer area.
   - Opens a Discord-native modal/panel with a canvas preview and sidebar controls.
   - Controls update editor state (background, effects, arrow settings).

2. **Editor State and Rendering Pipeline**
   - Loads the pending attachment into an ImageBitmap.
   - Renders a preview using a compositing pipeline:
     - Background (transparent/solid/gradient/image URL)
     - Effects (padding, border radius, drop shadow)
     - Image
     - Arrow overlay
   - Maintains a distinct preview render (capped resolution) and an export render (full resolution).

3. **Attachment Integration**
   - Reads the current pending image attachment from the Discord composer state.
   - On Apply, exports the full-resolution canvas to a PNG blob and replaces the pending attachment.

## UI Components
### Main Editor Modal
- **Left:** Canvas preview area.
- **Right:** Sidebar controls grouped by section:
  - Background
    - Transparent toggle
    - Solid color picker
    - Gradient editor (angle + 2-3 stops)
    - Image URL input with fit options
  - Effects
    - Padding slider
    - Border radius slider
    - Drop shadow controls (x/y/blur/opacity)
  - Annotation
    - Arrow tool with color + thickness

### Arrow Annotation
- Single arrow at a time (v1).
- Drag handles for start/end points on the canvas.
- Arrow preview updates in real time as settings change.

## Data Flow
1. User clicks "Edit Image".
2. Plugin reads the pending attachment and loads it to ImageBitmap.
3. Editor state initializes with defaults.
4. Render pipeline draws the preview canvas.
5. User adjusts settings and arrow endpoints.
6. On Apply, render at full resolution and export to PNG.
7. Replace the pending attachment in the composer with the edited image.

## Error Handling and Edge Cases
- If no pending image attachment exists, disable the button and show a tooltip.
- Invalid background URL: show inline error and keep the last successful background.
- Large images: preview at capped resolution; export at full resolution.
- Export failure: show toast and keep editor state for retry.

## Testing Strategy
- Unit tests for render pipeline inputs and outputs.
- UI interaction tests for sidebar controls and arrow editing.
- Basic integration test to confirm attachment replacement flow.

## Open Questions
- None. Scope and flow are locked per user decisions.
