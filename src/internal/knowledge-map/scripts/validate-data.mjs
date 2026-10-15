import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

// Vite transforms the exact TypeScript validator used by the browser: no second schema.
const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const server = await createServer({ root, configFile: false, cacheDir: resolve(root, '../../../.tmp/knowledge-map-validator-cache'), optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true }, appType: 'custom' })
try {
  const { validateModel } = await server.ssrLoadModule('/entities/knowledge/schema.ts')
  const data = Object.fromEntries(await Promise.all([
    ['nodes', 'nodes'], ['edges', 'edges'], ['categories', 'categories'], ['learningPaths', 'learning-paths'],
    ['sources', 'sources'],
  ].map(async ([key, file]) => [key, JSON.parse(await readFile(new URL(`../data/${file}.json`, import.meta.url), 'utf8'))])))
  const model = validateModel(data)
  console.log(`Модель корректна: ${model.nodes.length} узлов, ${model.edges.length} связей, ${model.categories.length} областей, ${model.learningPaths.length} маршрутов.`)
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  await server.close()
}
