import log from "../../../log";
import arrayFindIndex from "../../../utils/array_find_index";
import PPromise from "../../../utils/promise";
import TaskCanceller, {
  CancellationError,
  CancellationSignal,
} from "../../../utils/task_canceller";

export default class PromisePrioritizer<T> {
  private _waitingQueue: Array<IPrioritizerTask<T>>;
  private _pendingTasks: Array<IPrioritizerTask<T>>;
  private _prioritySteps: IPrioritizerPrioritySteps;

  constructor({ prioritySteps }: IPrioritizerOptions) {
    this._waitingQueue = [];
    this._pendingTasks = [];
    this._prioritySteps = prioritySteps;

    if (this._prioritySteps.high >= this._prioritySteps.low) {
      throw new Error(
        "TS: the max high level priority should be given a lower" +
          "priority number than the min low priority."
      );
    }
  }

  private _getMinPendingPriority(): number | null {
    if (this._pendingTasks.length === 0) {
      return null;
    }
    return Math.min(...this._pendingTasks.map((t) => t.priority));
  }

  public create(
    promise: ITaskPromise<T>,
    priority: number,
    cancelSignal: CancellationSignal,
  ): Promise<T> {
    let newTask: IPrioritizerTask<T>;

    return new PPromise<T>((resolve, reject) => {
      const interrupter = new TaskCanceller();

      const clean = () => {
        unregisterCancelSignal();
        this._cleanUpTask(newTask d);
        this._loopThroughWaitingQueue();
      };
      const unregisterCancelSignal = cancelSignal.register(
        (cancellationError: CancellationError) => {
          this._cleanUpTask(newTask);
          this._loopThroughWaitingQueue();
          reject(cancellationError);
        }
      );

      const onResponse = (value: T) => {
        clean();
        resolve(value);
      };

      const onError = (err: unknown) => {
        clean();
        reject(err);
      };

      const trigger = () => {
        if (newTask.isFinished) {
          unregisterCancelSignal()
          return;
        }
        this._pendingTasks.push(newTask);
        newTask.promise(interrupter.signal).then(onResponse).catch(onError);
      };

      newTask = {
        isFinished: false,
        priority,
        trigger,
        promise,
        interrupter,
      };

      if (!this._canBeStartedNow(newTask)) {
        this._waitingQueue.push(newTask);
      } else {
        // We can start the task right away
        newTask.trigger();
        if (this._isRunningHighPriorityTasks()) {
          // Note: we want to begin interrupting low-priority tasks just
          // after starting the current one because the interrupting
          // logic can call external code.
          // This would mean re-entrancy, itself meaning that some weird
          // half-state could be reached unless we're very careful.
          // To be sure no harm is done, we put that code at the last
          // possible position.
          this._interruptCancellableTasks();
        }
      }
    });
  }


  private _cleanUpTask(task: IPrioritizerTask<T>): void {
    task.isFinished = true;
    this._onTaskEnd(task);
    const waitingQueueIndex = _findPromiseIndex(
      task.promise,
      this._waitingQueue
    );

    if (waitingQueueIndex >= 0) {
      // If it was still waiting for its turn
      this._waitingQueue.splice(waitingQueueIndex, 1);
    } else {
      // remove it from pending queue if in it
      const pendingTasksIndex = _findPromiseIndex(
        task.promise,
        this._pendingTasks
      );
      
      if (pendingTasksIndex < 0) {
        log.warn("TS: Cancelling non-existent task");
        return;
      }
      this._pendingTasks.splice(pendingTasksIndex, 1)
    }
  }
  public updatePriority(promise: ITaskPromise<T>, priority: number): void {
    const waitingQueueIndex = _findPromiseIndex(
      promise,
      this._waitingQueue
    );

    if (waitingQueueIndex >= 0) {
      // If it was still waiting for its turn
      const waitingQueueElt = this._waitingQueue[waitingQueueIndex];
      if (waitingQueueElt.priority === priority) {
        return;
      }

      waitingQueueElt.priority = priority;

      if (!this._canBeStartedNow(waitingQueueElt)) {
        return;
      }

      this._findAndRunWaitingQueueTask(waitingQueueIndex);

      if (this._isRunningHighPriorityTasks()) {
        // Re-check to cancel every "cancellable" pending task
        //
        // Note: We start the task before interrupting cancellable tasks on
        // purpose.
        // Because both `_findAndRunWaitingQueueTask` and
        // `_interruptCancellableTasks` can emit events and thus call external
        // code, we could retrieve ourselves in a very weird state at this point
        //
        // By starting the task first, we ensure that this is manageable:
        // `_getMinPendingPriority()` has already been updated to the right value at
        // the time we reached external code, the priority of the current
        // Task has just been updated, and `_interruptCancellableTasks`
        // will ensure that we're basing ourselves on the last `priority` value
        // each time.
        // Doing it in the reverse order is an order of magnitude more difficult
        // to write and to reason about.
        this._interruptCancellableTasks();
      }
      return;
    }
    const pendingTasksIndex = _findPromiseIndex(
      promise,
      this._pendingTasks
    );
    if (pendingTasksIndex < 0) {
      log.warn(
        "TS: request to update the priority of a non-existent task"
      );
      return;
    }

    const task = this._pendingTasks[pendingTasksIndex];
    if (task.priority === priority) {
      return;
    }

    const prevPriority = task.priority;
    task.priority = priority;
    if (this._getMinPendingPriority() === prevPriority) {
      this._loopThroughWaitingQueue();
    } else {
      // We updated a task which already had a priority value higher than the
      // minimum to a value still superior to the minimum. Nothing can happen.
      return;
    }

    if (this._isRunningHighPriorityTasks()) {
      // Always interrupt cancellable tasks after all other side-effects, to
      // avoid re-entrancy issues
      this._interruptCancellableTasks();
    }
  }

