import 'reflect-metadata'
import { Mock } from 'vitest'
import { SearchModel } from '../SearchModel'
import { search } from '../SearchService'
import { StringType } from '../../decorators'
import { walkIndex } from '../../utils/walkIndex'
import { id } from '../../utils/id'

class PrefixModel extends SearchModel<PrefixModel> {
  static readonly indexName = 'prompt'

  @StringType({ required: true })
  name!: string
}

function recordedPaths(): string[] {
  return (global.fetch as Mock).mock.calls.map((call) =>
    String(call[0]).replace('http://localhost:9200', '')
  )
}

describe('index prefix applied to model operations', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv, ELASTICSEARCH_URL: 'http://localhost:9200', ES_INDEX_PREFIX: 'agents_' }
    global.fetch = vi.fn() as Mock
    ;(search as any)._resetConfig()
  })

  afterEach(() => {
    process.env = originalEnv
    ;(search as any)._resetConfig()
  })

  it('creates the index at the prefixed path', async () => {
    ;(global.fetch as Mock).mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })

    await (PrefixModel as any).createIndex()

    expect(recordedPaths()).toContain('/agents_prompt')
  })

  it('creates documents at the prefixed path', async () => {
    const docId = id()
    ;(global.fetch as Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ _version: 1 }),
    })

    await PrefixModel.create({ id: docId, name: 'x' })

    expect(recordedPaths().some((p) => p.startsWith(`/agents_prompt/_doc/${docId}`))).toBe(true)
  })

  it('gets documents by id at the prefixed path', async () => {
    const docId = id()
    ;(global.fetch as Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ found: true, _id: docId, _version: 1, _source: { name: 'x', version: 1 } }),
    })

    await PrefixModel.getById(docId)

    expect(recordedPaths()).toContain(`/agents_prompt/_doc/${docId}`)
  })

  it('finds documents at the prefixed path', async () => {
    ;(global.fetch as Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ hits: { total: { value: 0 }, hits: [] } }),
    })

    await PrefixModel.find(['name:x'])

    expect(recordedPaths()).toContain('/agents_prompt/_search')
  })

  it('finds with total at the prefixed path', async () => {
    ;(global.fetch as Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ hits: { total: { value: 0 }, hits: [] } }),
    })

    await PrefixModel.findWithTotal(['name:x'])

    expect(recordedPaths()).toContain('/agents_prompt/_search')
  })

  it('saves existing documents at the prefixed path', async () => {
    const docId = id()
    ;(global.fetch as Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ _version: 2 }),
    })

    const instance = PrefixModel.fromJSON({ id: docId, name: 'x', version: 1 } as any)
    instance.name = 'y'
    await instance.save()

    expect(recordedPaths().some((p) => p.startsWith(`/agents_prompt/_doc/${docId}`))).toBe(true)
  })

  it('deletes documents at the prefixed path', async () => {
    const docId = id()
    ;(global.fetch as Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ result: 'deleted' }),
    })

    const instance = PrefixModel.fromJSON({ id: docId, name: 'x', version: 1 } as any)
    await instance.delete()

    expect(recordedPaths().some((p) => p.startsWith(`/agents_prompt/_doc/${docId}`))).toBe(true)
  })

  it('walks the prefixed index, never the unprefixed name', async () => {
    ;(global.fetch as Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ hits: { total: { value: 0 }, hits: [] } }),
    })

    await walkIndex(PrefixModel as any, ['*'], async () => {})

    const paths = recordedPaths()
    expect(paths).toContain('/agents_prompt/_search')
    expect(paths.some((p) => p.startsWith('/prompt/'))).toBe(false)
  })
})
