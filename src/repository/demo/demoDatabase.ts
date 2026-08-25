import { getSeedWells } from '../data/wells'
import type { Well } from '../../entities/well/model/types'

export const DEMO_DATABASE_NAME = 'kapgeo-demo'
export const DEMO_SCHEMA_VERSION = 1
export const DEMO_SEED_VERSION = 'demo-main-v1'

export const demoStoreNames = ['meta', 'records', 'versions', 'relations', 'auditEvents', 'jobs', 'artifacts', 'preferences'] as const
export type DemoStoreName = (typeof demoStoreNames)[number]

export type DemoRecord<T = unknown> = {
  id: string
  entityType: string
  objectId: string
  scopeId: string
  status: string
  updatedAt: string
  data: T
}

export type DemoMeta = {
  key: 'schemaVersion' | 'seedVersion' | 'initializedAt'
  value: number | string
}

export type DemoSnapshot = {
  schemaVersion: number
  seedVersion: string
  exportedAt: string
  stores: Record<DemoStoreName, unknown[]>
}

export interface DemoTransaction {
  get<T>(store: DemoStoreName, key: IDBValidKey): Promise<T | undefined>
  getAll<T>(store: DemoStoreName): Promise<T[]>
  put<T>(store: DemoStoreName, value: T): Promise<void>
  delete(store: DemoStoreName, key: IDBValidKey): Promise<void>
  clear(store: DemoStoreName): Promise<void>
}

type MemoryStore = Map<IDBValidKey, unknown>
const memoryDatabases = new Map<string, Map<DemoStoreName, MemoryStore>>()

function requestAsPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Ошибка IndexedDB.'))
  })
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onabort = transaction.onerror = () => reject(transaction.error ?? new Error('Ошибка транзакции IndexedDB.'))
  })
}

function keyFor(value: unknown): IDBValidKey {
  if (!value || typeof value !== 'object') throw new Error('Запись должна иметь ключ id или key.')
  const record = value as { id?: IDBValidKey; key?: IDBValidKey }
  if (record.id !== undefined) return record.id
  if (record.key !== undefined) return record.key
  throw new Error('Запись должна иметь ключ id или key.')
}

function getMemoryDatabase(name: string): Map<DemoStoreName, MemoryStore> {
  const existing = memoryDatabases.get(name)
  if (existing) return existing
  const database = new Map<DemoStoreName, MemoryStore>()
  for (const storeName of demoStoreNames) database.set(storeName, new Map())
  memoryDatabases.set(name, database)
  return database
}

class MemoryDemoTransaction implements DemoTransaction {
  constructor(private readonly stores: Map<DemoStoreName, MemoryStore>) {}
  async get<T>(store: DemoStoreName, key: IDBValidKey) { return structuredClone(this.stores.get(store)!.get(key) as T | undefined) }
  async getAll<T>(store: DemoStoreName) { return [...this.stores.get(store)!.values()].map((value) => structuredClone(value as T)) }
  async put<T>(store: DemoStoreName, value: T) { this.stores.get(store)!.set(keyFor(value), structuredClone(value)) }
  async delete(store: DemoStoreName, key: IDBValidKey) { this.stores.get(store)!.delete(key) }
  async clear(store: DemoStoreName) { this.stores.get(store)!.clear() }
}

class BrowserDemoTransaction implements DemoTransaction {
  constructor(private readonly transaction: IDBTransaction) {}
  async get<T>(store: DemoStoreName, key: IDBValidKey) { return requestAsPromise(this.transaction.objectStore(store).get(key)) as Promise<T | undefined> }
  async getAll<T>(store: DemoStoreName) { return requestAsPromise(this.transaction.objectStore(store).getAll()) as Promise<T[]> }
  async put<T>(store: DemoStoreName, value: T) { await requestAsPromise(this.transaction.objectStore(store).put(structuredClone(value))) }
  async delete(store: DemoStoreName, key: IDBValidKey) { await requestAsPromise(this.transaction.objectStore(store).delete(key)) }
  async clear(store: DemoStoreName) { await requestAsPromise(this.transaction.objectStore(store).clear()) }
}

export class DemoDatabase {
  private database?: IDBDatabase
  private initialization?: Promise<void>
  private readonly memory: Map<DemoStoreName, MemoryStore> | undefined

  constructor(
    readonly name = DEMO_DATABASE_NAME,
    private readonly schemaVersion = DEMO_SCHEMA_VERSION,
    private readonly seedVersion = DEMO_SEED_VERSION,
  ) {
    this.memory = typeof indexedDB === 'undefined' ? getMemoryDatabase(name) : undefined
  }

  async initialize(): Promise<void> {
    if (!this.initialization) this.initialization = this.initializeInternal()
    return this.initialization
  }

  async get<T>(store: DemoStoreName, key: IDBValidKey): Promise<T | undefined> {
    await this.initialize()
    return this.read(store, key)
  }

  async getAll<T>(store: DemoStoreName): Promise<T[]> {
    await this.initialize()
    return this.readAll(store)
  }

  async put<T>(store: DemoStoreName, value: T): Promise<void> {
    await this.transaction([store], (transaction) => transaction.put(store, value))
  }

