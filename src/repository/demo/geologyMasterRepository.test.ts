import { beforeEach, describe, expect, it } from 'vitest'
import type { UpdateDepositPatch } from '../../entities/geology-master/model/types'
import { DemoDatabase } from './demoDatabase'
import { DemoGeologyMasterRepository } from './geologyMasterRepository'

describe('DemoGeologyMasterRepository BGD CRUD', () => {
  const database = new DemoDatabase('test-geology-master-bgd')
  const repository = new DemoGeologyMasterRepository(database)

  beforeEach(async () => {
    await database.reset()
  })

  it('seeds deterministic fields with GeoBase attributes', async () => {
    const data = await repository.getMasterData()

    expect(data.deposits).toHaveLength(3)
    expect(data.deposits[0]).toMatchObject({ numericId: 1, code: 'SARYTAU', objectType: 'field', isHidden: false })
    expect(data.deposits.find((item) => item.code === 'VOSTOCHNAYA')?.isHidden).toBe(true)
    expect(data.deposits[0]?.occurrences).toHaveLength(2)
  })

  it('creates, updates, hides and deletes an independent field', async () => {
    const created = await repository.createDeposit({
      numericId: 77,
      code: 'DEMO-77',
      objectType: 'custom',
      customType: 'лицензионная территория',
      name: 'Демонстрационное 77',
      crs: 'LOCAL:DEMO-77',
      coordinateSystemDescription: 'Условная локальная сетка',
      description: 'Только synthetic данные.',
      isHidden: false,
      occurrences: [{ id: '', type: 'рудная залежь', name: 'Залежь 1' }],
    })

    expect(created).toMatchObject({ numericId: 77, version: 1, objectType: 'custom', isHidden: false })
    expect(created.occurrences[0]?.id).toBe('OCC-DEMO-77-01')

    const patch: UpdateDepositPatch = {
      name: 'Демонстрационное 77 · скрыто',
      objectType: 'field',
      customType: undefined,
      crs: created.crs,
      coordinateSystemDescription: created.coordinateSystemDescription,
      description: created.description,
      isHidden: true,
      occurrences: created.occurrences,
    }
    const updated = await repository.updateDeposit(created, patch)
    expect(updated).toMatchObject({ version: 2, objectType: 'field', isHidden: true })

    await repository.deleteDeposit(updated)
    expect((await repository.getMasterData()).deposits.some((item) => item.id === created.id)).toBe(false)
  })

  it('rejects duplicate numeric IDs and immutable codes', async () => {
    await expect(repository.createDeposit({ numericId: 1, code: 'OTHER', name: 'Другое', description: '', crs: 'EPSG:32642' }))
      .rejects.toThrow('числовым ID')
    await expect(repository.createDeposit({ numericId: 99, code: 'SARYTAU', name: 'Дубликат', description: '', crs: 'EPSG:32642' }))
      .rejects.toThrow('кодом')
  })

  it('blocks deletion when hierarchy dependencies exist', async () => {
    const data = await repository.getMasterData()
    const sarytau = data.deposits.find((item) => item.code === 'SARYTAU')!

    await expect(repository.deleteDeposit(sarytau)).rejects.toThrow('DEPENDENCY_WARNING')
  })
})
