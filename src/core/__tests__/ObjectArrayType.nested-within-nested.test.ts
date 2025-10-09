import { SearchModel } from '../SearchModel'
import { ObjectArrayType } from '../../decorators'

describe('ObjectArrayType - nested within nested arrays', () => {
  // Test model with objectArray containing another objectArray
  class TestModelNestedArrays extends SearchModel {
    static readonly indexName = 'test-nested-arrays'

    @ObjectArrayType({
      properties: {
        name: { type: 'string' },
        tags: { type: 'stringArray' },
        children: {
          type: 'objectArray',
          options: {
            properties: {
              childName: { type: 'string' },
              childValue: { type: 'number' },
            },
          },
        },
      },
    })
    items!: Array<{
      name: string
      tags: string[]
      children: Array<{ childName: string; childValue: number }>
    }>
  }

  // Test model with nested: true on outer array but default on inner
  class TestModelNestedOuter extends SearchModel {
    static readonly indexName = 'test-nested-outer'

    @ObjectArrayType({
      properties: {
        name: { type: 'string' },
        children: {
          type: 'objectArray',
          options: {
            properties: {
              childName: { type: 'string' },
              childValue: { type: 'number' },
            },
          },
        },
      },
      nested: true,
    })
    items!: Array<{
      name: string
      children: Array<{ childName: string; childValue: number }>
    }>
  }

  // Test model with nested: true on inner array but default on outer
  class TestModelNestedInner extends SearchModel {
    static readonly indexName = 'test-nested-inner'

    @ObjectArrayType({
      properties: {
        name: { type: 'string' },
        children: {
          type: 'objectArray',
          options: {
            properties: {
              childName: { type: 'string' },
              childValue: { type: 'number' },
            },
            nested: true,
          },
        },
      },
    })
    items!: Array<{
      name: string
      children: Array<{ childName: string; childValue: number }>
    }>
  }

  it('should handle objectArray within objectArray with default (object) types', () => {
    const mapping = SearchModel.generateMapping.call(
      TestModelNestedArrays as any
    )
    const itemsMapping = mapping.mappings.properties.items

    expect(itemsMapping.type).toBe('object')
    expect(itemsMapping.properties).toBeDefined()
    expect(itemsMapping.properties.name).toEqual({
      type: 'text',
      fields: { keyword: { type: 'keyword' } },
    })
    expect(itemsMapping.properties.tags).toEqual({
      type: 'text',
      fields: { keyword: { type: 'keyword' } },
    })

    // Check nested children array
    expect(itemsMapping.properties.children).toBeDefined()
    expect(itemsMapping.properties.children.type).toBe('object')
    expect(itemsMapping.properties.children.properties).toBeDefined()
    expect(itemsMapping.properties.children.properties.childName).toEqual({
      type: 'text',
      fields: { keyword: { type: 'keyword' } },
    })
    expect(itemsMapping.properties.children.properties.childValue).toEqual({
      type: 'double',
    })
  })

  it('should use nested type on outer array when specified', () => {
    const mapping = SearchModel.generateMapping.call(TestModelNestedOuter as any)
    const itemsMapping = mapping.mappings.properties.items

    expect(itemsMapping.type).toBe('nested')
    expect(itemsMapping.properties.children.type).toBe('object') // inner should be object by default
  })

  it('should use nested type on inner array when specified', () => {
    const mapping = SearchModel.generateMapping.call(TestModelNestedInner as any)
    const itemsMapping = mapping.mappings.properties.items

    expect(itemsMapping.type).toBe('object') // outer should be object by default
    expect(itemsMapping.properties.children.type).toBe('nested') // inner should be nested
  })

  it('should validate nested objectArray data correctly', () => {
    const instance = new TestModelNestedArrays({
      id: 'test-1',
      items: [
        {
          name: 'item1',
          tags: ['tag1', 'tag2'],
          children: [
            { childName: 'child1', childValue: 10 },
            { childName: 'child2', childValue: 20 },
          ],
        },
        {
          name: 'item2',
          tags: ['tag3'],
          children: [{ childName: 'child3', childValue: 30 }],
        },
      ],
    })

    expect(instance.items).toHaveLength(2)
    expect(instance.items[0].children).toHaveLength(2)
    expect(instance.items[0].children[0].childName).toBe('child1')
    expect(instance.items[0].children[0].childValue).toBe(10)
  })

  it('should throw error for invalid nested objectArray items', () => {
    expect(() => {
      new TestModelNestedArrays({
        id: 'test-2',
        items: [
          {
            name: 'item1',
            tags: ['tag1'],
            children: ['invalid-child' as any],
          },
        ],
      })
    }).toThrow()
  })
})
