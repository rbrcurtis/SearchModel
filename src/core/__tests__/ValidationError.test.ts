import 'reflect-metadata'
import { Mocked } from 'vitest'
import { SearchModel, DeleteEvent, SaveEvent } from '../SearchModel'
import { StringType, NumberType, ObjectArrayType } from '../../decorators'
import { search } from '../SearchService'
import { ValidationError, validationFail } from '../../errors/ValidationError'

vi.mock('../SearchService', async () => {
  const actual = await vi.importActual('../SearchService')
  return {
    ...actual,
    search: {
      searchRequest: vi.fn().mockResolvedValue({}),
      query: vi.fn(),
      getById: vi.fn(),
    },
  }
})

const mockedSearch = search as Mocked<typeof search>

class Article extends SearchModel<Article> {
  static readonly indexName = 'articles'

  @StringType({ required: true })
  title!: string

  @StringType({ validate: (value: string) => value !== 'banned' })
  slug!: string

  @NumberType()
  rating!: number

  @ObjectArrayType({
    properties: {
      label: { type: 'string', options: { required: true } },
    },
  })
  authors!: Array<{ label: string }>

  protected async beforeDelete(_event: DeleteEvent): Promise<void> {
    // no-op; the test only needs the hook signature
  }
}

function make(data: Partial<Article> = {}): Article {
  const article = new Article()
  article.id = 'article-1'
  Object.assign(article, data)
  return article
}

describe('ValidationError', () => {
  it('carries a field map and keeps the message', () => {
    const error = new ValidationError({ title: 'Title is required' }, 'Bad input')
    expect(error).toBeInstanceOf(Error)
    expect(error.code).toBe('VALIDATION')
    expect(error.message).toBe('Bad input')
    expect(error.fieldErrors).toEqual({ title: 'Title is required' })
  })

  it('defaults the message to the first field error', () => {
    const error = new ValidationError({ title: 'Title is required' })
    expect(error.message).toBe('Title is required')
  })

  describe('fromMessage', () => {
    it.each([
      ["Field 'state' must be a string, got number", 'state'],
      ["Required property 'participants.0.userId' is missing", 'participants.0.userId'],
      ["Required field 'eventId' is missing", 'eventId'],
      ["Field 'participants[0]' must be an object, got string", 'participants[0]'],
      ["Vector field 'embedding' dimension must be a positive integer", 'embedding'],
    ])('extracts the field from %s', (message, field) => {
      expect(ValidationError.fromMessage(message).fieldErrors).toEqual({
        [field]: message,
      })
    })

    it('falls back to _form for a message without a field', () => {
      expect(validationFailMessageOnly()).toEqual({ _form: 'Validation failed' })
    })
  })
})

function validationFailMessageOnly() {
  try {
    validationFail('Validation failed')
  } catch (error) {
    return (error as ValidationError).fieldErrors
  }
  throw new Error('validationFail did not throw')
}

describe('model validation errors', () => {
  it('throws ValidationError for a required field on save', async () => {
    const article = make({ slug: 'ok', rating: 1, authors: [] })
    await expect(article.save()).rejects.toBeInstanceOf(ValidationError)
    await expect(article.save()).rejects.toMatchObject({
      code: 'VALIDATION',
      fieldErrors: { title: "Required field 'title' is missing" },
    })
  })

  it('throws ValidationError for a custom validator on assignment', () => {
    const article = make({ title: 'ok' })
    expect(() => {
      article.slug = 'banned'
    }).toThrow(ValidationError)
    expect(() => {
      article.slug = 'banned'
    }).toThrow("Field 'slug' failed custom validation")
  })

  it('throws ValidationError for a bad type on assignment', () => {
    const article = make({ title: 'ok' })
    expect(() => {
      ;(article as unknown as Record<string, unknown>).rating = 'high'
    }).toThrow(ValidationError)
  })

  it('throws ValidationError for a missing nested property', () => {
    const article = make({ title: 'ok' })
    expect(() => {
      article.authors = [{ label: undefined as unknown as string }]
    }).toThrow(ValidationError)
    try {
      article.authors = [{ label: undefined as unknown as string }]
    } catch (error) {
      expect((error as ValidationError).fieldErrors).toHaveProperty(
        'authors[0].label'
      )
    }
  })
})

describe('delete meta', () => {
  it('passes meta to beforeDelete and afterDelete', async () => {
    const seen: Array<Record<string, unknown> | undefined> = []
    const article = make({ title: 'ok' })

    class TrackedArticle extends SearchModel<TrackedArticle> {
      static readonly indexName = 'tracked_articles'

      @StringType({ required: true })
      title!: string

      protected async beforeDelete(event: DeleteEvent): Promise<void> {
        seen.push(event.meta)
      }

      protected async afterDelete(event: DeleteEvent): Promise<void> {
        seen.push(event.meta)
      }
    }

    const tracked = new TrackedArticle()
    tracked.id = 'tracked-1'
    tracked.title = 'ok'

    await tracked.delete({ wait: true, meta: { actor: { userId: 'u1' } } })

    expect(mockedSearch.searchRequest).toHaveBeenCalledWith(
      'DELETE',
      '/tracked_articles/_doc/tracked-1?refresh=wait_for'
    )
    expect(seen).toEqual([
      { actor: { userId: 'u1' } },
      { actor: { userId: 'u1' } },
    ])
    expect(article.id).toBe('article-1')
  })

  it('passes undefined meta when the caller omits it', async () => {
    const seen: Array<Record<string, unknown> | undefined> = []

    class PlainArticle extends SearchModel<PlainArticle> {
      static readonly indexName = 'plain_articles'

      @StringType({ required: true })
      title!: string

      protected async beforeDelete(event: DeleteEvent): Promise<void> {
        seen.push(event.meta)
      }
    }

    const plain = new PlainArticle()
    plain.id = 'plain-1'
    plain.title = 'ok'
    await plain.delete()
    expect(seen).toEqual([undefined])
  })

  it('does not delete when beforeDelete throws a ValidationError', async () => {
    class GuardedArticle extends SearchModel<GuardedArticle> {
      static readonly indexName = 'guarded_articles'

      @StringType({ required: true })
      title!: string

      protected async beforeDelete(): Promise<void> {
        throw new ValidationError({ id: 'Article is in use' })
      }
    }

    const guarded = new GuardedArticle()
    guarded.id = 'guarded-1'
    guarded.title = 'ok'
    mockedSearch.searchRequest.mockClear()

    await expect(guarded.delete()).rejects.toBeInstanceOf(ValidationError)
    expect(mockedSearch.searchRequest).not.toHaveBeenCalled()
  })
})
