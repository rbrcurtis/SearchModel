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

// Test model with defaults for all field types
class TestModelWithDefaults extends SearchModel {
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
class TestModelPartialDefaults extends SearchModel {
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
class TestModelRequiredWithDefaults extends SearchModel {
  static readonly indexName = 'test-required-defaults-index'
  
  @StringType({ required: true, default: () => 'required-default' })
  requiredWithDefault!: string
  
  @StringType({ required: true })
  requiredWithoutDefault!: string
}

describe('SearchModel Defaults', () => {
  describe('Constructor Defaults', () => {
    it('should apply defaults to undefined fields in constructor', () => {
      const model = new TestModelWithDefaults()
      
      expect(model.stringField).toBe('default-string')
      expect(model.numberField).toBe(42)
      expect(model.dateField).toEqual(new Date('2023-01-01'))
      expect(model.booleanField).toBe(true)
      expect(model.stringArrayField).toEqual(['item1', 'item2'])
      expect(model.keywordField).toBe('default-keyword')
      expect(model.stringMapField).toEqual({ key1: 'value1', key2: 'value2' })
      expect(model.objectField).toEqual({ nested: 'default-nested' })
      expect(model.objectArrayField).toEqual([
        { item: 'default-item1' },
        { item: 'default-item2' }
      ])
    })
    
    it('should not override provided values with defaults', () => {
      const model = new TestModelWithDefaults({
        stringField: 'custom-value',
        numberField: 999,
        booleanField: false
      })
      
      expect(model.stringField).toBe('custom-value')
      expect(model.numberField).toBe(999)
      expect(model.booleanField).toBe(false)
      // Other fields should still get defaults
      expect(model.dateField).toEqual(new Date('2023-01-01'))
      expect(model.keywordField).toBe('default-keyword')
    })
    
    it('should not override null values with defaults', () => {
      const model = new TestModelWithDefaults({
        stringField: null,
        numberField: null
      })
      
      expect(model.stringField).toBeNull()
      expect(model.numberField).toBeNull()
      // Other fields should still get defaults
      expect(model.booleanField).toBe(true)
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
      expect(model.stringArrayField).toEqual([])
    })
    
    it('should handle partial defaults correctly', () => {
      const model = new TestModelPartialDefaults()
      
      expect(model.withDefault).toBe('has-default')
      expect(model.numberWithDefault).toBe(100)
      expect(model.withoutDefault).toBeUndefined()
      expect(model.numberWithoutDefault).toBeUndefined()
    })
    
    it('should apply defaults before validation for required fields', () => {
      // Should not throw because default is applied
      const model = new TestModelRequiredWithDefaults({
        requiredWithoutDefault: 'provided-value'
      })
      
      expect(model.requiredWithDefault).toBe('required-default')
      expect(model.requiredWithoutDefault).toBe('provided-value')
    })
  })
  
  describe('fromJSON Defaults', () => {
    it('should apply defaults when loading from JSON', () => {
      const model = TestModelWithDefaults.fromJSON({})
      
      expect(model.stringField).toBe('default-string')
      expect(model.numberField).toBe(42)
      expect(model.dateField).toEqual(new Date('2023-01-01'))
      expect(model.booleanField).toBe(true)
      expect(model.stringArrayField).toEqual(['item1', 'item2'])
      expect(model.keywordField).toBe('default-keyword')
      expect(model.stringMapField).toEqual({ key1: 'value1', key2: 'value2' })
      expect(model.objectField).toEqual({ nested: 'default-nested' })
      expect(model.objectArrayField).toEqual([
        { item: 'default-item1' },
        { item: 'default-item2' }
      ])
    })
    
    it('should apply defaults to missing fields when loading partial data', () => {
      const model = TestModelWithDefaults.fromJSON({
        id: id(),
        version: 2,
        stringField: 'from-database'
      })
      
      expect(model.stringField).toBe('from-database')
      expect(model.numberField).toBe(42) // Should get default
      expect(model.booleanField).toBe(true) // Should get default
      expect(model.keywordField).toBe('default-keyword') // Should get default
    })
    
    it('should not override null values from database', () => {
      const model = TestModelWithDefaults.fromJSON({
        id: id(),
        version: 2,
        stringField: null,
        numberField: null
      })
      
      expect(model.stringField).toBeNull()
      expect(model.numberField).toBeNull()
      expect(model.booleanField).toBe(true) // Should get default
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
      expect(model.stringArrayField).toEqual([])
    })
    
    it('should simulate loading old records with new fields', () => {
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
      
      const model = TestModelWithDefaults.fromJSON(oldRecord)
      
      // Existing fields should be preserved
      expect(model.stringField).toBe('existing-value')
      expect(model.version).toBe(5)
      
      // New fields should get defaults
      expect(model.numberField).toBe(42)
      expect(model.booleanField).toBe(true)
      expect(model.keywordField).toBe('default-keyword')
      expect(model.stringArrayField).toEqual(['item1', 'item2'])
    })
  })
  
  describe('Default Function Isolation', () => {
    it('should create new instances from default functions', () => {
      const model1 = new TestModelWithDefaults()
      const model2 = new TestModelWithDefaults()
      
      // Modify arrays and objects in model1
      model1.stringArrayField.push('item3')
      model1.stringMapField.key3 = 'value3'
      model1.objectField.nested = 'modified'
      model1.objectArrayField.push({ item: 'new-item' })
      
      // model2 should have pristine defaults
      expect(model2.stringArrayField).toEqual(['item1', 'item2'])
      expect(model2.stringMapField).toEqual({ key1: 'value1', key2: 'value2' })
      expect(model2.objectField).toEqual({ nested: 'default-nested' })
      expect(model2.objectArrayField).toEqual([
        { item: 'default-item1' },
        { item: 'default-item2' }
      ])
    })
  })
  
  describe('Save Method Defaults', () => {
    it('should apply defaults during save for new documents', async () => {
      // Mock the searchService
      const searchService = require('../SearchService')
      searchService.search.searchRequest = jest.fn().mockResolvedValue({
        _id: 'test-id',
        _version: 1
      })
      
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
      const savedData = searchService.search.searchRequest.mock.calls[0][2]
      expect(savedData.withDefault).toBe('has-default')
      expect(savedData.withoutDefault).toBe('provided-value')
    })
  })
})