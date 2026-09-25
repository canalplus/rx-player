const EMPTY_CHILD_ARRAY: unknown[] = [];
Object.freeze(EMPTY_CHILD_ARRAY);

/** Return the same empty array until a parser actually adds a child to it. */
export function emptyChildArray<T>(): T[] {
  return EMPTY_CHILD_ARRAY as T[];
}

/** Replace the shared empty array on first use, then append the child. */
export function pushChild<T>(children: object, key: string, child: T): void {
  const childrenRecord = children as Record<string, unknown>;
  let childArray = childrenRecord[key] as T[];
  if (childArray === EMPTY_CHILD_ARRAY) {
    childArray = [];
    childrenRecord[key] = childArray;
  }
  childArray.push(child);
}
