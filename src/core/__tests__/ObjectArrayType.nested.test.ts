import { SearchModel } from '../SearchModel'
import { ObjectArrayType } from '../../decorators'

describe('ObjectArrayType nested option', () => {
  // Test model with default (no nested option)
  class TestModelDefault extends SearchModel {
    static readonly indexName = 'test-default'

    @ObjectArrayType({
      properties: {
        name: { type: 'string' },
        value: { type: 'number' },
      },
    })
    items!: Array<{ name: string; value: number }>
  }

  // Test model with nested: true
  class TestModelNested extends SearchModel {
    static readonly indexName = 'test-nested'

    @ObjectArrayType({
      properties: {
        name: { type: 'string' },
        value: { type: 'number' },
      },
      nested: true,
    })
    items!: Array<{ name: string; value: number }>
  }

  // Test model with nested: false (explicit)
  class TestModelNotNested extends SearchModel {
    static readonly indexName = 'test-not-nested'

    @ObjectArrayType({
      properties: {
        name: { type: 'string' },
        value: { type: 'number' },
      },
      nested: false,
    })
    items!: Array<{ name: string; value: number }>
  }

  it('should use object type by default (when nested option is not specified)', () => {
    const mapping = SearchModel.generateMapping.call(TestModelDefault as any)
    const itemsMapping = mapping.mappings.properties.items

    expect(itemsMapping.type).toBe('object')
    expect(itemsMapping.properties).toBeDefined()
    expect(itemsMapping.properties.name).toEqual({
      type: 'text',
      fields: { keyword: { type: 'keyword' } },
    })
    expect(itemsMapping.properties.value).toEqual({ type: 'double' })
  })

  it('should use nested type when nested: true is specified', () => {
    const mapping = SearchModel.generateMapping.call(TestModelNested as any)
    const itemsMapping = mapping.mappings.properties.items

    expect(itemsMapping.type).toBe('nested')
    expect(itemsMapping.properties).toBeDefined()
    expect(itemsMapping.properties.name).toEqual({
      type: 'text',
      fields: { keyword: { type: 'keyword' } },
    })
    expect(itemsMapping.properties.value).toEqual({ type: 'double' })
  })

  it('should use object type when nested: false is explicitly specified', () => {
    const mapping = SearchModel.generateMapping.call(TestModelNotNested as any)
    const itemsMapping = mapping.mappings.properties.items

    expect(itemsMapping.type).toBe('object')
    expect(itemsMapping.properties).toBeDefined()
    expect(itemsMapping.properties.name).toEqual({
      type: 'text',
      fields: { keyword: { type: 'keyword' } },
    })
    expect(itemsMapping.properties.value).toEqual({ type: 'double' })
  })

  it('should still validate object array items correctly', () => {
    const instance = new TestModelDefault({
      id: 'test-1',
      items: [
        { name: 'item1', value: 10 },
        { name: 'item2', value: 20 },
      ],
    })

    expect(instance.items).toHaveLength(2)
    expect(instance.items[0].name).toBe('item1')
    expect(instance.items[0].value).toBe(10)
  })

  it('should throw error for invalid object array items', () => {
    expect(() => {
      new TestModelDefault({
        id: 'test-2',
        items: [{ name: 'valid', value: 10 }, 'invalid-item' as any],
      })
    }).toThrow()
  })
})
