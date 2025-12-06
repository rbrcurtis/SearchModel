import 'reflect-metadata'
import { Mocked } from 'vitest'
import { SearchModel } from '../SearchModel'
import { StringType, NumberType, DateType, BooleanType } from '../../decorators'
import { search, SearchError, VersionConflictError } from '../SearchService'
import { id } from '../../utils/id'

// Mock the SearchService module
vi.mock('../SearchService', async () => {
  const actual = await vi.importActual('../SearchService')
  return {
    ...actual,
    search: {
      searchRequest: vi.fn(),
      query: vi.fn(),
      getById: vi.fn()
    }
  }
})

// Type the mocked search for TypeScript
const mockedSearch = search as Mocked<typeof search>

// Test model class
class TestModel extends SearchModel<TestModel> {
  static readonly indexName = 'test-index'
  
  @StringType({ required: true })
  name!: string
  
  @NumberType()
  score!: number
  
  @DateType()
  birthDate!: Date
  
  @BooleanType()
  isActive!: boolean
}

// Test model with lifecycle hooks
class ModelWithHooks extends SearchModel<ModelWithHooks> {
  static readonly indexName = 'hooks-index'
  
  @StringType()
  name!: string
  
  beforeSaveCalled = false
  afterSaveCalled = false
  beforeDeleteCalled = false
  afterDeleteCalled = false
  
  protected async beforeSave(event: any): Promise<boolean> {
    this.beforeSaveCalled = true
    return true
  }
  
  protected async afterSave(event: any): Promise<void> {
    this.afterSaveCalled = true
  }
  
  protected async beforeDelete(event: any): Promise<void> {
    this.beforeDeleteCalled = true
  }
  
  protected async afterDelete(event: any): Promise<void> {
    this.afterDeleteCalled = true
  }
}

