import 'dotenv/config'
import { debug, logError, logWarn, log } from '../utils/logging'

interface SearchConfig {
  baseUrl: string
  maxRetries: number
  baseDelayMs: number
  maxDelayMs: number
}

interface RetryOptions {
  attempt: number
  maxRetries: number
  baseDelayMs: number
  maxDelayMs: number
}

export class SearchError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message)
    this.name = 'SearchError'
  }
}

export class VersionConflictError extends SearchError {
  constructor(
    message: string,
    public currentVersion?: number,
    public attemptedVersion?: number
  ) {
    super(message, 409)
    this.name = 'VersionConflictError'
  }
}

class SearchService {
  private config: SearchConfig | undefined

  private getConfig(): SearchConfig {
    if (!this.config) {
      if (!process.env.ELASTICSEARCH_URL) {
        throw new Error('ELASTICSEARCH_URL environment variable is required')
      }

      this.config = {
        baseUrl: process.env.ELASTICSEARCH_URL,
        maxRetries: 3,
        baseDelayMs: 1000,
        maxDelayMs: 30000,
      }
    }
    return this.config
  }

  // Reset config for testing
  _resetConfig(): void {
    this.config = undefined
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private calculateDelay({
    attempt,
    baseDelayMs,
    maxDelayMs,
  }: RetryOptions): number {
    const exponentialDelay = baseDelayMs * Math.pow(2, attempt - 1)
    const jitter = Math.random() * 0.1 * exponentialDelay
    return Math.min(exponentialDelay + jitter, maxDelayMs)
  }

  private async executeRequest(
    method: string,
    path: string,
    data?: any,
    attempt = 1
  ): Promise<any> {
    const config = this.getConfig()
    const url = `${config.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`

    const options: RequestInit = {
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
      },
    }

    if (data && !['GET', 'HEAD'].includes(method.toUpperCase())) {
      options.body = JSON.stringify(data)
    }

    debug('elasticsearch', `[search.executeRequest] Making HTTP request`, {
      url,
      method,
      body: options.body,
      headers: options.headers,
    })

    try {
      const response = await fetch(url, options)

      debug('elasticsearch', `[search.executeRequest] Got HTTP response`, {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      })

      if (response.status === 429 && attempt <= config.maxRetries) {
        const delayMs = this.calculateDelay({
          attempt,
          maxRetries: config.maxRetries,
          baseDelayMs: config.baseDelayMs,
          maxDelayMs: config.maxDelayMs,
        })

        logWarn(
          `Rate limited (429). Retrying in ${delayMs}ms... (attempt ${attempt}/${config.maxRetries})`
        )
        await this.delay(delayMs)
        return this.executeRequest(method, path, data, attempt + 1)
      }

      if (!response.ok) {
        const errorBody = await response.text()

        if (response.status === 409) {
          let currentVersion: number | undefined
          let attemptedVersion: number | undefined

          try {
            const errorData = JSON.parse(errorBody)
            const error = errorData.error
            if (error && error.reason) {
              const versionMatch = error.reason.match(
                /current version \[(\d+)\].*version \[(\d+)\]/
              )
              if (versionMatch) {
                currentVersion = parseInt(versionMatch[1], 10)
                attemptedVersion = parseInt(versionMatch[2], 10)
              }
            }
          } catch {
          }

          throw new VersionConflictError(
            'Document version conflict: another process has modified this document',
            currentVersion,
            attemptedVersion
          )
        }

        // Don't log 404 errors or 400 "already exists" errors as they're often expected
        const isExpectedError =
          response.status === 404 ||
          (response.status === 400 &&
            errorBody.includes('resource_already_exists_exception'))

        if (isExpectedError) {
          // Log expected responses for debugging
          log('Elasticsearch expected response:', {
            status: `${response.status} ${response.statusText}`,
            url,
            method,
            responsePreview: errorBody.substring(0, 200),
          })
        } else {
          logError('Elasticsearch Error Details:', {
            status: `${response.status} ${response.statusText}`,
            url,
            method,
            response: errorBody,
            requestBody:
              data && !['GET', 'HEAD'].includes(method.toUpperCase())
                ? JSON.stringify(data, null, 2)
                : undefined,
          })
        }

        throw new SearchError(
          `Search request failed: ${response.status} ${response.statusText}`,
          response.status,
          errorBody
        )
      }

      return await response.json()
    } catch (error) {
      if (error instanceof SearchError) {
        throw error
      }

      if (attempt <= config.maxRetries) {
        const delayMs = this.calculateDelay({
          attempt,
          maxRetries: config.maxRetries,
          baseDelayMs: config.baseDelayMs,
          maxDelayMs: config.maxDelayMs,
        })

        logWarn(
          `Request failed: ${error}. Retrying in ${delayMs}ms... (attempt ${attempt}/${config.maxRetries})`
        )
        await this.delay(delayMs)
        return this.executeRequest(method, path, data, attempt + 1)
      }

      throw new SearchError(
        `Search request failed after ${config.maxRetries} retries: ${error}`,
        undefined,
        error
      )
    }
  }

