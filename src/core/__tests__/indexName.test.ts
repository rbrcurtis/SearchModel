import { resolveIndexName } from '../indexName'

describe('resolveIndexName', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.ES_INDEX_PREFIX
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('prefixes the index name when ES_INDEX_PREFIX is set', () => {
    process.env.ES_INDEX_PREFIX = 'agents_'
    expect(resolveIndexName('prompt')).toBe('agents_prompt')
  })

  it('returns the index name unchanged when ES_INDEX_PREFIX is unset', () => {
    expect(resolveIndexName('prompt')).toBe('prompt')
  })

  it('returns the index name unchanged when ES_INDEX_PREFIX is empty', () => {
    process.env.ES_INDEX_PREFIX = ''
    expect(resolveIndexName('prompt')).toBe('prompt')
  })

  it('does not double-prefix an already-prefixed index name', () => {
    process.env.ES_INDEX_PREFIX = 'agents_'
    expect(resolveIndexName('agents_prompt')).toBe('agents_prompt')
  })

  it('rejects a prefix containing uppercase letters', () => {
    process.env.ES_INDEX_PREFIX = 'Agents_'
    expect(() => resolveIndexName('prompt')).toThrow()
  })

  it('rejects a prefix containing a slash', () => {
    process.env.ES_INDEX_PREFIX = 'agents/'
    expect(() => resolveIndexName('prompt')).toThrow()
  })

  it('rejects a prefix containing an asterisk', () => {
    process.env.ES_INDEX_PREFIX = 'agents*'
    expect(() => resolveIndexName('prompt')).toThrow()
  })

  it('rejects a prefix containing a comma', () => {
    process.env.ES_INDEX_PREFIX = 'agents,'
    expect(() => resolveIndexName('prompt')).toThrow()
  })

  it('rejects a prefix containing a space', () => {
    process.env.ES_INDEX_PREFIX = 'agents '
    expect(() => resolveIndexName('prompt')).toThrow()
  })

  it('rejects a prefix containing two dots', () => {
    process.env.ES_INDEX_PREFIX = 'agents..'
    expect(() => resolveIndexName('prompt')).toThrow()
  })
})
