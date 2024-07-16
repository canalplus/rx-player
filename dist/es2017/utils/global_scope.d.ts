/**
 * The current environment's global object, written in such a way to maximize
 * compatibility.
 *
 * Though the RxPlayer should theoretically not be runnable in NodeJS, we still
 * had to support it for some applications implementing server-side rendering.
 */
declare let globalScope: typeof globalThis;
export default globalScope;
//# sourceMappingURL=global_scope.d.ts.map