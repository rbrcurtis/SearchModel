import 'reflect-metadata'
import { SearchModel } from '../SearchModel'
import { StringArrayType } from '../../decorators'
import { id } from '../../utils/id'

// Test model with validate option
// Note: transform is defined in the interface but not currently implemented in decorators
// So we validate already-normalized domains (lowercase, no spaces)
class DomainTestModel extends SearchModel {
  static readonly indexName = `search_model_tests_${id()}`

  @StringArrayType({
    validate: (domains?: string[]) => {
      if (!domains || domains.length === 0) return true
      return domains.every((domain) => {
        // Validate each domain (expects already normalized: lowercase, trimmed)
        return (
          domain.includes('.') &&
          !domain.includes(' ') &&
          domain.length > 3 &&
          !domain.startsWith('.') &&
          !domain.endsWith('.') &&
          /^[a-z0-9.-]+$/.test(domain)
        )
      })
    },
  })
  domains!: string[]
}

describe('StringArrayType with Transform and Validate', () => {
  let testIndexName: string

  beforeAll(async () => {
    testIndexName = DomainTestModel.indexName
    await SearchModel.createIndex.call(DomainTestModel as any)
  })

  afterAll(async () => {
    // Manual cleanup since there's no deleteIndex method
    const { search } = await import('../SearchService')
    try {
      await search.searchRequest('DELETE', `/${testIndexName}`)
    } catch (err) {
      // Index might not exist, ignore
    }
  })

  describe('Basic functionality', () => {
    it('should accept valid normalized domains', () => {
      const model = new DomainTestModel({
        id: id(),
        domains: ['example.com', 'test.org', 'mixedcase.net']
      })

      expect([...model.domains]).toEqual(['example.com', 'test.org', 'mixedcase.net'])
    })

    it('should handle empty array', () => {
      const model = new DomainTestModel({
        id: id(),
        domains: []
      })

      expect([...model.domains]).toEqual([])
    })

    it('should handle undefined domains', () => {
      const model = new DomainTestModel({
        id: id()
      })

      expect(model.domains).toBeUndefined()
    })
  })

  describe('Validation rules', () => {
    it('should accept valid domains', () => {
      expect(() => {
        new DomainTestModel({
          id: id(),
          domains: ['example.com', 'test.org', 'sub.domain.net']
        })
      }).not.toThrow()
    })

    it('should accept empty array', () => {
      expect(() => {
        new DomainTestModel({
          id: id(),
          domains: []
        })
      }).not.toThrow()
    })

    it('should reject domain without dot', () => {
      expect(() => {
        new DomainTestModel({
          id: id(),
          domains: ['example', 'test.com']
        })
      }).toThrow()
    })

    it('should reject domain with spaces', () => {
      expect(() => {
        new DomainTestModel({
          id: id(),
          domains: ['example .com', 'test.org']
        })
      }).toThrow()
    })

    it('should reject domain shorter than 4 characters', () => {
      expect(() => {
        new DomainTestModel({
          id: id(),
          domains: ['a.b', 'test.com']
        })
      }).toThrow()
    })

    it('should reject domain starting with dot', () => {
      expect(() => {
        new DomainTestModel({
          id: id(),
          domains: ['.example.com', 'test.org']
        })
      }).toThrow()
    })

    it('should reject domain ending with dot', () => {
      expect(() => {
        new DomainTestModel({
          id: id(),
          domains: ['example.com.', 'test.org']
        })
      }).toThrow()
    })

    it('should reject domain with invalid characters', () => {
      expect(() => {
        new DomainTestModel({
          id: id(),
          domains: ['example@com', 'test.org']
        })
      }).toThrow()
    })

    it('should accept domains with numbers and hyphens', () => {
      expect(() => {
        new DomainTestModel({
          id: id(),
          domains: ['example123.com', 'test-site.org', 'sub-123.example.net']
        })
      }).not.toThrow()
    })
  })

  describe('Elasticsearch persistence with validation', () => {
    it('should save, load, save again, load again, modify, save, and load with validation enforced', async () => {
      // Step 1: Create with valid normalized domains
      const testId = id()
      const model = new DomainTestModel({
        id: testId,
        domains: ['example.com', 'test.org', 'mixedcase.net']
      })

      // Verify domains stored correctly
      expect([...model.domains]).toEqual(['example.com', 'test.org', 'mixedcase.net'])

      // Step 2: Save to database
      await model.save()

      // Step 3: Load from database and verify domains persisted
      const loaded1 = await DomainTestModel.getById(testId)
      expect(loaded1).toBeDefined()
      expect([...loaded1!.domains]).toEqual(['example.com', 'test.org', 'mixedcase.net'])

      // Step 4: Save again without modifications
      await loaded1!.save()

      // Step 5: Load again and verify still correct
      const loaded2 = await DomainTestModel.getById(testId)
      expect(loaded2).toBeDefined()
      expect([...loaded2!.domains]).toEqual(['example.com', 'test.org', 'mixedcase.net'])

      // Step 6: Modify with new valid domains
      loaded2!.domains = ['new-domain.com', 'another.org']

      // Verify new values set
      expect([...loaded2!.domains]).toEqual(['new-domain.com', 'another.org'])

      // Step 7: Save modifications
      await loaded2!.save()

      // Step 8: Load final time and verify changes persisted
      const loaded3 = await DomainTestModel.getById(testId)
      expect(loaded3).toBeDefined()
      expect([...loaded3!.domains]).toEqual(['new-domain.com', 'another.org'])

      // Cleanup
      await loaded3!.delete()
    })

    it('should handle empty array through save/load cycles', async () => {
      const testId = id()
      const model = new DomainTestModel({
        id: testId,
        domains: []
      })

      await model.save()

      const loaded = await DomainTestModel.getById(testId)
      expect(loaded).toBeDefined()
      expect([...loaded!.domains]).toEqual([])

      await loaded!.delete()
    })

    it('should persist single domain', async () => {
      const testId = id()
      const model = new DomainTestModel({
        id: testId,
        domains: ['single-domain.com']
      })

      expect([...model.domains]).toEqual(['single-domain.com'])

      await model.save()

      const loaded = await DomainTestModel.getById(testId)
      expect(loaded).toBeDefined()
      expect([...loaded!.domains]).toEqual(['single-domain.com'])

      await loaded!.delete()
    })

    it('should maintain validation rules after load', async () => {
      const testId = id()
      const model = new DomainTestModel({
        id: testId,
        domains: ['valid-domain.com']
      })

      await model.save()

      const loaded = await DomainTestModel.getById(testId)
      expect(loaded).toBeDefined()

      // Attempting to set invalid domain after load should still throw
      expect(() => {
        loaded!.domains = ['invalid domain with spaces']
      }).toThrow()

      await loaded!.delete()
    })

    it('should allow valid modifications after load', async () => {
      const testId = id()
      const model = new DomainTestModel({
        id: testId,
        domains: ['initial.com']
      })

      await model.save()

      const loaded = await DomainTestModel.getById(testId)
      expect(loaded).toBeDefined()

      // Modify with valid domains
      loaded!.domains = ['modified.com', 'spaces.net']
      expect([...loaded!.domains]).toEqual(['modified.com', 'spaces.net'])

      await loaded!.save()

      const loaded2 = await DomainTestModel.getById(testId)
      expect([...loaded2!.domains]).toEqual(['modified.com', 'spaces.net'])

      await loaded2!.delete()
    })
  })

  describe('Edge cases', () => {
    it('should handle subdomains correctly', async () => {
      const testId = id()
      const model = new DomainTestModel({
        id: testId,
        domains: ['sub.domain.example.com', 'deep.sub.domain.org']
      })

      expect([...model.domains]).toEqual(['sub.domain.example.com', 'deep.sub.domain.org'])

      await model.save()

      const loaded = await DomainTestModel.getById(testId)
      expect([...loaded!.domains]).toEqual(['sub.domain.example.com', 'deep.sub.domain.org'])

      await loaded!.delete()
    })

    it('should handle domains with multiple hyphens', async () => {
      const testId = id()
      const model = new DomainTestModel({
        id: testId,
        domains: ['multi-hyphen-domain.com', 'another-test-site.org']
      })

      expect([...model.domains]).toEqual(['multi-hyphen-domain.com', 'another-test-site.org'])

      await model.save()

      const loaded = await DomainTestModel.getById(testId)
      expect([...loaded!.domains]).toEqual(['multi-hyphen-domain.com', 'another-test-site.org'])

      await loaded!.delete()
    })

    it('should handle numeric domains', async () => {
      const testId = id()
      const model = new DomainTestModel({
        id: testId,
        domains: ['123.com', '456-test.org']
      })

      expect([...model.domains]).toEqual(['123.com', '456-test.org'])

      await model.save()

      const loaded = await DomainTestModel.getById(testId)
      expect([...loaded!.domains]).toEqual(['123.com', '456-test.org'])

      await loaded!.delete()
    })
  })
})
