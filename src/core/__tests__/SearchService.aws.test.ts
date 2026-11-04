import { Mock } from 'vitest'
import { id } from '../../utils/id'

vi.mock('@aws-sdk/credential-provider-node', () => ({
  defaultProvider: () => credentialsProvider,
}))

const credentialsProvider = vi.fn(async () => ({
  accessKeyId: 'AKIAEXAMPLE',
  secretAccessKey: 'secretExampleKey',
  sessionToken: 'sessionTokenExample',
}))

async function freshSearch() {
  vi.resetModules()
  const mod = await import('../SearchService')
  ;(mod.search as any)._resetConfig()
  return mod.search
}

describe('SearchService AWS SigV4 transport', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv, ELASTICSEARCH_URL: 'https://search.example.com' }
    delete process.env.ELASTICSEARCH_AWS_SERVICE
    delete process.env.AWS_REGION
    credentialsProvider.mockClear()
    global.fetch = vi.fn() as Mock
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('sends unsigned requests when ELASTICSEARCH_AWS_SERVICE is unset', async () => {
    const search = await freshSearch()
    ;(global.fetch as Mock).mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })

    await search.searchRequest('GET', `/test-index/_doc/${id()}`)

    const headers = (global.fetch as Mock).mock.calls[0][1].headers
    expect(headers.authorization ?? headers.Authorization).toBeUndefined()
    expect(headers['x-amz-date']).toBeUndefined()
  })

  it('signs requests with SigV4 headers when ELASTICSEARCH_AWS_SERVICE is set', async () => {
    process.env.ELASTICSEARCH_AWS_SERVICE = 'es'
    process.env.AWS_REGION = 'us-east-1'
    const search = await freshSearch()
    ;(global.fetch as Mock).mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })

    await search.searchRequest('GET', `/test-index/_doc/${id()}`)

    const headers = (global.fetch as Mock).mock.calls[0][1].headers
    const authorization = headers.authorization ?? headers.Authorization
    expect(authorization).toBeDefined()
    expect(String(authorization)).toContain('AWS4-HMAC-SHA256')
    expect(headers['x-amz-date']).toBeDefined()
    expect(headers['x-amz-security-token']).toBe('sessionTokenExample')
  })

  it('regenerates the signature on each retry', async () => {
    process.env.ELASTICSEARCH_AWS_SERVICE = 'es'
    process.env.AWS_REGION = 'us-east-1'
    const search = await freshSearch()
    ;(global.fetch as Mock)
      .mockResolvedValueOnce({ ok: false, status: 429, statusText: 'Too Many Requests' })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ success: true }) })

    await search.searchRequest('GET', `/test-index/_doc/${id()}`)

    expect(global.fetch).toHaveBeenCalledTimes(2)
    expect(credentialsProvider).toHaveBeenCalledTimes(2)
    const firstDate = (global.fetch as Mock).mock.calls[0][1].headers['x-amz-date']
    const secondDate = (global.fetch as Mock).mock.calls[1][1].headers['x-amz-date']
    expect(firstDate).toBeDefined()
    expect(secondDate).toBeDefined()
    const firstAuth = (global.fetch as Mock).mock.calls[0][1].headers.authorization
    const secondAuth = (global.fetch as Mock).mock.calls[1][1].headers.authorization
    expect(firstAuth).toBeDefined()
    expect(secondAuth).toBeDefined()
  })
})
