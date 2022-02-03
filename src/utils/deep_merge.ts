/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import objectAssign from "./object_assign";

/**
 * Check if an item is an object
 * @param item
 * @returns {boolean}
 */
function isObject(item: unknown) : boolean {
  return (item !== null
          && item !== undefined
          && typeof item === "object"
          && !Array.isArray(item));
}

/**
 * Deeply merge nested objects
 * @param target
 * @param sources
 * @returns output : merged object
 */
export default function deepMerge(target: any, ...sources: any[]): any {
  if (sources.length === 0) {
    return target;
  }
  const source = sources.shift();
  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (target[key] === undefined) {
          objectAssign(target, { [key]: {} });
        }
        deepMerge(target[key], source[key]);
      } else {
        objectAssign(target, { [key]: source[key] });
      }
    }
  }
  return deepMerge(target, ...sources);
}
