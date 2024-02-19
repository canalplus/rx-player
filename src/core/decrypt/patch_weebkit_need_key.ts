export interface WebkitNeedKeyEvent extends Event {
  initData: Uint8Array;
  type: "webkitneedkey";
}

export function convertWebkitNeedKeyEvent(
  event: WebkitNeedKeyEvent
): MediaEncryptedEvent {
  const { initData } = event;
  return {
    initData: convertWebkitInitData(initData),
    initDataType: "skd",
  } as MediaEncryptedEvent;
}

export function convertWebkitInitData(initData: Uint8Array): ArrayBuffer {
  const lengthTrimmed = initData.slice(4);
  const length = lengthTrimmed.length / 2;
  const dataview = new DataView(lengthTrimmed.buffer);
  const arr = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    arr[i] = dataview.getUint16(i * 2, true);
  }
  return arr.buffer;
}
