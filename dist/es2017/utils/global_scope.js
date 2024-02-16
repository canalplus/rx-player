import isNode from "./is_node";
import isWorker from "./is_worker";
/**
 * The current environment's global object, written in such a way to maximize
 * compatibility.
 *
 * Though the RxPlayer should theoretically not be runnable in NodeJS, we still
 * had to support it for some applications implementing server-side rendering.
 */
let globalScope;
if (isWorker) {
    globalScope = self;
}
else if (isNode) {
    globalScope = global;
}
else {
    globalScope = window;
}
export default globalScope;
