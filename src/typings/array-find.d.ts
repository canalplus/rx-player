declare module "array-find" {
  function arrayFind<T>(
    arr : T[],
    predicate : (arg: T) => boolean,
    thisArg? : any
  ) : T;

  export = arrayFind;
}
