import type { IMainThreadMessage } from "../../multithread_types";
export default function sendMessage(worker: Worker, msg: IMainThreadMessage, transferables?: Transferable[]): void;
