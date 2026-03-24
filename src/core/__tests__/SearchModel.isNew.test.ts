import 'reflect-metadata'
import { Mocked } from 'vitest'
import { SearchModel, SaveEvent } from '../SearchModel'
import { StringType } from '../../decorators'
import { search } from '../SearchService'
import { id } from '../../utils/id'

vi.mock('../SearchService', async () => {
  const actual = await vi.importActual('../SearchService')
  return {
    ...actual,
    search: {
      searchRequest: vi.fn(),
      query: vi.fn(),
      getById: vi.fn(),
    },
  }
})

const mockedSearch = search as Mocked<typeof search>

class TestModel extends SearchModel<TestModel> {
  static readonly indexName = 'test-is-new'

  @StringType({ required: true })
  name!: string

  // Track isNew() values observed in hooks
  isNewInBeforeSave?: boolean
  isNewInAfterSave?: boolean

  protected async beforeSave(event: SaveEvent): Promise<boolean> {
    this.isNewInBeforeSave = this.isNew()
    return true
  }

  protected async afterSave(event: SaveEvent): Promise<void> {
    this.isNewInAfterSave = this.isNew()
  }
}

describe('SearchModel.isNew()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedSearch.searchRequest.mockReset()
  })

  it('should return true for a freshly constructed instance', () => {
    const model = new TestModel({ name: 'test' })
    expect(model.isNew()).toBe(true)
  })

  it('should return false when constructed with id and version (loaded from ES)', () => {
    const model = new TestModel({ id: id(), name: 'test', version: 1 } as any)
    expect(model.isNew()).toBe(false)
  })

  it('should return false after first save', async () => {
    const testId = id()
    mockedSearch.searchRequest.mockResolvedValue({ _id: testId, _version: 1 })

    const model = new TestModel({ id: testId, name: 'test' })
    expect(model.isNew()).toBe(true)

    await model.save()
    expect(model.isNew()).toBe(false)
  })

  it('should remain false after subsequent saves', async () => {
    const testId = id()
    mockedSearch.searchRequest.mockResolvedValue({ _id: testId, _version: 1 })

    const model = new TestModel({ id: testId, name: 'test' })
    await model.save()

    mockedSearch.searchRequest.mockResolvedValue({ _id: testId, _version: 2 })
    model.name = 'updated'
    await model.save()

    expect(model.isNew()).toBe(false)
  })

  it('should return true in beforeSave for new documents', async () => {
    const testId = id()
    mockedSearch.searchRequest.mockResolvedValue({ _id: testId, _version: 1 })

    const model = new TestModel({ id: testId, name: 'test' })
    await model.save()

    expect(model.isNewInBeforeSave).toBe(true)
  })

  it('should return false in beforeSave for existing documents', async () => {
    const testId = id()
    mockedSearch.searchRequest.mockResolvedValue({ _id: testId, _version: 1 })

    const model = new TestModel({ id: testId, name: 'test' })
    await model.save()

    // Reset tracking
    model.isNewInBeforeSave = undefined
    mockedSearch.searchRequest.mockResolvedValue({ _id: testId, _version: 2 })
    model.name = 'updated'
    await model.save()

    expect(model.isNewInBeforeSave).toBe(false)
  })

  it('should return true in afterSave for new documents', async () => {
    const testId = id()
    mockedSearch.searchRequest.mockResolvedValue({ _id: testId, _version: 1 })

    const model = new TestModel({ id: testId, name: 'test' })
    await model.save()

    // afterSave runs before _isNewDocument is cleared
    expect(model.isNewInAfterSave).toBe(true)
    // But after afterSave completes, isNew() should be false
    expect(model.isNew()).toBe(false)
  })

  it('should return false in afterSave for existing documents', async () => {
    const testId = id()
    mockedSearch.searchRequest.mockResolvedValue({ _id: testId, _version: 1 })

    const model = new TestModel({ id: testId, name: 'test' })
    await model.save()

    model.isNewInAfterSave = undefined
    mockedSearch.searchRequest.mockResolvedValue({ _id: testId, _version: 2 })
    model.name = 'updated again'
    await model.save()

    expect(model.isNewInAfterSave).toBe(false)
  })

  it('should return false for documents loaded via constructor with id+version', () => {
    // Simulates what happens when loading from ES (getById, find, etc.)
    const model = new TestModel({
      id: id(),
      name: 'loaded',
      version: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any)

    expect(model.isNew()).toBe(false)
  })

  it('should return true when only id is provided (no version)', () => {
    // Pre-setting an id doesn't make it "existing" — version is required too
    const model = new TestModel({ id: id(), name: 'test' })
    expect(model.isNew()).toBe(true)
  })

  it('should still be true if save fails', async () => {
    const testId = id()
    mockedSearch.searchRequest.mockRejectedValue(new Error('ES unavailable'))

    const model = new TestModel({ id: testId, name: 'test' })
    expect(model.isNew()).toBe(true)

    await expect(model.save()).rejects.toThrow('ES unavailable')
    expect(model.isNew()).toBe(true)
  })
})
