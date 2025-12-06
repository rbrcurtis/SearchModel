import 'reflect-metadata'
import { SearchModel } from '../SearchModel'
import {
  StringType,
  NumberType,
  DateType,
  BooleanType,
  StringArrayType,
  ObjectType,
  ObjectArrayType,
  KeywordType,
  StringMapType
} from '../../decorators'
import { id } from '../../utils/id'
import { search } from '../SearchService'

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

// Test model with defaults for all field types
class TestModelWithDefaults extends SearchModel<TestModelWithDefaults> {
  static readonly indexName = 'test-defaults-index'
  
  @StringType({ default: () => 'default-string' })
  stringField!: string
  
  @NumberType({ default: () => 42 })
  numberField!: number
  
  @DateType({ default: () => new Date('2023-01-01') })
  dateField!: Date
  
  @BooleanType({ default: () => true })
  booleanField!: boolean
  
  @StringArrayType({ default: () => ['item1', 'item2'] })
  stringArrayField!: string[]
  
  @KeywordType({ default: () => 'default-keyword' })
  keywordField!: string
  
  @StringMapType({ default: () => ({ key1: 'value1', key2: 'value2' }) })
  stringMapField!: Record<string, string>
  
  @ObjectType({ 
    properties: {
      nested: { type: 'string' }
    },
    default: () => ({ nested: 'default-nested' })
  })
  objectField!: { nested: string }
  
  @ObjectArrayType({ 
    properties: {
      item: { type: 'string' }
    },
    default: () => [{ item: 'default-item1' }, { item: 'default-item2' }]
  })
  objectArrayField!: { item: string }[]
}

// Test model with some fields having defaults and others not
class TestModelPartialDefaults extends SearchModel<TestModelPartialDefaults> {
  static readonly indexName = 'test-partial-defaults-index'
  
  @StringType({ default: () => 'has-default' })
  withDefault!: string
  
  @StringType()
  withoutDefault!: string
  
  @NumberType({ default: () => 100 })
  numberWithDefault!: number
  
  @NumberType()
  numberWithoutDefault!: number
}

// Test model with required fields and defaults
class TestModelRequiredWithDefaults extends SearchModel<TestModelRequiredWithDefaults> {
  static readonly indexName = 'test-required-defaults-index'
  
  @StringType({ required: true, default: () => 'required-default' })
  requiredWithDefault!: string
  
  @StringType({ required: true })
  requiredWithoutDefault!: string
}

