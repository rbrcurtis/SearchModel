import 'reflect-metadata'
import { SearchModel, SaveEvent } from '../SearchModel'
import { StringType, NumberType, DateType } from '../../decorators'
import { search } from '../SearchService'
import { id } from '../../utils/id'

// Mock the SearchService module
jest.mock('../SearchService', () => {
  const actual = jest.requireActual('../SearchService')
  return {
    ...actual,
    search: {
      searchRequest: jest.fn(),
      query: jest.fn(),
      getById: jest.fn()
    }
  }
})

// Type the mocked search for TypeScript
const mockedSearch = search as jest.Mocked<typeof search>

// Test model that sets properties in beforeSave
class BlogPost extends SearchModel {
  static readonly indexName = 'blog-posts'

  @StringType({ required: true })
  title!: string

  @StringType()
  slug!: string

  @StringType()
  content!: string

  @NumberType()
  readTimeMinutes!: number

  @DateType()
  publishedAt!: Date

  @StringType()
  status!: string

  protected async beforeSave(event: SaveEvent): Promise<void> {
    // Auto-generate slug from title if not provided
    if (!this.slug && this.title) {
      this.slug = this.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    }

    // Calculate reading time based on content
    if (this.content) {
      const wordsPerMinute = 200
      const wordCount = this.content.split(/\s+/).length
      this.readTimeMinutes = Math.ceil(wordCount / wordsPerMinute)
    }

    // Auto-publish if title contains 'PUBLISH'
    if (this.title && this.title.includes('PUBLISH')) {
      this.status = 'published'
      this.publishedAt = new Date()
    }

    // Set default status if not set
    if (!this.status) {
      this.status = 'draft'
    }
  }
}

// Test model that modifies existing properties in beforeSave
class Product extends SearchModel {
  static readonly indexName = 'products'

  @StringType({ required: true })
  name!: string

  @NumberType({ required: true })
  price!: number

  @NumberType()
  discountedPrice!: number

  @StringType()
  category!: string

  @NumberType()
  discountPercent!: number

  protected async beforeSave(event: SaveEvent): Promise<void> {
    // Apply automatic discount for expensive items
    if (this.price >= 1000 && !this.discountPercent) {
      this.discountPercent = 10
    }

    // Calculate discounted price if discount is set
    if (this.discountPercent && this.discountPercent > 0) {
      this.discountedPrice = this.price * (1 - this.discountPercent / 100)
    }

    // Auto-categorize based on price
    if (this.price < 50) {
      this.category = 'budget'
    } else if (this.price >= 1000) {
      this.category = 'premium'
    } else if (!this.category) {
      this.category = 'standard'
    }
  }
}

