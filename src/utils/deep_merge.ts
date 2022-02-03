
/**
 * Check if an item is an object
 * @param item 
 * @returns {boolean}
 */
function isObject(item: any) : boolean {
  return (item && typeof item === 'object' && !Array.isArray(item))
}

/**
 * Deeply merge nested objects
 * @param target 
 * @param sources 
 * @returns output : merged object
 */
export default function deepMerge(target: any, ...sources: any[]): object {
  if (sources.length == 0){
    return target
  }
  const source = sources.shift();
  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (target[key] === undefined) {
          Object.assign(target, { [key]: {} });
        }
        deepMerge(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }
  return deepMerge(target, ...sources);
}