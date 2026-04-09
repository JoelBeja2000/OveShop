# Bug Registry

## Active Bugs

| Bug ID | Author | Description | Fix Details |
| :--- | :--- | :--- | :--- |
| `BUG-001` | @antigravity | Drawing assets showing placeholder wing icon. | Implemented dynamic SVG data URL generation from strokes in `App.tsx`. |
| `BUG-002` | @antigravity | Drawing strokes offset/shifted from bounding box. | Simplified `DrawingElement.tsx` to handle 0-100% normalization without pixel-based padding. |
| `BUG-003` | @antigravity | Color chips missing in grouped layer items. | Synchronized the color labeling UI between Case A (standalone) and Case B (grouped) items in `App.tsx`. |
| `BUG-004` | @antigravity | Recurrent stroke thickening during re-edits. | Implemented scale factor normalization in `handleFinishDrawing` to maintain visual consistent width. |
| `BUG-005` | @antigravity | Drawing hitbox/UI mismatch after resizing. | Implemented dynamic bounding box recalculation and SVG ratio scaling in `CameraCapture.tsx`. |
