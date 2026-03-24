import 'reflect-metadata'
import { Mocked } from 'vitest'
import { SearchModel } from '../SearchModel'
import { StringType, NumberType } from '../../decorators'
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

class User extends SearchModel<User> {
  static readonly indexName = 'users'

  @StringType({ required: true })
  name!: string
}

class Order extends SearchModel<Order> {
  static readonly indexName = 'orders'

  @NumberType()
  total!: number
}

describe('SearchModel _model field', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedSearch.searchRequest.mockReset()
    mockedSearch.query.mockReset()
    mockedSearch.getById.mockReset()
  })

  describe('toSearch', () => {
    it('should include _model with the class name', () => {
      const user = new User({ name: 'Alice' })
      const doc = user.toSearch()
      expect(doc._model).toBe('User')
    })

    it('should use the correct class name for different models', () => {
      const order = new Order({ total: 99 })
      const doc = order.toSearch()
      expect(doc._model).toBe('Order')
    })
  })

  describe('toJSON', () => {
    it('should include _model with the class name', () => {
      const user = new User({ name: 'Alice' })
      const json = user.toJSON()
      expect(json._model).toBe('User')
    })
  })

  describe('save', () => {
    it('should send _model in the document body to Elasticsearch', async () => {
      const testId = id()
      mockedSearch.searchRequest.mockResolvedValue({
        _id: testId,
        _version: 1,
      })

      const user = new User({ id: testId, name: 'Alice' })
      await user.save()

      const sentDoc = mockedSearch.searchRequest.mock.calls[0][2]
      expect(sentDoc._model).toBe('User')
    })

    it('should send correct _model for each model class', async () => {
      const testId = id()
      mockedSearch.searchRequest.mockResolvedValue({
        _id: testId,
        _version: 1,
      })

      const order = new Order({ id: testId, total: 50 })
      await order.save()

      const sentDoc = mockedSearch.searchRequest.mock.calls[0][2]
      expect(sentDoc._model).toBe('Order')
    })
  })

  describe('generateMapping', () => {
    it('should include _model as a keyword field', () => {
      const mapping = SearchModel.generateMapping.call(User as any)
      expect(mapping.mappings.properties._model).toEqual({ type: 'keyword' })
    })
  })

  describe('constructor', () => {
    it('should ignore _model in incoming data', () => {
      const user = new User({
        name: 'Alice',
        _model: 'SomeOtherThing',
      } as any)

      expect(user.name).toBe('Alice')
      expect((user as any)._model).toBeUndefined()
    })

    it('should still produce correct _model in toSearch after loading from ES data', () => {
      const testId = id()
      const user = new User({
        id: testId,
        name: 'Alice',
        version: 1,
        _model: 'User',
      } as any)

      const doc = user.toSearch()
      expect(doc._model).toBe('User')
    })
  })
})
