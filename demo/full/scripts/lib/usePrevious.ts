import { useEffect, useRef } from "react";
/**
 * Custom hook to get the previous value of the input passed in param.
 * @param value the current value
 * @returns the previous value of the value passed in params
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}
