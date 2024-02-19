import { convertWebkitInitData } from "../../patch_weebkit_need_key";

describe(`it should convert initData from webkitneedkey event to the initData from
 encrypted event(EME 2013 to modern EME)`, () => {
  it("should convert from Uint8 to ArrayBuffer", () => {
    const needKeyInitData = new Uint8Array([
      94, 0, 0, 0, 115, 0, 107, 0, 100, 0, 58, 0, 47, 0, 47, 0, 108, 0, 105, 0, 118, 0,
      101, 0, 47, 0, 55, 0, 51, 0, 100, 0, 48, 0, 50, 0, 52, 0, 55, 0, 53, 0, 45, 0, 54,
      0, 52, 0, 51, 0, 52, 0, 45, 0, 52, 0, 50, 0, 100, 0, 100, 0, 45, 0, 56, 0, 101, 0,
      50, 0, 102, 0, 45, 0, 56, 0, 51, 0, 52, 0, 56, 0, 52, 0, 56, 0, 98, 0, 52, 0, 99, 0,
      48, 0, 56, 0, 101, 0,
    ]);
    const keyId = "skd://live/73d02475-6434-42dd-8e2f-834848b4c08e";
    const patched = convertWebkitInitData(needKeyInitData);
    expect(patched).toBeInstanceOf(ArrayBuffer);
    expect(arrayBufferToString(patched)).toStrictEqual(keyId);
  });
});

function arrayBufferToString(buffer: ArrayBuffer) {
  let str = "";
  const array = new Uint8Array(buffer);
  for (let i = 0; i < array.length; i++) {
    str += String.fromCharCode(array[i]);
  }
  return str;
}
