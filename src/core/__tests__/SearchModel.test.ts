import 'reflect-metadata'
import { SearchModel } from '../SearchModel'
import { StringType, NumberType, DateType, BooleanType } from '../../decorators'
import * as SearchService from '../SearchService'
import { id } from '../../utils/id'

// Mock the SearchService
jest.mock('../SearchService')

// Test model class
class TestModel extends SearchModel {
  static readonly indexName = 'test-index'

  @StringType({ required: true })
  name!: string

  @NumberType()
  age?: number

  @BooleanType()
  active?: boolean
}

describe('SearchModel', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('constructor', () => {
    it('should create instance with provided data', () => {
      const testId = id()
      const data = {
        id: testId,
        name: 'Test Name',
        age: 25,
        active: true,
        version: 2
      }
      const model = new TestModel(data)
      expect(model.id).toBe(testId)
      expect(model.name).toBe('Test Name')
      expect(model.age).toBe(25)
      expect(model.active).toBe(true)
      expect(model.version).toBe(2)
    })

    it('should parse date strings', () => {
      const dateStr = '2024-01-01T00:00:00.000Z'
      const model = new TestModel({
        createdAt: dateStr,
        updatedAt: dateStr
      })
      expect(model.createdAt).toBeInstanceOf(Date)
      expect(model.updatedAt).toBeInstanceOf(Date)
      expect(model.createdAt.toISOString()).toBe(dateStr)
    })
  })

  describe('fromJSON', () => {
    it('should create instance from JSON data', () => {
      const jsonId = id()
      const data = {
        id: jsonId,
        name: 'JSON Test',
        age: 30
      }
      const model = TestModel.fromJSON(data)
      expect(model).toBeInstanceOf(TestModel)
      expect(model.id).toBe(jsonId)
      expect(model.name).toBe('JSON Test')
      expect(model.age).toBe(30)
    })

    it('should return the same instance when passed an instance', () => {
      const testId = id()
      const originalInstance = new TestModel({
        id: testId,
        name: 'Original Instance',
        age: 25
      })
      
      const result = TestModel.fromJSON(originalInstance)
      
      // Should be the exact same instance, not a copy
      expect(result).toBe(originalInstance)
      expect(result.id).toBe(testId)
      expect(result.name).toBe('Original Instance')
      expect(result.age).toBe(25)
    })
  })

  describe('generateMapping', () => {
    it('should generate Elasticsearch mapping from decorators', () => {
      const mapping = SearchModel.generateMapping.call(TestModel as any)
      
      expect(mapping).toHaveProperty('mappings')
      expect(mapping.mappings).toHaveProperty('properties')
      
      const props = mapping.mappings.properties
      expect(props.name).toEqual({ type: 'text', fields: { keyword: { type: 'keyword' } } })
      expect(props.age).toEqual({ type: 'double' })
      expect(props.active).toEqual({ type: 'boolean' })
      expect(props.createdAt).toEqual({ type: 'date' })
      expect(props.updatedAt).toEqual({ type: 'date' })
    })

    it('should convert fields ending with "id" to keyword type', () => {
      class ModelWithIds extends SearchModel {
        static readonly indexName = 'test-ids'
        
        @StringType()
        userId!: string
        
        @StringType()
        productIds!: string
      }
      
      const mapping = SearchModel.generateMapping.call(ModelWithIds as any)
      const props = mapping.mappings.properties
      
      expect(props.userId).toEqual({ type: 'keyword' })
      expect(props.productIds).toEqual({ type: 'keyword' })
    })
  })

  describe('getElasticsearchFieldType', () => {
    it('should return correct mapping for string type', () => {
      const result = SearchModel.getElasticsearchFieldType({
        propertyKey: 'test',
        type: 'string',
        options: {}
      })
      expect(result).toEqual({ type: 'text', fields: { keyword: { type: 'keyword' } } })
    })

    it('should return correct mapping for keyword type', () => {
      const result = SearchModel.getElasticsearchFieldType({
        propertyKey: 'test',
        type: 'keyword',
        options: {}
      })
      expect(result).toEqual({ type: 'keyword' })
    })

    it('should return correct mapping for number type', () => {
      const result = SearchModel.getElasticsearchFieldType({
        propertyKey: 'test',
        type: 'number',
        options: {}
      })
      expect(result).toEqual({ type: 'double' })
    })

    it('should return correct mapping for date type', () => {
      const result = SearchModel.getElasticsearchFieldType({
        propertyKey: 'test',
        type: 'date',
        options: {}
      })
      expect(result).toEqual({ type: 'date' })
    })

    it('should return correct mapping for boolean type', () => {
      const result = SearchModel.getElasticsearchFieldType({
        propertyKey: 'test',
        type: 'boolean',
        options: {}
      })
      expect(result).toEqual({ type: 'boolean' })
    })

    it('should return correct mapping for object with properties', () => {
      const result = SearchModel.getElasticsearchFieldType({
        propertyKey: 'test',
        type: 'object',
        options: {
          properties: {
            name: { type: 'string' },
            age: { type: 'number' }
          }
        }
      })
      expect(result).toHaveProperty('type', 'object')
      expect(result).toHaveProperty('properties')
    })

    it('should return correct mapping for objectArray with properties', () => {
      const result = SearchModel.getElasticsearchFieldType({
        propertyKey: 'test',
        type: 'objectArray',
        options: {
          properties: {
            name: { type: 'string' }
          }
        }
      })
      expect(result).toHaveProperty('type', 'nested')
      expect(result).toHaveProperty('properties')
    })
  })

  describe('createIndex', () => {
    it('should create index with correct mapping', async () => {
      const mockSearchRequest = jest.spyOn(SearchService.search, 'searchRequest').mockResolvedValue({})
      
      await SearchModel.createIndex.call(TestModel as any)
      
      expect(mockSearchRequest).toHaveBeenCalledWith(
        'PUT',
        '/test-index',
        expect.objectContaining({
          settings: expect.any(Object),
          mappings: expect.any(Object)
        })
      )
    })

    it('should handle existing index gracefully', async () => {
      const error = new SearchService.SearchError('resource_already_exists_exception')
      error.response = 'Index already exists: resource_already_exists_exception'
      jest.spyOn(SearchService.search, 'searchRequest').mockRejectedValue(error)
      
      // createIndex should not throw when index already exists - it catches this specific error
      await SearchModel.createIndex.call(TestModel as any)
      expect(jest.spyOn(SearchService.search, 'searchRequest')).toHaveBeenCalled()
    })

    it('should throw error when indexName is not defined', async () => {
      class NoIndexModel extends SearchModel {
        // No indexName defined
      }
      
      await expect(SearchModel.createIndex.call(NoIndexModel as any)).rejects.toThrow('IndexName not defined')
    })
  })

  describe('save', () => {
    it('should save new document', async () => {
      const testId = id()
      const mockSearchRequest = jest.spyOn(SearchService.search, 'searchRequest').mockResolvedValue({
        _id: testId,
        _version: 1
      })
      
      const model = new TestModel({ name: 'Test' })
      await model.save()
      
      expect(mockSearchRequest).toHaveBeenCalledWith(
        'PUT',
        expect.stringContaining('/test-index/_doc/'),
        expect.objectContaining({
          name: 'Test',
          version: 1
        })
      )
      expect(model.version).toBe(1)
    })

    it('should update existing document', async () => {
      const testId = id()
      const mockSearchRequest = jest.spyOn(SearchService.search, 'searchRequest').mockResolvedValue({
        _id: testId,
        _version: 2
      })
      
      const model = new TestModel({ 
        id: testId,
        name: 'Test',
        version: 1
      })
      model.name = 'Updated'
      await model.save()
      
      expect(model.version).toBe(2)
    })

    it('should handle version conflicts', async () => {
      const testId = id()
      const versionError = new SearchService.VersionConflictError(
        'Version conflict',
        2,
        1
      )
      jest.spyOn(SearchService.search, 'searchRequest').mockRejectedValue(versionError)
      
      const model = new TestModel({ 
        id: testId,
        name: 'Test',
        version: 1
      })
      
      await expect(model.save()).rejects.toThrow(/Version conflict/)
    })

    it('should call lifecycle hooks', async () => {
      const testId = id()
      jest.spyOn(SearchService.search, 'searchRequest').mockResolvedValue({
        _id: testId,
        _version: 1
      })
      
      const model = new TestModel({ name: 'Test' })
      const beforeSaveSpy = jest.spyOn(model, 'beforeSave' as any)
      const afterSaveSpy = jest.spyOn(model, 'afterSave' as any)
      
      await model.save()
      
      expect(beforeSaveSpy).toHaveBeenCalled()
      expect(afterSaveSpy).toHaveBeenCalled()
    })

    it('should validate required fields', async () => {
      const model = new TestModel({ id: id() })
      // name is required but not set
      model.name = undefined as any
      
      await expect(model.save()).rejects.toThrow("Required field 'name' is missing")
    })
  })

  describe('delete', () => {
    it('should delete document', async () => {
      const testId = id()
      const mockSearchRequest = jest.spyOn(SearchService.search, 'searchRequest').mockResolvedValue({})
      
      const model = new TestModel({ id: testId, name: 'Test' })
      await model.delete()
      
      expect(mockSearchRequest).toHaveBeenCalledWith(
        'DELETE',
        `/test-index/_doc/${testId}`
      )
    })

    it('should throw error when deleting without ID', async () => {
      const model = new TestModel({ name: 'Test' })
      // Force the id to be undefined to test the error case
      Object.defineProperty(model, 'id', {
        value: undefined,
        writable: true,
        configurable: true
      })
      
      await expect(model.delete()).rejects.toThrow('Cannot delete document without ID')
    })

    it('should call lifecycle hooks', async () => {
      const testId = id()
      jest.spyOn(SearchService.search, 'searchRequest').mockResolvedValue({})
      
      const model = new TestModel({ id: testId, name: 'Test' })
      const beforeDeleteSpy = jest.spyOn(model, 'beforeDelete' as any)
      const afterDeleteSpy = jest.spyOn(model, 'afterDelete' as any)
      
      await model.delete()
      
      expect(beforeDeleteSpy).toHaveBeenCalled()
      expect(afterDeleteSpy).toHaveBeenCalled()
    })
  })

  describe('static methods', () => {
    describe('create', () => {
      it('should create and save new instance', async () => {
        const newId = id()
        jest.spyOn(SearchService.search, 'searchRequest').mockResolvedValue({
          _id: newId,
          _version: 1
        })
        
        const model = await TestModel.create({ name: 'New Model' })
        
        expect(model).toBeInstanceOf(TestModel)
        expect(model.name).toBe('New Model')
        expect(model.version).toBe(1)
      })
    })

    describe('find', () => {
      it('should find documents', async () => {
        const id1 = id()
        const id2 = id()
        const mockQuery = jest.spyOn(SearchService.search, 'query').mockResolvedValue({
          hits: [
            { id: id1, name: 'Test 1' },
            { id: id2, name: 'Test 2' }
          ],
          total: 2
        })
        
        const results = await TestModel.find(['test'])
        
        expect(mockQuery).toHaveBeenCalledWith('test-index', ['test'], {})
        expect(results).toHaveLength(2)
        expect(results[0]).toBeInstanceOf(TestModel)
      })

      it('should handle search options', async () => {
        const mockQuery = jest.spyOn(SearchService.search, 'query').mockResolvedValue({
          hits: [],
          total: 0
        })
        
        await TestModel.find(['test'], { limit: 10, sort: 'name:desc', page: 2 })
        
        expect(mockQuery).toHaveBeenCalledWith(
          'test-index',
          ['test'],
          { limit: 10, sort: 'name:desc', page: 2 }
        )
      })
    })

    describe('findOne', () => {
      it('should return first matching document', async () => {
        const testId = id()
        jest.spyOn(TestModel, 'find').mockResolvedValue([
          new TestModel({ id: testId, name: 'Test' })
        ])
        
        const result = await TestModel.findOne(['test'])
        
        expect(result).toBeInstanceOf(TestModel)
        expect(result?.id).toBe(testId)
      })

      it('should return null when no match found', async () => {
        jest.spyOn(TestModel, 'find').mockResolvedValue([])
        
        const result = await TestModel.findOne(['test'])
        
        expect(result).toBeNull()
      })
    })

    describe('getById', () => {
      it('should get document by ID', async () => {
        const testId = id()
        const mockGetById = jest.spyOn(SearchService.search, 'getById').mockResolvedValue(
          new TestModel({ id: testId, name: 'Test' })
        )
        
        const result = await TestModel.getById(testId)
        
        expect(mockGetById).toHaveBeenCalledWith(TestModel, testId)
        expect(result).toBeInstanceOf(TestModel)
      })

      it('should return null when document not found', async () => {
        const nonExistentId = id()
        jest.spyOn(SearchService.search, 'getById').mockResolvedValue(null)
        
        const result = await TestModel.getById(nonExistentId)
        
        expect(result).toBeNull()
      })
    })
  })

  describe('change tracking', () => {
    it('should track field changes', () => {
      const model = new TestModel({ name: 'Initial' });
      
      // Use protected method through any cast
      (model as any).markFieldChanged('name');
      const changed = (model as any).getChangedFields()
      
      expect(changed).toContain('name')
    })

    it('should clear changed fields after save', async () => {
      const testId = id()
      jest.spyOn(SearchService.search, 'searchRequest').mockResolvedValue({
        _id: testId,
        _version: 1
      })
      
      const model = new TestModel({ name: 'Test' });
      (model as any).markFieldChanged('name')
      
      await model.save()
      
      const changed = (model as any).getChangedFields()
      expect(changed).toHaveLength(0)
    })
  })

  describe('toSearch', () => {
    it('should transform fields correctly', () => {
      const now = new Date()
      const testId = id()
      const model = new TestModel({
        id: testId,
        name: 'Test',
        age: 25,
        active: true,
        createdAt: now,
        updatedAt: now,
        version: 1
      })
      
      const doc = model.toSearch()
      
      expect(doc.name).toBe('Test')
      expect(doc.age).toBe(25)
      expect(doc.active).toBe(true)
      expect(doc.createdAt).toBe(now.toISOString())
    })

    it('should apply field transformations', () => {
      class TransformModel extends SearchModel {
        static readonly indexName = 'transform-test'
        
        @StringType({ upperCase: true })
        upperField!: string
        
        @StringType({ lowerCase: true })
        lowerField!: string
        
        @StringType({ trim: true })
        trimField!: string
      }
      
      const model = new TransformModel({
        id: id(),
        upperField: 'test',
        lowerField: 'TEST',
        trimField: '  trimmed  ',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1
      })
      
      const doc = model.toSearch()
      
      expect(doc.upperField).toBe('TEST')
      expect(doc.lowerField).toBe('test')
      expect(doc.trimField).toBe('trimmed')
    })
  })
})