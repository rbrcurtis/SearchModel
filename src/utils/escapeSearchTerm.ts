/**
 * Characters the Elasticsearch / Lucene `query_string` parser treats as syntax
 * rather than text. Any of these reaching the parser unescaped lets the caller
 * close the surrounding clause and add their own (`" OR _id:*`, `|| name:x`).
 */
const QUERY_STRING_SPECIAL_CHARS = /([+\-=&|><!(){}[\]^"~*?:\\/])/g

/**
 * Escape user-supplied text so it can be interpolated into a `query_string`
 * clause as a literal.
 *
 * Whitespace is deliberately left alone: callers rely on spaces separating
 * words inside their own wildcards (`title:*foo bar*`), and the parser already
 * treats a bare space as an implicit operator.
 *
 * Quote this around any value that comes from a request before building a term:
 *
 *     Presentation.find([`(title:*${escapeSearchTerm(q)}*)`])
 *
 * Values the application itself constructs (`eventId:${event.id}`,
 * `state:accepted`) must not be escaped — they are intentional syntax.
 */
export function escapeSearchTerm(value: string): string {
  return value.replace(QUERY_STRING_SPECIAL_CHARS, '\\$1')
}