  async transaction<T>(stores: DemoStoreName[], operation: (transaction: DemoTransaction) => Promise<T> | T): Promise<T> {
    await this.initialize()
    return this.write(stores, operation)
  }

  async reset(): Promise<void> {
    this.database?.close()
    this.database = undefined
    this.initialization = undefined
    if (this.memory) {
      for (const store of this.memory.values()) store.clear()
      memoryDatabases.set(this.name, this.memory)
    } else {
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase(this.name)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error ?? new Error('Не удалось удалить демонстрационные данные.'))
        request.onblocked = () => reject(new Error('Закройте другие вкладки KAPGEO и повторите сброс.'))
      })
    }
    await this.initialize()
  }

  async exportSnapshot(): Promise<DemoSnapshot> {
    await this.initialize()
    const pairs = await Promise.all(demoStoreNames.map(async (store) => [store, await this.readAll(store)] as const))
    return { schemaVersion: this.schemaVersion, seedVersion: this.seedVersion, exportedAt: new Date().toISOString(), stores: Object.fromEntries(pairs) as DemoSnapshot['stores'] }
  }

  async importSnapshot(snapshot: DemoSnapshot): Promise<void> {
    if (snapshot.schemaVersion !== this.schemaVersion || snapshot.seedVersion !== this.seedVersion) {
      throw new Error('Снимок создан для другой версии демонстрационной схемы.')
    }
    await this.transaction([...demoStoreNames], async (transaction) => {
      for (const store of demoStoreNames) {
        await transaction.clear(store)
        for (const value of snapshot.stores[store] ?? []) await transaction.put(store, value)
      }
    })
  }

  private async initializeInternal(): Promise<void> {
    if (!this.memory) this.database = await this.open()
    const schema = await this.read<DemoMeta>('meta', 'schemaVersion')
    const seed = await this.read<DemoMeta>('meta', 'seedVersion')
    if (schema?.value === this.schemaVersion && seed?.value === this.seedVersion) return
    await this.write([...demoStoreNames], async (transaction) => {
      for (const store of demoStoreNames) await transaction.clear(store)
      for (const well of getSeedWells()) await transaction.put('records', wellRecord(well))
      await transaction.put('meta', { key: 'schemaVersion', value: this.schemaVersion } satisfies DemoMeta)
      await transaction.put('meta', { key: 'seedVersion', value: this.seedVersion } satisfies DemoMeta)
      await transaction.put('meta', { key: 'initializedAt', value: '2026-08-24T00:00:00.000Z' } satisfies DemoMeta)
    })
  }

  private async read<T>(store: DemoStoreName, key: IDBValidKey): Promise<T | undefined> {
    if (this.memory) return structuredClone(this.memory.get(store)!.get(key) as T | undefined)
    const transaction = this.requireDatabase().transaction(store, 'readonly')
    const result = await requestAsPromise(transaction.objectStore(store).get(key)) as T | undefined
    await transactionDone(transaction)
    return result === undefined ? undefined : structuredClone(result)
  }

  private async readAll<T>(store: DemoStoreName): Promise<T[]> {
    if (this.memory) return [...this.memory.get(store)!.values()].map((value) => structuredClone(value as T))
    const transaction = this.requireDatabase().transaction(store, 'readonly')
    const result = await requestAsPromise(transaction.objectStore(store).getAll()) as T[]
    await transactionDone(transaction)
    return structuredClone(result)
  }

  private async write<T>(stores: DemoStoreName[], operation: (transaction: DemoTransaction) => Promise<T> | T): Promise<T> {
    if (this.memory) {
      const staged = new Map<DemoStoreName, MemoryStore>()
      for (const store of stores) staged.set(store, new Map(this.memory.get(store)!))
      const result = await operation(new MemoryDemoTransaction(staged))
      for (const store of stores) this.memory.set(store, staged.get(store)!)
      return result
    }
    const transaction = this.requireDatabase().transaction(stores, 'readwrite')
    const result = await operation(new BrowserDemoTransaction(transaction))
    await transactionDone(transaction)
    return result
  }

  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.name, this.schemaVersion)
      request.onupgradeneeded = () => {
        const database = request.result
        for (const storeName of demoStoreNames) {
          const store = database.objectStoreNames.contains(storeName)
            ? request.transaction!.objectStore(storeName)
            : database.createObjectStore(storeName, { keyPath: storeName === 'meta' ? 'key' : 'id' })
          if (storeName === 'records') {
            for (const index of ['entityType', 'objectId', 'scopeId', 'status', 'updatedAt']) {
              if (!store.indexNames.contains(index)) store.createIndex(index, index, { unique: false })
            }
          }
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error ?? new Error('Не удалось открыть IndexedDB.'))
    })
  }

  private requireDatabase(): IDBDatabase {
    if (!this.database) throw new Error('DemoDatabase не инициализирована.')
    return this.database
  }
}

export function wellRecord(well: Well, updatedAt = '2026-08-24T00:00:00.000Z'): DemoRecord<Well> {
  return { id: `well:${well.id}`, entityType: 'well', objectId: well.id, scopeId: well.site, status: well.status, updatedAt, data: structuredClone(well) }
}

export const demoDatabase = new DemoDatabase()