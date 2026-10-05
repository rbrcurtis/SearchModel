import 'reflect-metadata'
import { SearchModel } from '../SearchModel'
import { ObjectArrayType, StringType } from '../../decorators'
import { id } from '../../utils/id'

// A stringMap nested inside an object/objectArray must be left out of the
// generated mapping, exactly like a top-level stringMap field. Mapping it as
// text rejects the object value at index time; omitting it lets Elasticsearch
// dynamic auto-mapping index each leaf key so inner keys stay queryable at any
// depth. Regression: participants' event-defined fields, e.g.
// participants.properties.geographic_region.
class NestedMapTestModel extends SearchModel<NestedMapTestModel> {
  static readonly indexName = `search_model_nested_map_tests_${id()}`

  @StringType({ required: true })
  title!: string

  @ObjectArrayType({
    properties: {
      userId: { type: 'string', options: { required: true } },
      properties: { type: 'stringMap' },
    },
  })
  participants!: Array<{
    userId: string
    properties?: Record<string, string>
  }>
}

describe('StringMapType nested in an object', () => {
  let testIndexName: string

  beforeAll(async () => {
    testIndexName = NestedMapTestModel.indexName
    await SearchModel.createIndex.call(NestedMapTestModel as any)
  })

  afterAll(async () => {
    const { search } = await import('../SearchService')
    try {
      await search.searchRequest('DELETE', `/${testIndexName}`)
    } catch (err) {
      // Index might not exist, ignore
    }
  })

  it('omits the nested stringMap from the generated mapping so ES auto-maps its keys', () => {
    const mapping = SearchModel.generateMapping.call(
      NestedMapTestModel as any
    )
    const participantsMapping = mapping.mappings.properties.participants

    expect(participantsMapping.type).toBe('object')
    expect(participantsMapping.properties.userId).toBeDefined()
    expect(participantsMapping.properties.properties).toBeUndefined()
  })

  it('saves participant maps and queries by an inner key', async () => {
    const testId = id()
    const model = new NestedMapTestModel({
      id: testId,
      title: 'Panel on regional history',
      participants: [
        {
          userId: 'user-1',
          properties: {
            geographic_region: 'US + Canada',
            period: '1900-present',
          },
        },
        {
          userId: 'user-2',
          properties: { geographic_region: 'Asia' },
        },
      ],
    })

    await model.save({ wait: true })

    const loaded = await NestedMapTestModel.getById(testId)
    // The array is proxy-wrapped for mutation tracking, so compare elements.
    expect(loaded!.participants).toHaveLength(2)
    expect(loaded!.participants[0]).toEqual({
      userId: 'user-1',
      properties: {
        geographic_region: 'US + Canada',
        period: '1900-present',
      },
    })
    expect(loaded!.participants[1]).toEqual({
      userId: 'user-2',
      properties: { geographic_region: 'Asia' },
    })

    // Matches when any participant in the flattened array has the value.
    const byRegion = await NestedMapTestModel.find([
      `participants.properties.geographic_region:"US + Canada"`,
    ])
    expect(byRegion.map((m) => m.id)).toContain(testId)

    const otherRegion = await NestedMapTestModel.find([
      'participants.properties.geographic_region:Asia',
    ])
    expect(otherRegion.map((m) => m.id)).toContain(testId)

    await loaded!.delete()
  })
})
