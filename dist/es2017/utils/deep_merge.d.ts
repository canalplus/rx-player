type ISourcesArgument = unknown[];
/**
 * Deeply merge nested objects
 * @param target
 * @param sources
 * @returns output : merged object
 */
export default function deepMerge<T extends Record<string | number | symbol, unknown>>(target: T, ...sources: ISourcesArgument): T;
export {};
