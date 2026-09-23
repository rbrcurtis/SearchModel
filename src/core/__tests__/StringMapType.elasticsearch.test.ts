import 'reflect-metadata'
import { SearchModel } from '../SearchModel'
import { KeywordType, StringMapType } from '../../decorators'
import { id } from '../../utils/id'

// stringMap is now left out of the generated mapping so Elasticsearch dynamic
// auto-mapping indexes each leaf key. This is the contract the generalized
// Event.meta relies on: query events by any inner key at any depth.
class MapTestModel extends SearchModel<MapTestModel> {
  static readonly indexName = `search_model_map_tests_${id()}`

  @KeywordType({ required: true })
  orgId!: string

  @StringMapType()
  meta!: Record<string, unknown>
}

describe('StringMapType Elasticsearch Integration', () => {
  let testIndexName: string

  beforeAll(async () => {
    testIndexName = MapTestModel.indexName
    await SearchModel.createIndex.call(MapTestModel as any)
  })

  afterAll(async () => {
    const { search } = await import('../SearchService')
    try {
      await search.searchRequest('DELETE', `/${testIndexName}`)
    } catch (err) {
      // Index might not exist, ignore
    }
  })

  it('omits stringMap from the generated mapping so ES auto-maps its keys', () => {
    const mapping = SearchModel.generateMapping.call(MapTestModel as any)
    expect(mapping.mappings.properties.orgId).toBeDefined()
    expect(mapping.mappings.properties.meta).toBeUndefined()
  })

  it('preserves nested structure with stringified leaves through save/load', async () => {
    const testId = id()
    const model = new MapTestModel({
      id: testId,
      orgId: 'org1',
      meta: {
        userId: 'u1',
        role: 'admin',
        actor: { profile: { orgId: 'org1' }, active: true, loginCount: 3 },
        tags: ['a', 'b'],
      },
    })

    await model.save({ wait: true })

    const loaded = await MapTestModel.getById(testId)
    expect(loaded).toBeDefined()
    // Leaves are coerced to strings at any depth; structure is preserved.
    expect(loaded!.meta).toEqual({
      userId: 'u1',
      role: 'admin',
      actor: { profile: { orgId: 'org1' }, active: 'true', loginCount: '3' },
      tags: ['a', 'b'],
    })

    await loaded!.delete()
  })

  it('is queryable by inner key at any depth', async () => {
    const testId = id()
    const model = new MapTestModel({
      id: testId,
      orgId: 'org2',
      meta: {
        source: 'google-calendar',
        actor: { userId: 'deep-user', role: 'provider' },
        tags: ['alpha', 'beta'],
      },
    })

    await model.save({ wait: true })

    // Top-level inner key
    const bySource = await MapTestModel.find([
      'orgId:org2',
      'meta.source:google-calendar',
    ])
    expect(bySource.map((m) => m.id)).toContain(testId)

    // Nested inner key
    const byNested = await MapTestModel.find(['meta.actor.userId:deep-user'])
    expect(byNested.map((m) => m.id)).toContain(testId)

    // Array element (ES indexes an array of strings like a string)
    const byTag = await MapTestModel.find(['meta.tags:alpha'])
    expect(byTag.map((m) => m.id)).toContain(testId)

    const model2 = await MapTestModel.getById(testId)
    await model2!.delete()
  })
})
