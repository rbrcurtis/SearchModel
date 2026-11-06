import { escapeSearchTerm } from '../escapeSearchTerm'

describe('escapeSearchTerm', () => {
  it('leaves plain text untouched', () => {
    expect(escapeSearchTerm('berks.accordyx')).toBe('berks.accordyx')
    expect(escapeSearchTerm('women historians')).toBe('women historians')
    expect(escapeSearchTerm('history2027')).toBe('history2027')
  })

  it('escapes quote breaks so a caller cannot close the clause', () => {
    expect(escapeSearchTerm('x" || _id:* || domains:"y')).toBe(
      'x\\" \\|\\| _id\\:\\* \\|\\| domains\\:\\"y'
    )
  })

  it('escapes symbol operators, which is what breaks out of a clause', () => {
    expect(escapeSearchTerm('a || b')).toBe('a \\|\\| b')
    expect(escapeSearchTerm('a && b')).toBe('a \\&\\& b')
  })

  it('escapes wildcards and grouping so wildcards stay where the caller put them', () => {
    expect(escapeSearchTerm('*')).toBe('\\*')
    expect(escapeSearchTerm('a)b(c')).toBe('a\\)b\\(c')
    expect(escapeSearchTerm('-sourceStatus:inactive')).toBe(
      '\\-sourceStatus\\:inactive'
    )
  })

  it('escapes backslashes and slashes', () => {
    expect(escapeSearchTerm('a\\b')).toBe('a\\\\b')
    expect(escapeSearchTerm('a/b')).toBe('a\\/b')
  })

  it('keeps a hostname usable as a literal', () => {
    expect(escapeSearchTerm('berks.accordyx.com')).toBe('berks.accordyx.com')
  })
})
