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

        // Check for version conflict errors
        if (
          response.status === 409 &&
          errorBody.includes('version_conflict_engine_exception')
        ) {
          // Parse the error to extract version information if available
          let currentVersion: number | undefined
          let attemptedVersion: number | undefined

          try {
            const errorData = JSON.parse(errorBody)
            const error = errorData.error
            if (error && error.reason) {
              // Extract version numbers from error message if present
              const versionMatch = error.reason.match(
                /current version \[(\d+)\].*version \[(\d+)\]/
              )
              if (versionMatch) {
                currentVersion = parseInt(versionMatch[1], 10)
                attemptedVersion = parseInt(versionMatch[2], 10)
              }
            }
          } catch (e) {
            // Failed to parse error body, continue with generic version conflict
          }

          throw new VersionConflictError(
            'Document version conflict: another process has modified this document',
            currentVersion,
            attemptedVersion
          )
        }

        // Don't log 404 errors or 400 "already exists" errors as they're often expected
        const shouldLogError =
          response.status !== 404 &&
          !(
            response.status === 400 &&
            errorBody.includes('resource_already_exists_exception')
          )

        if (shouldLogError) {
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
        } else {
          // Log non-shouldLogError responses for debugging
          log('Elasticsearch non-error response:', {
            status: `${response.status} ${response.statusText}`,
            url,
            method,
            responsePreview: errorBody.substring(0, 200),
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
    options?: { version?: number }
  ): Promise<any> {
    // Add version parameters to URL if provided for optimistic locking
    let fullPath = path
    if (options?.version) {
      const separator = path.includes('?') ? '&' : '?'
      // Use external version type for proper version management
      fullPath = `${path}${separator}version=${options.version}&version_type=external`
    }

    return this.executeRequest(method, fullPath, data)
  }

  // Implementation
  async query<T extends any>(
    ModelClass:
      | string
      | ((new (data?: any) => T) & {
          indexName: string
          fromJSON: (data: any) => T
        }),
    terms: string[],
    options: { limit?: number; sort?: string; page?: number } = {}
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
    ModelClass: (new (data?: any) => T) & {
      indexName: string
      fromJSON: (data: any) => T
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
