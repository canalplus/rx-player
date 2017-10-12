declare module "object-assign" {
  // TODO Update when/if variadic types are possible with intersections
  function objectAssign<T, U>(target : T, source : U): T & U;
  function objectAssign<T, U, V>(
    target : T,
    source1 : U,
    source2 : V
  ) : T & U & V;
  function objectAssign<T, U, V, W>(
    target : T,
    source1 : U,
    source2 : V,
    source3 : W
  ) : T & U & V & W;
  function objectAssign<T, U, V, W, X>(
    target : T,
    source1 : U,
    source2 : V,
    source3 : W,
    source4 : X
  ) : T & U & V & W & X;
  function objectAssign<T, U, V, W, X, Y>(
    target : T,
    source1 : U,
    source2 : V,
    source3 : W,
    source4 : X,
    source5 : Y
  ) : T & U & V & W & Y;
  function objectAssign(target : object, ...sources : any[]) : any;
  export = objectAssign;
}
