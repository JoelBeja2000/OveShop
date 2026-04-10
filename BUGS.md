# Bug Registry / Registro de Errores

## Active Bugs / Errores Activos

| Bug ID | Author | Description / Descripción | Fix Details / Detalles de la Solución |
| :--- | :--- | :--- | :--- |
| `BUG-001` | @antigravity | Drawing assets showing placeholder wing icon. / Icono de ala en assets de dibujo. | Implemented dynamic SVG data URL generation. / Generación dinámica de Data URL SVG. |
| `BUG-002` | @antigravity | Drawing strokes offset/shifted. / Trazos de dibujo desplazados. | Normalized coordinates to 0-100% in DrawingElement. / Normalización de coordenadas al 0-100%. |
| `BUG-003` | @antigravity | Color chips missing in grouped items. / Chips de color faltantes en grupos. | Synchronized labeling UI for grouped items. / Sincronización de etiquetas para grupos. |
| `BUG-004` | @antigravity | Recurrent stroke thickening. / Engrosamiento de trazo recurrente. | Implemented scale factor normalization. / Normalización del factor de escala. |
| `BUG-005` | @antigravity | Drawing hitbox mismatch. / Desajuste de hitbox en dibujo. | Dynamic bounding box recalculation. / Recálculo dinámico del bounding box. |
| `BUG-006` | @antigravity | Native color picker persists. / Selector de color nativo persiste. | Implemented forced re-mount trick via React keys. / Re-montado forzado mediante keys de React. |
| `BUG-007` | @antigravity | Render blocked if background is null. / Renderizado bloqueado si el fondo es nulo. | Updated processWithAI guard and added blank background grounding. / Actualizado guard de render y añadido grounding de fondo blanco. |
| `BUG-008` | @antigravity | Duplicate Key warnings in console. / Avisos de claves duplicadas en consola. | RESOLVED: Implemented robust ID generation using `crypto.randomUUID()`. |
| `BUG-009` | @antigravity | React state update during render. / Actualización de estado React durante renderizado. | RESOLVED: Un-nested state updates in drawing handlers and optimized selection logic. |
| `BUG-010` | @antigravity | Empty string passed to src attribute. / Advertencia de src vacío en imágenes. | RESOLVED: Standardized `item.image || undefined` across all components. |
| `BUG-011` | @antigravity | Render process hangs indefinitely. / El proceso de render se queda bloqueado. | RESOLVED: Fixed missing `img.src` assignment in `ImageProcessor.ts`. |
| `BUG-012` | @antigravity | Drawings shifting on re-edit. / Dibujos desplazados al reeditar. | RESOLVED: Implemented robust local/global coordinate transformation logic. |
