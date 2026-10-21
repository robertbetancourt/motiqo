import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';

// Reads only the bundled catalog. No network, shell or consumer filesystem access.
export function createCatalogServer(registry, version) {
  const server = new McpServer({ name: 'motiqo', version });
  const annotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
  const result = value => ({ content: [{ type: 'text', text: JSON.stringify(value) }] });
  const id = z.string().regex(/^[a-z][a-z0-9-]{0,79}$/);
  server.registerTool('list_components', {
    description: 'Discover bundled Motiqo components and their dependencies. Does not install anything.',
    inputSchema: z.object({ query: z.string().max(100).optional() }).strict(), annotations,
  }, async ({ query = '' }) => result(registry.items
    .filter(item => `${item.id} ${item.title} ${item.category}`.toLowerCase().includes(query.toLowerCase()))
    .map(({ id, title, category, packageDependencies }) => ({ id, title, category, dependencies: packageDependencies }))));
  server.registerTool('get_component', {
    description: 'Read supported controls, moods, dependencies and file names for one bundled component.',
    inputSchema: z.object({ id }).strict(), annotations,
  }, async ({ id }) => {
    const item = registry.items.find(item => item.id === id);
    if (!item) return { ...result({ error: 'Unknown component' }), isError: true };
    const { files, ...metadata } = item;
    return result({ ...metadata, files: files.map(({ source, target, encoding, sha256 }) => ({ source, target, encoding, sha256 })) });
  });
  server.registerTool('get_component_source', {
    description: 'Read one bundled UTF-8 source file by its exact catalog path. Binary assets must be installed with the CLI.',
    inputSchema: z.object({ id, file: z.string().min(1).max(240) }).strict(), annotations,
  }, async ({ id, file }) => {
    const asset = registry.items.find(item => item.id === id)?.files.find(asset => asset.source === file);
    if (!asset || asset.encoding !== 'utf8') return { ...result({ error: 'Unknown source file or binary asset' }), isError: true };
    if (Buffer.byteLength(asset.content) > 256 * 1024) return { ...result({ error: 'Source exceeds response limit; use the CLI' }), isError: true };
    return result({ path: asset.source, content: asset.content, sha256: asset.sha256 });
  });
  return server;
}

export function startCatalogServer(registry, version) {
  return serveStdio(() => createCatalogServer(registry, version));
}
