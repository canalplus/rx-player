export function bytesToStr(bytes) {
  return String.fromCharCode.apply(null, bytes);
}

export function strToBytes(str) {
  const len = str.length;
  const arr = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    arr[i] = str.charCodeAt(i) & 0xFF;
  }
  return arr;
}

export function bytesToUTF16Str(bytes) {
  let str = "";
  const len = bytes.length;
  for (let i = 0; i < len; i += 2) {
    str += String.fromCharCode(bytes[i]);
  }
  return str;
}
