# Motiqo — evolución pendiente

Estas propuestas quedan registradas para fases posteriores. No forman parte de la entrega actual.

- [ ] MCP: búsqueda, documentación e instalación asistida sobre el mismo registro versionado. Evaluarlo cuando el CLI y la skill tengan uso real.
- [ ] Abrir en StackBlitz / CodeSandbox: generar el proyecto desde los mismos archivos, recursos y dependencias del instalador.
- [ ] Exportador de video/GIF: primero una línea de tiempo determinista y captura conjunta de Canvas, SVG y HTML. Validar continuidad del loop, formatos, transparencias y dispositivos antes de prometer 60 FPS.
- [ ] Calidad adaptativa: medir coste real de GPU y memoria en dispositivos modestos antes de definir perfiles Auto / calidad / ahorro.
- [ ] Publicación npm y condiciones de distribución: confirmar nombre/organización, licencia y derechos de los recursos antes de publicar. Conservar los créditos existentes del motor adaptado de Liquid Relic / Event Horizon.
- [ ] Instalación automática con otros gestores de paquetes: actualmente el CLI copia archivos en cualquier proyecto React y `--install` utiliza npm; pnpm/yarn/bun reciben la lista de dependencias para instalar con su propio gestor.

## Bloques de la entrega actual

- [x] Ficha única por componente: archivos, dependencias, controles y moods.
- [x] CLI empaquetado, integridad, simulación y protección contra sobrescrituras.
- [x] Skill distribuible.
- [x] Moods en el inspector.
- [x] Accesibilidad semántica dinámica.
- [x] Descarga ZIP completa.
- [x] Configuraciones compartibles y persistentes.
- [x] Validación de componentes exportados en un proyecto React independiente.
- [x] Getting started actualizado y comprobaciones automatizadas.

Validación: pruebas automatizadas de comportamiento e instalación, build de producción, 90 ejemplos compilados en React independiente, descargas HTTP y revisión visual en escritorio/móvil. La CI queda configurada; su primera ejecución remota ocurrirá al subir estos cambios.
