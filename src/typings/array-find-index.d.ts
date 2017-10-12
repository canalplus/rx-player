declare module "array-find-index" {
  function arrayFindIndex<T>(
    arr : T[],
    predicate : (arg: T) => boolean,
    thisArg? : any
  ) : number;

  export = arrayFindIndex;
}
