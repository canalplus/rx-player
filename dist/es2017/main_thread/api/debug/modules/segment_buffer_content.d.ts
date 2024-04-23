import type { IBufferType } from "../../../../core/types";
import type { CancellationSignal } from "../../../../utils/task_canceller";
import type RxPlayer from "../../public_api";
export default function createSegmentSinkGraph(instance: RxPlayer, bufferType: IBufferType, title: string, parentElt: HTMLElement, cancelSignal: CancellationSignal): HTMLElement;