  private _getMinPriority(queue: IPrioritizerTask<T>[]): null | number {
    return queue.reduce((acc: number | null, elt) => {
      return acc === null || acc > elt.priority ? elt.priority : acc;
    }, null);
  }
  private _loopThroughWaitingQueue(): void {
    const minWaitingPriority = this._getMinPriority(this._waitingQueue);
    const minPendingPriority = this._getMinPendingPriority();
    if (
      minWaitingPriority === null ||
      (minPendingPriority !== null && minPendingPriority < minWaitingPriority)
    ) {
      return;
    }
    const priorityToCheck =
      minPendingPriority === null
        ? minWaitingPriority
        : Math.min(minPendingPriority, minWaitingPriority);
    
    let offset = 0 
    for (let i = 0; i < this._waitingQueue.length; i++) {
      const elt = this._waitingQueue[i];
      if (elt.priority <= priorityToCheck) {
        if (this._findAndRunWaitingQueueTask(i - offset)){
          offset++
        };
      }
    }
  }

  private _interruptCancellableTasks(): void {
    this._pendingTasks
      .filter((pendingTask) => pendingTask.priority >= this._prioritySteps.low)
      .forEach((task) => {
        this._interruptPendingTask(task);
        return this._interruptCancellableTasks();
      });
  }


  private _findAndRunWaitingQueueTask(index: number): boolean {
    if (index >= this._waitingQueue.length || index < 0){
      log.warn("TS : Tried to start a non existing task")
      return false
    }
    const task = this._waitingQueue.splice(index, 1)[0];
    task.trigger();
    return true
  }

  private _interruptPendingTask(task: IPrioritizerTask<T>): void {
    const pendingTasksIndex = _findPromiseIndex(
      task.promise,
      this._pendingTasks
    );
    if (pendingTasksIndex < 0) {
      log.warn(
        "TS: Interrupting a non-existent pending task. Aborting..."
      );
      return;
    }
    // Stop task and put it back in the waiting queue
    this._pendingTasks.splice(pendingTasksIndex, 1);
    this._waitingQueue.push(task);
    task.interrupter.cancel(); // Interrupt at last step because it calls external code
  }

  private _onTaskEnd(task: IPrioritizerTask<T>): void {
    const pendingTasksIndex = _findPromiseIndex(
      task.promise,
      this._pendingTasks
    );
    if (pendingTasksIndex < 0) {
      return; // Happen for example when the task has been interrupted
    }

    this._pendingTasks.splice(pendingTasksIndex, 1);

    if (this._pendingTasks.length > 0) {
      return;
    }

    this._loopThroughWaitingQueue();
  }

  private _canBeStartedNow(task: IPrioritizerTask<T>): boolean {
    const minPendingPriority = this._getMinPendingPriority();
    return minPendingPriority === null || task.priority <= minPendingPriority;
  }

  private _isRunningHighPriorityTasks(): boolean {
    const minPendingPriority = this._getMinPendingPriority();
    return (
      minPendingPriority !== null &&
      minPendingPriority <= this._prioritySteps.high
    );
  }
}

function _findPromiseIndex<T>(
  promise: ITaskPromise<T>,
  queue: IPrioritizerTask<T>[]
): number {
  return arrayFindIndex(queue, (elt) => elt.promise === promise);
}

type ITaskPromise<T> = (cancellationSignal: CancellationSignal) => Promise<T>;
interface IPrioritizerTask<T> {
  promise: ITaskPromise<T>;
  trigger: () => void;
  /** Priority of the task. Lower that number is, higher is the priority. */
  priority: number;
  /** `true` if the underlying wrapped promise is either errored or completed. */
  isFinished: boolean;
  interrupter: TaskCanceller;
}

export interface IPrioritizerPrioritySteps {
  low: number;
  high: number;
}



export interface IPrioritizerOptions {
  /** @see IPrioritizerPrioritySteps */
  prioritySteps: IPrioritizerPrioritySteps;
}