  async searchRequest(
    method: string,
    path: string,
    data?: any,
    options?: { version?: number; ifSeqNo?: number; ifPrimaryTerm?: number }
  ): Promise<any> {
    let fullPath = path
    if (options?.version) {
      const separator = fullPath.includes('?') ? '&' : '?'
      fullPath = `${fullPath}${separator}version=${options.version}&version_type=external`
    }
    if (options?.ifSeqNo !== undefined && options.ifPrimaryTerm !== undefined) {
      const separator = fullPath.includes('?') ? '&' : '?'
      fullPath = `${fullPath}${separator}if_seq_no=${options.ifSeqNo}&if_primary_term=${options.ifPrimaryTerm}`
    }

    return this.executeRequest(method, fullPath, data)
  }

  // Implementation
  async query<T extends any>(
    ModelClass:
      | string
      | ((new (data?: Partial<T>) => T) & {
          indexName: string
          fromJSON: (data: Partial<T>) => T
        }),
    terms: string[],
    options: { limit?: number; sort?: string | Record<string, unknown>[]; page?: number } = {}
  ): Promise<{ hits: T[]; total: number }> {
    let indexName: string
    let isModelClass = false

    if (typeof ModelClass === 'string') {
      indexName = ModelClass
    } else {
      indexName = (ModelClass as any).indexName
      isModelClass = true
      if (!indexName) {
        throw new SearchError(`IndexName not defined for ${ModelClass.name}`)
      }
    }

    const { limit = 1000, sort, page } = options

    const searchBody: any = {
      query: {
        bool: {
          must: terms.map((term) => ({
            query_string: {
              query: term,
              default_operator: 'AND',
            },
          })),
        },
      },
      size: limit,
    }

    if (sort) {
      if (Array.isArray(sort)) {
        // Raw ES sort array — pass through directly
        searchBody.sort = sort
      } else {
        // Handle sort format: "field:order" or just "field"
        let fieldName = sort
        let sortOrder = 'asc'

        if (sort.includes(':')) {
          const [field, order] = sort.split(':')
          fieldName = field
          sortOrder = order === 'desc' ? 'desc' : 'asc'
        }

        searchBody.sort = [{ [fieldName]: { order: sortOrder } }]
      }
    }

    if (page && page > 1) {
      searchBody.from = (page - 1) * limit
    }

    try {
      const response = await this.searchRequest(
        'POST',
        `/${indexName}/_search`,
        searchBody
      )

      debug('elasticsearch', 'query response', response)

      const total = response.hits?.total?.value ?? response.hits?.total ?? 0

      debug('elasticsearch', 'total', total)

      if (isModelClass) {
        const hits =
          response.hits?.hits?.map((hit: any) =>
            (ModelClass as any).fromJSON({
              id: hit._id,
              ...hit._source,
            })
          ) || []
        return { hits, total }
      } else {
        const hits = response.hits?.hits?.map((hit: any) => hit._source) || []
        return { hits, total }
      }
    } catch (error) {
      if (error instanceof SearchError && error.statusCode === 404) {
        debug(
          'search',
          `Index ${indexName} not found (404), returning empty results`
        )
        return { hits: [], total: 0 }
      }
      throw error
    }
  }

  async getById<T extends any>(
    ModelClass: (new (data?: Partial<T>) => T) & {
      indexName: string
      fromJSON: (data: Partial<T>) => T
    },
    id: string
  ): Promise<T | null> {
    const indexName = (ModelClass as any).indexName
    if (!indexName) {
      throw new SearchError(`IndexName not defined for ${ModelClass.name}`)
    }

    try {
      const response = await this.searchRequest(
        'GET',
        `/${indexName}/_doc/${id}`
      )
      if (response.found) {
        return (ModelClass as any).fromJSON({
          id: response._id,
          ...response._source,
          version: response._version ?? response._source?.version,
          _sequenceNumber: response._seq_no,
          _primaryTerm: response._primary_term,
        })
      }
      return null
    } catch (error) {
      if (error instanceof SearchError && error.statusCode === 404) {
        debug(
          'search',
          `Document ${id} not found in index ${indexName} (404), returning null`
        )
        return null
      }
      throw error
    }
  }
}

// Export a singleton instance
export const search = new SearchService()
