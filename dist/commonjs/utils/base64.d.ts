/**
 * Convert an array of bytes into a base64 string.
 * @param {Array.<number>|Uint8Array} bytes
 * @returns {string}
 */
export declare function bytesToBase64(bytes: number[] | Uint8Array): string;
/**
 * Convert a base64 string into the corresponding Uint8Array containing its
 * corresponding binary data.
 * /!\ Can throw if an invalid base64 string was given.
 * @param {Array.<number>|Uint8Array} bytes
 * @returns {string}
 */
export declare function base64ToBytes(str: string): Uint8Array;
