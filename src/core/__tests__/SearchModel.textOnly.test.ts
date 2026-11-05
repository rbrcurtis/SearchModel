import 'reflect-metadata'
import { describe, it, expect } from 'vitest'
import { SearchModel } from '../SearchModel'
import { StringType, ObjectType } from '../../decorators'

class TextOnlyModel extends SearchModel<TextOnlyModel> {
  static readonly indexName = 'text-only-index'

  @StringType()
  title!: string

  @StringType({ keyword: false })
  body!: string

  @ObjectType({
    properties: {
      heading: { type: 'string' },
      content: { type: 'string', options: { keyword: false } },
    },
  })
  section!: { heading: string; content: string }
}

describe('text-only string mappings', () => {
  it('maps a default StringType field as text with a keyword subfield', () => {
    const mapping = SearchModel.generateMapping.call(TextOnlyModel as any)
    expect(mapping.mappings.properties.title).toEqual({
      type: 'text',
      fields: { keyword: { type: 'keyword' } },
    })
  })

  it('maps StringType({ keyword: false }) as text with no keyword subfield', () => {
    const mapping = SearchModel.generateMapping.call(TextOnlyModel as any)
    expect(mapping.mappings.properties.body).toEqual({ type: 'text' })
  })

  it('maps getElasticsearchFieldType string keyword:false to text only', () => {
    const result = SearchModel.getElasticsearchFieldType({
      propertyKey: 'body',
      type: 'string',
      options: { keyword: false },
    })
    expect(result).toEqual({ type: 'text' })
  })

  it('honors keyword:false for nested object string properties', () => {
    const mapping = SearchModel.generateMapping.call(TextOnlyModel as any)
    const section = mapping.mappings.properties.section
    expect(section.properties.heading).toEqual({
      type: 'text',
      fields: { keyword: { type: 'keyword' } },
    })
    expect(section.properties.content).toEqual({ type: 'text' })
  })
})
