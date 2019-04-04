/**
 * Reduce Document children to a specific object
 * @param {*} root
 * @param {*} fn
 * @param {*} init
 */
export default function reduceChildren(
  root, fn, init) {
  let node = root.firstChild;
  let r = init;
  while (node) {
    r = fn(r, node.nodeName, node);
    node = node.nextSibling;
  }
  return r;
}