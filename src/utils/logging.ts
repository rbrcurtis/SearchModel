/**
 * Logging Library
 *
 * Provides timestamp-prefixed logging with debug tag support
 */

// ANSI color codes
const RESET = '\x1b[0m'
const YELLOW = '\x1b[33m'
const CYAN = '\x1b[36m'
const RED = '\x1b[31m'

/**
 * Get current time in Central timezone
 */
function getCentralTime(): string {
  const now = new Date()
  const centralTime = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now)

  return centralTime.replace(',', '')
}

/**
 * Get debug tags from environment
 */
function getDebugTags(): Set<string> {
  const tags = process.env.DEBUG_TAGS || ''
  return new Set(
    tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
  )
}

/**
 * Standard log with timestamp prefix
 */
export function log(message: string, ...args: any[]): void {
  // In testing environment, route through debug with 'test' tag
  if (process.env.TESTING === 'true') {
    debug('test', message, ...args)
    return
  }

  const timestamp = getCentralTime()
  // eslint-disable-next-line no-console
  console.log(`[${timestamp}] ${message}`, ...args)
}

/**
 * Error log with timestamp prefix
 */
export function logError(message: string, ...args: any[]): void {
  const timestamp = getCentralTime()
  const hasError = args.some((arg) => arg instanceof Error)

  // eslint-disable-next-line no-console
  console.error(`[${timestamp}] ${message}`, ...args)

  // If no Error object in args, print stack trace
  if (!hasError) {
    const trace = new Error('trace')
    // eslint-disable-next-line no-console
    console.error(trace.stack)
  }
}

/**
 * Warning log with yellow colored message
 */
export function logWarn(message: string, ...args: any[]): void {
  const timestamp = getCentralTime()
  // eslint-disable-next-line no-console
  console.log(`[${timestamp}] ${YELLOW}${message}${RESET}`, ...args)
}

/**
 * Debug log that only prints if tags match DEBUG_TAGS env var
 */
export function debug(
  tags: string | string[],
  message: string,
  ...args: any[]
): void {
  const debugTags = getDebugTags()

  // If no debug tags configured, don't log
  if (debugTags.size === 0) {
    return
  }

  // Check if wildcard is enabled
  if (debugTags.has('*')) {
    const timestamp = getCentralTime()
    // eslint-disable-next-line no-console
    console.log(`[${timestamp}] ${CYAN}${message}${RESET}`, ...args)
    return
  }

  // Convert tags to array if string
  const tagArray = Array.isArray(tags) ? tags : [tags]

  // Check if any tag matches
  const shouldLog = tagArray.some((tag) => debugTags.has(tag))

  if (shouldLog) {
    const timestamp = getCentralTime()
    // eslint-disable-next-line no-console
    console.log(`[${timestamp}] ${CYAN}${message}${RESET}`, ...args)
  }
}
