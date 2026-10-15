import { readFile, readdir } from 'node:fs/promises'
import { dirname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const moduleRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
async function sources(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map(entry => entry.isDirectory() ? sources(resolve(directory, entry.name)) : /\.(ts|tsx|css)$/.test(entry.name) ? [resolve(directory, entry.name)] : []))
  return nested.flat()
}
for (const file of await sources(moduleRoot)) {
  const content = await readFile(file, 'utf8')
  for (const match of content.matchAll(/(?:from\s*|import\s*(?:\(\s*)?)['"]([^'"]+)['"]/g)) {
    if (match[1].startsWith('.') && !resolve(dirname(file), match[1]).startsWith(moduleRoot + sep)) throw new Error(`Import escapes internal module: ${file}: ${match[1]}`)
  }
}
if (process.argv.includes('--built')) {
  const root = resolve(moduleRoot, '../../..')
  const product = await readFile(resolve(root, 'dist/index.html'), 'utf8')
  const atlas = await readFile(resolve(root, 'dist/internal/knowledge-map.html'), 'utf8')
  const css = html => [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map(match => match[1])
  if (!css(product).length || !css(atlas).length || css(product).some(path => css(atlas).includes(path))) throw new Error('Product and atlas styles must be emitted independently')
  if (product.includes('knowledge-map-')) throw new Error('Atlas entry is eagerly loaded by the product HTML')
  if (!atlas.includes('/kapgeo_prototype/assets/')) throw new Error('Atlas build does not use the shared production base')
}
console.log('Knowledge Map isolation: internal imports and separate entry/styles verified.')
