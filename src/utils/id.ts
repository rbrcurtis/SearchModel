import ObjectID from 'bson-objectid'

/**
 * Generate a new ObjectID in string format
 * Uses MongoDB's BSON ObjectID format which provides:
 * - 24-character hexadecimal string
 * - Globally unique across distributed systems
 * - Contains timestamp information
 * - Sortable by creation time
 *
 * @returns A new ObjectID as a string
 */
export function id(): string {
  return new ObjectID().toHexString()
}
