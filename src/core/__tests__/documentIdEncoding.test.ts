import 'reflect-metadata'
import { Mock } from 'vitest'
import { SearchModel } from '../SearchModel'
import { search } from '../SearchService'
import { StringType } from '../../decorators'

const RAW_ID = 'prompt|location:1/2?3#4 5'
const ENCODED_ID = encodeURIComponent(RAW_ID)

class EncodingModel extends SearchModel<EncodingModel> {
  static readonly indexName = 'encoding_model'

  @StringType({ required: true })
  name!: string
}

function recordedPaths(): string[] {
  return (global.fetch as Mock).mock.calls.map((call) =>
    String(call[0]).replace('http://localhost:9200', '')
  )
}

describe('model document id url encoding', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv, ELASTICSEARCH_URL: 'http://localhost:9200' }
    global.fetch = vi.fn() as Mock
    ;(search as any)._resetConfig()
  })

  afterEach(() => {
    process.env = originalEnv
    ;(search as any)._resetConfig()
  })

  it('encodes the id segment on getById', async () => {
    ;(global.fetch as Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ found: true, _id: RAW_ID, _version: 1, _source: { name: 'x', version: 1 } }),
    })

    const loaded = await EncodingModel.getById(RAW_ID)

    expect(recordedPaths()).toContain(`/encoding_model/_doc/${ENCODED_ID}`)
    expect(loaded!.id).toBe(RAW_ID)
  })

  it('encodes the id segment on create-only save', async () => {
    ;(global.fetch as Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ _version: 1 }),
    })

    const instance = new EncodingModel({ id: RAW_ID, name: 'x' } as any)
    await instance.save({ createOnly: true })

    const path = recordedPaths().find((p) => p.startsWith('/encoding_model/_create/'))
    expect(path).toBe(`/encoding_model/_create/${ENCODED_ID}`)
  })

  it('encodes the id segment on an ordinary save', async () => {
    ;(global.fetch as Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ _version: 2 }),
    })

    const instance = EncodingModel.fromJSON({ id: RAW_ID, name: 'x', version: 1 } as any)
    instance.name = 'y'
    await instance.save()

    const path = recordedPaths().find((p) => p.startsWith('/encoding_model/_doc/'))
    expect(path).toBe(`/encoding_model/_doc/${ENCODED_ID}`)
  })

  it('encodes the id segment on delete', async () => {
    ;(global.fetch as Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ result: 'deleted' }),
    })

    const instance = EncodingModel.fromJSON({ id: RAW_ID, name: 'x', version: 1 } as any)
    await instance.delete()

    const path = recordedPaths().find((p) => p.startsWith('/encoding_model/_doc/'))
    expect(path).toBe(`/encoding_model/_doc/${ENCODED_ID}`)
  })

  it('encodes exactly once with no double encoding', async () => {
    ;(global.fetch as Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ _version: 2 }),
    })

    const instance = EncodingModel.fromJSON({ id: RAW_ID, name: 'x', version: 1 } as any)
    instance.name = 'y'
    await instance.save()

    const path = recordedPaths().find((p) => p.startsWith('/encoding_model/_doc/'))
    expect(decodeURIComponent(path!.slice('/encoding_model/_doc/'.length))).toBe(RAW_ID)
    expect(path).not.toContain('%25')
  })
})
