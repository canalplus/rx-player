import { useEffect, useState } from "react";
import type { Module } from "./declareModule";

export default function useModuleState<
  TStateObject extends object,
  K extends keyof TStateObject,
>(modul: Module<TStateObject, unknown>, stateName: K): TStateObject[K] {
  const [value, setValue] = useState(modul.getState(stateName));
  useEffect(() => {
    setValue(modul.getState(stateName));
    const stopListening = modul.listenToState(stateName, (newVal: TStateObject[K]) =>
      setValue(newVal),
    );
    return stopListening;
  }, [modul]);
  return value;
}