describe('SearchModel beforeSave Property Persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedSearch.searchRequest.mockReset()
  })

  describe('properties set in beforeSave are persisted', () => {
    it('should persist auto-generated slug in Elasticsearch', async () => {
      const testId = id()
      let capturedDocument: any

      // Mock the search request to capture what gets sent to ES
      mockedSearch.searchRequest.mockImplementation((method, url, document) => {
        capturedDocument = document
        return Promise.resolve({
          _id: testId,
          _version: 1
        })
      })

      const post = new BlogPost({
        id: testId,
        title: 'Hello World Example',
        content: 'This is some test content for our blog post.'
      })

      await post.save()

      // Verify that beforeSave was called and slug was generated
      expect(post.slug).toBe('hello-world-example')

      // Verify that the generated slug was included in the document sent to ES
      expect(capturedDocument).toMatchObject({
        id: testId,
        title: 'Hello World Example',
        slug: 'hello-world-example',
        content: 'This is some test content for our blog post.',
        readTimeMinutes: 1, // Should be calculated from content
        status: 'draft' // Should be set by beforeSave
      })

      expect(mockedSearch.searchRequest).toHaveBeenCalledWith(
        'PUT',
        `/blog-posts/_doc/${testId}?refresh=wait_for`,
        expect.objectContaining({
          slug: 'hello-world-example',
          readTimeMinutes: 1,
          status: 'draft'
        })
      )
    })

    it('should persist calculated reading time in Elasticsearch', async () => {
      const testId = id()
      let capturedDocument: any

      mockedSearch.searchRequest.mockImplementation((method, url, document) => {
        capturedDocument = document
        return Promise.resolve({
          _id: testId,
          _version: 1
        })
      })

      // Create content that should take about 2 minutes to read (400 words)
      const longContent = Array(400).fill('word').join(' ')

      const post = new BlogPost({
        id: testId,
        title: 'Long Article',
        content: longContent
      })

      await post.save()

      // Verify reading time was calculated
      expect(post.readTimeMinutes).toBe(2)

      // Verify it was persisted to ES
      expect(capturedDocument.readTimeMinutes).toBe(2)
    })

    it('should persist auto-publish status and timestamp', async () => {
      const testId = id()
      let capturedDocument: any

      mockedSearch.searchRequest.mockImplementation((method, url, document) => {
        capturedDocument = document
        return Promise.resolve({
          _id: testId,
          _version: 1
        })
      })

      const post = new BlogPost({
        id: testId,
        title: 'PUBLISH This Article Now',
        content: 'This should be auto-published.'
      })

      const beforeSaveTime = new Date()
      await post.save()
      const afterSaveTime = new Date()

      // Verify auto-publish logic worked
      expect(post.status).toBe('published')
      expect(post.publishedAt).toBeInstanceOf(Date)
      expect(post.publishedAt.getTime()).toBeGreaterThanOrEqual(beforeSaveTime.getTime())
      expect(post.publishedAt.getTime()).toBeLessThanOrEqual(afterSaveTime.getTime())

      // Verify it was persisted to ES
      expect(capturedDocument.status).toBe('published')
      expect(capturedDocument.publishedAt).toBe(post.publishedAt.toISOString())
    })

    it('should persist multiple properties set in beforeSave simultaneously', async () => {
      const testId = id()
      let capturedDocument: any

      mockedSearch.searchRequest.mockImplementation((method, url, document) => {
        capturedDocument = document
        return Promise.resolve({
          _id: testId,
          _version: 1
        })
      })

      const product = new Product({
        id: testId,
        name: 'Luxury Watch',
        price: 1500
      })

      await product.save()

      // Verify all beforeSave logic was applied
      expect(product.discountPercent).toBe(10) // Auto-discount for expensive items
      expect(product.discountedPrice).toBe(1350) // Calculated price
      expect(product.category).toBe('premium') // Auto-categorized

      // Verify all were persisted to ES
      expect(capturedDocument).toMatchObject({
        id: testId,
        name: 'Luxury Watch',
        price: 1500,
        discountPercent: 10,
        discountedPrice: 1350,
        category: 'premium'
      })
    })

    it('should persist properties modified in beforeSave even if they were already set', async () => {
      const testId = id()
      let capturedDocument: any

      mockedSearch.searchRequest.mockImplementation((method, url, document) => {
        capturedDocument = document
        return Promise.resolve({
          _id: testId,
          _version: 1
        })
      })

      const product = new Product({
        id: testId,
        name: 'Budget Item',
        price: 25,
        category: 'electronics' // Pre-set category
      })

      await product.save()

      // beforeSave should override the category based on price
      expect(product.category).toBe('budget')

      // Verify the modified category was persisted
      expect(capturedDocument.category).toBe('budget')
    })
  })

  describe('change tracking with beforeSave modifications', () => {
    it('should track fields modified in beforeSave hook', async () => {
      const testId = id()

      mockedSearch.searchRequest.mockResolvedValue({
        _id: testId,
        _version: 1
      })

      const post = new BlogPost({
        id: testId,
        title: 'Test Article',
        content: 'Some content here.'
      })

      // Clear initial changes from constructor
      post['clearChangedFields']()

      // Manually change one field
      post.title = 'Updated Title'

      await post.save()

      // The save should include both manually changed fields and beforeSave changes
      expect(mockedSearch.searchRequest).toHaveBeenCalledWith(
        'PUT',
        `/blog-posts/_doc/${testId}?refresh=wait_for`,
        expect.objectContaining({
          title: 'Updated Title',
          slug: 'updated-title', // Generated in beforeSave
          readTimeMinutes: 1,   // Calculated in beforeSave
          status: 'draft'       // Set in beforeSave
        })
      )
    })

    it('should work correctly with the update() method and beforeSave', async () => {
      const testId = id()

      mockedSearch.searchRequest.mockResolvedValue({
        _id: testId,
        _version: 1
      })

      const post = new BlogPost({
        id: testId,
        title: 'Original',
        content: 'Original content.'
      })

      // Clear initial changes
      post['clearChangedFields']()

      // Use update method to change multiple properties - create content with 500+ words
      const longContent = Array(500).fill('word').join(' ')
      post.update({
        title: 'PUBLISH Updated Article',
        content: longContent
      })

      await post.save()

      // Verify update() properties were set
      expect(post.title).toBe('PUBLISH Updated Article')

      // Verify beforeSave logic was applied
      expect(post.slug).toBe('publish-updated-article')
      expect(post.status).toBe('published') // Auto-published due to 'PUBLISH' in title
      expect(post.publishedAt).toBeInstanceOf(Date)
      expect(post.readTimeMinutes).toBe(3) // 500 words / 200 wpm = 2.5, rounded up to 3

      // Verify everything was persisted
      expect(mockedSearch.searchRequest).toHaveBeenCalledWith(
        'PUT',
        `/blog-posts/_doc/${testId}?refresh=wait_for`,
        expect.objectContaining({
          title: 'PUBLISH Updated Article',
          slug: 'publish-updated-article',
          status: 'published',
          publishedAt: post.publishedAt.toISOString(),
          readTimeMinutes: post.readTimeMinutes
        })
      )
    })
  })

  describe('beforeSave order of operations', () => {
    it('should call beforeSave before validation and defaults', async () => {
      const testId = id()
      const callOrder: string[] = []

      class TestModel extends SearchModel {
        static readonly indexName = 'test'

        @StringType({ required: true })
        name!: string

        @StringType({ default: () => 'default-value' })
        optionalField!: string

        protected async beforeSave(event: SaveEvent): Promise<void> {
          callOrder.push('beforeSave')
          this.name = 'set-in-beforeSave'
        }
      }

      // Override applyDefaults to track when it's called
      const originalApplyDefaults = TestModel.prototype['applyDefaults']
      TestModel.prototype['applyDefaults'] = function() {
        callOrder.push('applyDefaults')
        return originalApplyDefaults.call(this)
      }

      // Override validateRequiredFields to track when it's called
      const originalValidateRequiredFields = TestModel.prototype['validateRequiredFields']
      TestModel.prototype['validateRequiredFields'] = function() {
        callOrder.push('validateRequiredFields')
        return originalValidateRequiredFields.call(this)
      }

      mockedSearch.searchRequest.mockResolvedValue({
        _id: testId,
        _version: 1
      })

      const model = new TestModel({ id: testId })

      await model.save()

      // Verify the correct order of operations (applyDefaults is called in constructor, then beforeSave, then applyDefaults again, then validation)
      expect(callOrder).toEqual(['applyDefaults', 'beforeSave', 'applyDefaults', 'validateRequiredFields'])

      // Verify the property set in beforeSave was used for validation
      expect(model.name).toBe('set-in-beforeSave')

      // Restore original methods
      TestModel.prototype['applyDefaults'] = originalApplyDefaults
      TestModel.prototype['validateRequiredFields'] = originalValidateRequiredFields
    })
  })
})