describe('SearchModel Defaults', () => {
  describe('Constructor Behavior (No Defaults)', () => {
    it('should NOT apply defaults in constructor - defaults applied during save', () => {
      const model = new TestModelWithDefaults()

      // Defaults are NOT applied in constructor
      expect(model.stringField).toBeUndefined()
      expect(model.numberField).toBeUndefined()
      expect(model.dateField).toBeUndefined()
      expect(model.booleanField).toBeUndefined()
      expect(model.stringArrayField).toBeUndefined()
      expect(model.keywordField).toBeUndefined()
      expect(model.stringMapField).toBeUndefined()
      expect(model.objectField).toBeUndefined()
      expect(model.objectArrayField).toBeUndefined()
    })

    it('should preserve provided values in constructor', () => {
      const model = new TestModelWithDefaults({
        stringField: 'custom-value',
        numberField: 999,
        booleanField: false
      })

      expect(model.stringField).toBe('custom-value')
      expect(model.numberField).toBe(999)
      expect(model.booleanField).toBe(false)
      // Other fields remain undefined (no defaults in constructor)
      expect(model.dateField).toBeUndefined()
      expect(model.keywordField).toBeUndefined()
    })

    it('should preserve null values in constructor', () => {
      const model = new TestModelWithDefaults({
        stringField: null as any,
        numberField: null as any
      })

      expect(model.stringField).toBeNull()
      expect(model.numberField).toBeNull()
      // Other fields remain undefined
      expect(model.booleanField).toBeUndefined()
    })

    it('should not override falsy values with defaults', () => {
      const model = new TestModelWithDefaults({
        stringField: '',
        numberField: 0,
        booleanField: false,
        stringArrayField: []
      })

      expect(model.stringField).toBe('')
      expect(model.numberField).toBe(0)
      expect(model.booleanField).toBe(false)
      expect([...model.stringArrayField]).toEqual([])
    })

    it('should leave fields undefined when no values provided', () => {
      const model = new TestModelPartialDefaults()

      // All fields undefined - no defaults applied in constructor
      expect(model.withDefault).toBeUndefined()
      expect(model.numberWithDefault).toBeUndefined()
      expect(model.withoutDefault).toBeUndefined()
      expect(model.numberWithoutDefault).toBeUndefined()
    })

    it('should preserve provided values without applying other defaults', () => {
      const model = new TestModelRequiredWithDefaults({
        requiredWithoutDefault: 'provided-value'
      })

      // Only provided value is set, default not applied in constructor
      expect(model.requiredWithDefault).toBeUndefined()
      expect(model.requiredWithoutDefault).toBe('provided-value')
    })
  })
  
  describe('fromJSON Behavior (No Defaults)', () => {
    it('should NOT apply defaults when loading from JSON', () => {
      const model = TestModelWithDefaults.fromJSON({})

      // Defaults are NOT applied in fromJSON
      expect(model.stringField).toBeUndefined()
      expect(model.numberField).toBeUndefined()
      expect(model.dateField).toBeUndefined()
      expect(model.booleanField).toBeUndefined()
      expect(model.stringArrayField).toBeUndefined()
      expect(model.keywordField).toBeUndefined()
      expect(model.stringMapField).toBeUndefined()
      expect(model.objectField).toBeUndefined()
      expect(model.objectArrayField).toBeUndefined()
    })

    it('should preserve provided values without applying defaults to missing fields', () => {
      const model = TestModelWithDefaults.fromJSON({
        id: id(),
        version: 2,
        stringField: 'from-database'
      })

      expect(model.stringField).toBe('from-database')
      // Missing fields remain undefined - no defaults applied
      expect(model.numberField).toBeUndefined()
      expect(model.booleanField).toBeUndefined()
      expect(model.keywordField).toBeUndefined()
    })

    it('should preserve null values from database', () => {
      const model = TestModelWithDefaults.fromJSON({
        id: id(),
        version: 2,
        stringField: null as any,
        numberField: null as any
      })

      expect(model.stringField).toBeNull()
      expect(model.numberField).toBeNull()
      // Other fields remain undefined
      expect(model.booleanField).toBeUndefined()
    })

    it('should handle falsy values from database correctly', () => {
      const model = TestModelWithDefaults.fromJSON({
        id: id(),
        version: 2,
        stringField: '',
        numberField: 0,
        booleanField: false,
        stringArrayField: []
      })

      expect(model.stringField).toBe('')
      expect(model.numberField).toBe(0)
      expect(model.booleanField).toBe(false)
      expect([...model.stringArrayField]).toEqual([])
    })

    it('should load old records without applying defaults to new fields', () => {
      // Simulate an old record that doesn't have the new fields
      const oldRecord = {
        id: id(),
        version: 5,
        createdAt: '2022-01-01T00:00:00.000Z',
        updatedAt: '2022-06-01T00:00:00.000Z',
        // Only has some fields, missing the newer ones
        stringField: 'existing-value'
        // Missing: numberField, booleanField, etc.
      }

      const model = TestModelWithDefaults.fromJSON(oldRecord as any)

      // Existing fields should be preserved
      expect(model.stringField).toBe('existing-value')
      expect(model.version).toBe(5)

      // New fields remain undefined - defaults applied only during save
      expect(model.numberField).toBeUndefined()
      expect(model.booleanField).toBeUndefined()
      expect(model.keywordField).toBeUndefined()
      expect(model.stringArrayField).toBeUndefined()
    })
  })
  
  describe('Constructor Field Independence', () => {
    it('should create independent instances without shared state', () => {
      // Set values explicitly since defaults aren't applied in constructor
      const model1 = new TestModelWithDefaults({
        stringArrayField: ['item1', 'item2'],
        stringMapField: { key1: 'value1', key2: 'value2' },
        objectField: { nested: 'original' },
        objectArrayField: [{ item: 'item1' }]
      })
      const model2 = new TestModelWithDefaults({
        stringArrayField: ['item1', 'item2'],
        stringMapField: { key1: 'value1', key2: 'value2' },
        objectField: { nested: 'original' },
        objectArrayField: [{ item: 'item1' }]
      })

      // Modify arrays and objects in model1
      model1.stringArrayField = [...model1.stringArrayField, 'item3']
      model1.stringMapField = { ...model1.stringMapField, key3: 'value3' }
      model1.objectField = { nested: 'modified' }
      model1.objectArrayField = [...model1.objectArrayField, { item: 'new-item' }]

      // model2 should be unaffected
      expect([...model2.stringArrayField]).toEqual(['item1', 'item2'])
      expect(model2.stringMapField).toEqual({ key1: 'value1', key2: 'value2' })
      expect(model2.objectField).toEqual({ nested: 'original' })
      expect([...model2.objectArrayField]).toEqual([{ item: 'item1' }])
    })
  })
  
  describe('Save Method Defaults', () => {
    it('should apply defaults during save for new documents', async () => {
      // Mock the searchService
      vi.mocked(search.searchRequest).mockResolvedValue({
        _id: 'test-id',
        _version: 1
      } as any)

      // Create a model with only some fields provided
      const model = new TestModelPartialDefaults({
        withoutDefault: 'provided-value'
        // withDefault is not provided, should get default
      })

      await model.save()

      // The default should be applied
      expect(model.withDefault).toBe('has-default')
      expect(model.withoutDefault).toBe('provided-value')

      // Verify that defaults were included in the saved document
      const savedData = vi.mocked(search.searchRequest).mock.calls[0][2]
      expect(savedData.withDefault).toBe('has-default')
      expect(savedData.withoutDefault).toBe('provided-value')
    })
  })
})