describe('SearchModel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock functions for each test
    mockedSearch.searchRequest.mockReset()
    mockedSearch.query.mockReset()
    mockedSearch.getById.mockReset()
  })

  describe('constructor', () => {
    it('should not apply defaults in constructor (applied during save)', () => {
      const model = new TestModel()
      // Defaults are not applied in constructor - they're applied during save
      expect(model.id).toBeUndefined()
      expect(model.createdAt).toBeUndefined()
      expect(model.updatedAt).toBeUndefined()
      expect(model.version).toBeUndefined()
    })

    it('should initialize with provided values', () => {
      const testId = id()
      const data = {
        id: testId,
        name: 'Test Name',
        score: 100,
        birthDate: new Date('1990-01-01'),
        isActive: true,
        version: 2
      }
      
      const model = new TestModel(data)
      expect(model.id).toBe(testId)
      expect(model.name).toBe('Test Name')
      expect(model.score).toBe(100)
      expect(model.birthDate).toEqual(new Date('1990-01-01'))
      expect(model.isActive).toBe(true)
      expect(model.version).toBe(2)
    })

    it('should parse date strings', () => {
      const dateString = '2023-01-01T00:00:00.000Z'
      const model = new TestModel({
        createdAt: dateString as any,
        updatedAt: dateString as any
      })

      expect(model.createdAt).toBeInstanceOf(Date)
      expect(model.updatedAt).toBeInstanceOf(Date)
    })

    it('should parse custom DateType field strings from database', () => {
      // Simulate loading a document from Elasticsearch where dates are ISO strings
      const dateString = '1990-06-15T10:30:00.000Z'
      const model = new TestModel({
        id: id(),
        name: 'Test User',
        birthDate: dateString as any, // This should be converted to Date automatically
        version: 1
      })

      expect(model.birthDate).toBeInstanceOf(Date)
      expect(model.birthDate.toISOString()).toBe(dateString)
    })

    it('should parse all date fields from database response', () => {
      // Simulate a full document from Elasticsearch
      const createdAtString = '2023-01-01T00:00:00.000Z'
      const updatedAtString = '2023-06-01T12:00:00.000Z'
      const birthDateString = '1985-03-20T08:15:00.000Z'

      const model = new TestModel({
        id: id(),
        name: 'Test User',
        createdAt: createdAtString as any,
        updatedAt: updatedAtString as any,
        birthDate: birthDateString as any,
        version: 5
      })

      // All date fields should be converted to Date objects
      expect(model.createdAt).toBeInstanceOf(Date)
      expect(model.updatedAt).toBeInstanceOf(Date)
      expect(model.birthDate).toBeInstanceOf(Date)

      // Verify the values match
      expect(model.createdAt.toISOString()).toBe(createdAtString)
      expect(model.updatedAt.toISOString()).toBe(updatedAtString)
      expect(model.birthDate.toISOString()).toBe(birthDateString)
    })
  })

  describe('fromJSON', () => {
    it('should create instance from JSON data', () => {
      const testId = id()
      const data = {
        id: testId,
        name: 'Test',
        score: 50
      }
      
      const model = TestModel.fromJSON(data)
      expect(model).toBeInstanceOf(TestModel)
      expect(model.id).toBe(testId)
      expect(model.name).toBe('Test')
      expect(model.score).toBe(50)
    })

    it('should return existing instance if passed', () => {
      const existing = new TestModel({ name: 'Existing' })
      const result = TestModel.fromJSON(existing)
      expect(result).toBe(existing)
    })
  })

  describe('generateMapping', () => {
    it('should generate correct Elasticsearch mapping', () => {
      const mapping = SearchModel.generateMapping.call(TestModel as any)
      
      expect(mapping).toHaveProperty('mappings')
      expect(mapping.mappings).toHaveProperty('properties')
      
      const properties = mapping.mappings.properties
      expect(properties.id).toEqual({ type: 'keyword', fields: { keyword: { type: 'keyword' } } })
      expect(properties.name).toEqual({ 
        type: 'text', 
        fields: { keyword: { type: 'keyword' } } 
      })
      expect(properties.score).toEqual({ type: 'double' })
      expect(properties.birthDate).toEqual({ type: 'date' })
      expect(properties.isActive).toEqual({ type: 'boolean' })
    })
  })

  describe('getElasticsearchFieldType', () => {
    it('should convert string type correctly', () => {
      const result = SearchModel.getElasticsearchFieldType({
        propertyKey: 'test',
        type: 'string',
        options: {}
      })
      expect(result).toEqual({ 
        type: 'text', 
        fields: { keyword: { type: 'keyword' } } 
      })
    })

    it('should convert keyword type correctly', () => {
      const result = SearchModel.getElasticsearchFieldType({
        propertyKey: 'test',
        type: 'keyword',
        options: {}
      })
      expect(result).toEqual({ type: 'keyword', fields: { keyword: { type: 'keyword' } } })
    })

    it('should convert number type correctly', () => {
      const result = SearchModel.getElasticsearchFieldType({
        propertyKey: 'test',
        type: 'number',
        options: {}
      })
      expect(result).toEqual({ type: 'double' })
    })

    it('should convert date type correctly', () => {
      const result = SearchModel.getElasticsearchFieldType({
        propertyKey: 'test',
        type: 'date',
        options: {}
      })
      expect(result).toEqual({ type: 'date' })
    })
  })

  describe('createIndex', () => {
    it('should create index with correct mapping', async () => {
      mockedSearch.searchRequest.mockResolvedValue({})
      
      await SearchModel.createIndex.call(TestModel as any)
      
      expect(search.searchRequest).toHaveBeenCalledWith(
        'PUT',
        '/test-index',
        expect.objectContaining({
          settings: expect.any(Object),
          mappings: expect.any(Object)
        })
      )
    })

    it('should handle existing index gracefully', async () => {
      const error = new SearchError('resource_already_exists_exception')
      error.response = 'Index already exists: resource_already_exists_exception'
      mockedSearch.searchRequest.mockRejectedValue(error)
      
      // createIndex should not throw when index already exists - it catches this specific error
      await SearchModel.createIndex.call(TestModel as any)
      expect(search.searchRequest).toHaveBeenCalled()
    })

    it('should throw error when indexName is not defined', async () => {
      class NoIndexModel extends SearchModel<NoIndexModel> {
        // No indexName defined
      }

      await expect(SearchModel.createIndex.call(NoIndexModel as any))
        .rejects.toThrow('IndexName not defined for NoIndexModel')
    })
  })

  describe('save', () => {
    it('should save new document', async () => {
      const testId = id()
      mockedSearch.searchRequest.mockResolvedValue({
        _id: testId,
        _version: 1
      })
      
      const model = new TestModel({ id: testId, name: 'Test' })
      const result = await model.save()
      
      expect(search.searchRequest).toHaveBeenCalledWith(
        'PUT',
        `/test-index/_doc/${testId}?refresh=wait_for`,
        expect.objectContaining({
          id: testId,
          name: 'Test'
        })
      )
      expect(result).toBe(model)
    })

    it('should update existing document', async () => {
      const testId = id()
      mockedSearch.searchRequest.mockResolvedValue({
        _id: testId,
        _version: 2
      })
      
      const model = new TestModel({ 
        id: testId, 
        name: 'Test',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      
      await model.save()
      
      expect(search.searchRequest).toHaveBeenCalled()
      expect(model.version).toBe(2)
    })

    it('should handle version conflicts', async () => {
      const testId = id()
      const versionError = new VersionConflictError(
        'Version conflict',
        2,
        1
      )
      mockedSearch.searchRequest.mockRejectedValue(versionError)
      
      const model = new TestModel({ 
        id: testId,
        name: 'Test',
        version: 1
      })
      
      await expect(model.save()).rejects.toThrow(/Version conflict/)
    })

    it('should call lifecycle hooks', async () => {
      const testId = id()
      mockedSearch.searchRequest.mockResolvedValue({
        _id: testId,
        _version: 1
      })
      
      const model = new ModelWithHooks({ id: testId, name: 'Test' })
      
      expect(model.beforeSaveCalled).toBe(false)
      expect(model.afterSaveCalled).toBe(false)
      
      await model.save()
      
      expect(model.beforeSaveCalled).toBe(true)
      expect(model.afterSaveCalled).toBe(true)
    })

    it('should respect wait option', async () => {
      const testId = id()
      mockedSearch.searchRequest.mockResolvedValue({
        _id: testId,
        _version: 1
      })
      
      const model = new TestModel({ id: testId, name: 'Test' })
      
      // Test with wait: false
      await model.save({ wait: false })
      expect(search.searchRequest).toHaveBeenCalledWith(
        'PUT',
        `/test-index/_doc/${testId}`,
        expect.any(Object)
      )
      
      mockedSearch.searchRequest.mockClear()
      
      // Test with wait: true (default)
      await model.save()
      expect(search.searchRequest).toHaveBeenCalledWith(
        'PUT',
        `/test-index/_doc/${testId}?refresh=wait_for`,
        expect.any(Object)
      )
    })
  })

  describe('delete', () => {
    it('should delete document', async () => {
      const testId = id()
      mockedSearch.searchRequest.mockResolvedValue({})
      
      const model = new TestModel({ id: testId, name: 'Test' })
      await model.delete()
      
      expect(search.searchRequest).toHaveBeenCalledWith(
        'DELETE',
        `/test-index/_doc/${testId}`
      )
    })

    it('should throw error when id is missing', async () => {
      const model = new TestModel()
      model.id = undefined as any
      
      await expect(model.delete()).rejects.toThrow('Cannot delete document without ID')
    })

    it('should throw error when indexName is not defined', async () => {
      class NoIndexModel extends SearchModel<NoIndexModel> {
        // No indexName defined
      }

      const model = new NoIndexModel({ id: id() })
      await expect(model.delete()).rejects.toThrow('IndexName not defined')
    })

    it('should call lifecycle hooks', async () => {
      const testId = id()
      mockedSearch.searchRequest.mockResolvedValue({})
      
      const model = new ModelWithHooks({ id: testId, name: 'Test' })
      
      expect(model.beforeDeleteCalled).toBe(false)
      expect(model.afterDeleteCalled).toBe(false)
      
      await model.delete()
      
      expect(model.beforeDeleteCalled).toBe(true)
      expect(model.afterDeleteCalled).toBe(true)
    })
  })

  describe('static methods', () => {
    describe('create', () => {
      it('should create and save new document', async () => {
        const testId = id()
        mockedSearch.searchRequest.mockResolvedValue({
          _id: testId,
          _version: 1
        })
        
        const result = await TestModel.create({ id: testId, name: 'New' })
        
        expect(result).toBeInstanceOf(TestModel)
        expect(result.name).toBe('New')
        expect(search.searchRequest).toHaveBeenCalled()
      })

      it('should pass options to save', async () => {
        const testId = id()
        mockedSearch.searchRequest.mockResolvedValue({
          _id: testId,
          _version: 1
        })
        
        await TestModel.create({ id: testId, name: 'New' }, { wait: false })
        
        expect(search.searchRequest).toHaveBeenCalledWith(
          'PUT',
          expect.stringMatching(/^\/test-index\/_doc\/[^?]+$/),
          expect.any(Object)
        )
      })
    })
    
    describe('find', () => {
      it('should find documents', async () => {
        mockedSearch.query.mockResolvedValue({
          hits: [
            { id: id(), name: 'Result 1' },
            { id: id(), name: 'Result 2' }
          ],
          total: 2
        })
        
        const results = await TestModel.find(['name:Test'])
        
        expect(search.query).toHaveBeenCalledWith(
          'test-index',
          ['name:Test'],
          {}
        )
        expect(results).toHaveLength(2)
        expect(results[0]).toBeInstanceOf(TestModel)
      })
      
      it('should pass options to query', async () => {
        mockedSearch.query.mockResolvedValue({
          hits: [],
          total: 0
        })
        
        await TestModel.find(['test'], { limit: 10, sort: 'name:desc' })
        
        expect(search.query).toHaveBeenCalledWith(
          'test-index',
          ['test'],
          { limit: 10, sort: 'name:desc' }
        )
      })
    })
    
    describe('findWithTotal', () => {
      it('should return hits and total', async () => {
        const hits = [
          { id: id(), name: 'Result 1' },
          { id: id(), name: 'Result 2' }
        ]
        mockedSearch.query.mockResolvedValue({ hits, total: 42 })
        
        const result = await TestModel.findWithTotal(['test'])
        
        expect(result.hits).toEqual(hits)
        expect(result.total).toBe(42)
      })
    })
    
    describe('findOne', () => {
      it('should find first matching document', async () => {
        const testDoc = { id: id(), name: 'First' }
        vi.spyOn(TestModel, 'find').mockResolvedValue([
          new TestModel(testDoc)
        ])
        
        const result = await TestModel.findOne(['name:First'])
        
        expect(result).toBeInstanceOf(TestModel)
        expect(result?.name).toBe('First')
      })
      
      it('should return null when no documents found', async () => {
        vi.spyOn(TestModel, 'find').mockResolvedValue([])
        
        const result = await TestModel.findOne(['name:NotFound'])
        
        expect(result).toBeNull()
      })
    })
    
    describe('getById', () => {
      it('should get document by ID', async () => {
        const testId = id()
        mockedSearch.getById.mockResolvedValue(
          new TestModel({ id: testId, name: 'Test' })
        )
        
        const result = await TestModel.getById(testId)
        
        expect(search.getById).toHaveBeenCalledWith(TestModel, testId)
        expect(result).toBeInstanceOf(TestModel)
      })
      
      it('should return null when document not found', async () => {
        const nonExistentId = id()
        mockedSearch.getById.mockResolvedValue(null)
        
        const result = await TestModel.getById(nonExistentId)
        
        expect(result).toBeNull()
      })
    })
  })

  describe('change tracking', () => {
    it('should track field changes', () => {
      const model = new TestModel()
      model['markFieldChanged']('name')
      model['markFieldChanged']('score')
      
      const changed = model['getChangedFields']()
      expect(changed).toContain('name')
      expect(changed).toContain('score')
    })

    it('should clear changed fields after save', async () => {
      const testId = id()
      mockedSearch.searchRequest.mockResolvedValue({
        _id: testId,
        _version: 1
      })
      
      const model = new TestModel({ id: testId, name: 'Test' })
      model['markFieldChanged']('name')
      
      expect(model['getChangedFields']()).toContain('name')
      
      await model.save()
      
      expect(model['getChangedFields']()).toHaveLength(0)
    })
  })

  describe('toJSON', () => {
    it('should convert model to plain object', () => {
      const testId = id()
      const model = new TestModel({
        id: testId,
        name: 'Test',
        score: 100,
        isActive: true
      })
      
      const json = model.toJSON()
      
      expect(json).toEqual(expect.objectContaining({
        id: testId,
        name: 'Test',
        score: 100,
        isActive: true
      }))
    })
  })

  describe('toSearch', () => {
    it('should generate Elasticsearch document', () => {
      const testId = id()
      const model = new TestModel({
        id: testId,
        name: 'Test',
        score: 100
      })
      
      const doc = model.toSearch()
      
      expect(doc).toHaveProperty('id', testId)
      expect(doc).toHaveProperty('name', 'Test')
      expect(doc).toHaveProperty('score', 100)
    })
  })

  describe('toString', () => {
    it('should return JSON string representation', () => {
      const model = new TestModel({ name: 'Test' })
      const str = model.toString()
      
      expect(typeof str).toBe('string')
      const parsed = JSON.parse(str)
      expect(parsed).toHaveProperty('name', 'Test')
    })
  })
})