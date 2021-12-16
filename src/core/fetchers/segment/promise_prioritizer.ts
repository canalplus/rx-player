import log from "../../../log";
import arrayFindIndex from "../../../utils/array_find_index";
import PPromise from "../../../utils/promise";
import {
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
        "FP Error: the max high level priority should be given a lower" +
          "priority number than the min low priority."
      );
    }
  }

  private get _minPendingPriority(): number | null {
    if (this._pendingTasks.length === 0) {
      return null;
    }
    return Math.min(...this._pendingTasks.map((t) => t.priority));
  }

  public create(
    promise: () => Promise<T>,
    priority: number,
    cancellationSignal: CancellationSignal
  ) {
    let newTask: IPrioritizerTask<T>;
    return new PPromise<T>((resolve, reject) => {
      const unregisterCancelSignal = cancellationSignal.register(
        (cancellationError: CancellationError) => {
          // cancel task if running, remove from all queues etc.
          this._cleanUpTask(newTask);
          reject(cancellationError);
        }
      );

      const onResponse = (value: T) => {
        unregisterCancelSignal();
        resolve(value);
      };

      const onError = (err: unknown) => {
        unregisterCancelSignal();
        reject(err);
      };

      const trigger = (shouldRun: boolean) => {
        if (!shouldRun) return;
        this._pendingTasks.push(newTask);
        newTask
          .promise()
          .then(onResponse)
          .catch(onError)
          .finally(() => {
            this._cleanUpTask(newTask);
          });
      };
      newTask = {
        finished: false,
        priority,
        trigger,
        promise,
      };

      if (!this._canBeStartedNow(newTask)) {
        this._waitingQueue.push(newTask);
      } else {
        newTask.trigger(true);
        if (this._isRunningHighPriorityTasks()) {
          // Note: we want to begin interrupting low-priority tasks just
          // after starting the current one because the interrupting
          // logic can call external code.
          // This would mean re-entrancy, itself meaning that some weird
          // half-state could be reached unless we're very careful.
          // To be sure no harm is done, we put that code at the last
          // possible position (the previous Observable sould be
          // performing all its initialization synchronously).
          this._interruptCancellableTasks();
        }
      }
    });
  }

  private _findPromiseIndex(
    promise: () => Promise<T>,
    queue: IPrioritizerTask<T>[]
  ): number {
    return arrayFindIndex(queue, (elt) => elt.promise === promise);
  }

  private _cleanUpTask(task: IPrioritizerTask<T>): void {
    task.finished = true;
    this._onTaskEnd(task);
    const waitingQueueIndex = this._findPromiseIndex(
      task.promise,
      this._waitingQueue
    );

    if (waitingQueueIndex >= 0) {
      // If it was still waiting for its turn
      this._waitingQueue.splice(waitingQueueIndex, 1);
    } else {
      // remove it from pending queue if in it
      const pendingTasksIndex = this._findPromiseIndex(
        task.promise,
        this._pendingTasks
      );
      if (pendingTasksIndex < 0) {
        log.warn("cancelling non-existent task");
        return;
      }
      this._loopThroughWaitingQueue();
    }
  }
  public updatePriority(promise: () => Promise<T>, priority: number): void {
    const waitingQueueIndex = this._findPromiseIndex(
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

      this._startWaitingQueueTask(waitingQueueIndex);

      if (this._isRunningHighPriorityTasks()) {
        // Re-check to cancel every "cancellable" pending task
        //
        // Note: We start the task before interrupting cancellable tasks on
        // purpose.
        // Because both `_startWaitingQueueTask` and
        // `_interruptCancellableTasks` can emit events and thus call external
        // code, we could retrieve ourselves in a very weird state at this point
        // (for example, the different Observable priorities could all be
        // shuffled up, new Observables could have been started in the
        // meantime, etc.).
        //
        // By starting the task first, we ensure that this is manageable:
        // `_minPendingPriority` has already been updated to the right value at
        // the time we reached external code, the priority of the current
        // Observable has just been updated, and `_interruptCancellableTasks`
        // will ensure that we're basing ourselves on the last `priority` value
        // each time.
        // Doing it in the reverse order is an order of magnitude more difficult
        // to write and to reason about.
        this._interruptCancellableTasks();
      }
      return;
    }
    const pendingTasksIndex = this._findPromiseIndex(
      promise,
      this._pendingTasks
    );
    if (pendingTasksIndex < 0) {
      log.warn("FP: request to update the priority of a non-existent task");
      return;
    }

    const task = this._pendingTasks[pendingTasksIndex];
    if (task.priority === priority) {
      return;
    }

    const prevPriority = task.priority;
    task.priority = priority;
    if (this._minPendingPriority === prevPriority) {
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
    if (
      minWaitingPriority === null ||
      (this._minPendingPriority !== null &&
        this._minPendingPriority < minWaitingPriority)
    ) {
      return;
    }
    const priorityToCheck =
      this._minPendingPriority === null
        ? minWaitingPriority
        : Math.min(this._minPendingPriority, minWaitingPriority);
    for (let i = 0; i < this._waitingQueue.length; i++) {
      const elt = this._waitingQueue[i];
      if (elt.priority <= priorityToCheck) {
        this._startWaitingQueueTask(i);
        i--; // previous operation should have removed that element from the
        // the waiting queue
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

  private _startWaitingQueueTask(index: number): void {
    const task = this._waitingQueue.splice(index, 1)[0];
    task.trigger(true);
  }

  private _interruptPendingTask(task: IPrioritizerTask<T>): void {
    const pendingTasksIndex = this._findPromiseIndex(
      task.promise,
      this._pendingTasks
    );
    if (pendingTasksIndex < 0) {
      log.warn("FP: Interrupting a non-existent pending task. Aborting...");
      return;
    }

    // Stop task and put it back in the waiting queue
    this._pendingTasks.splice(pendingTasksIndex, 1);
    this._waitingQueue.push(task);
    task.trigger(false); // Interrupt at last step because it calls external code
  }

  private _onTaskEnd(task: IPrioritizerTask<T>): void {
    const pendingTasksIndex = this._findPromiseIndex(
      task.promise,
      this._pendingTasks
    );
    if (pendingTasksIndex < 0) {
      return; // Happen for example when the task has been interrupted
    }

    this._pendingTasks.splice(pendingTasksIndex, 1);

    if (this._pendingTasks.length > 0) {
      return; // still waiting for Observables to finish
    }

    this._loopThroughWaitingQueue();
  }

  private _canBeStartedNow(task: IPrioritizerTask<T>): boolean {
    return (
      this._minPendingPriority === null ||
      task.priority <= this._minPendingPriority
    );
  }

  private _isRunningHighPriorityTasks(): boolean {
    return (
      this._minPendingPriority !== null &&
      this._minPendingPriority <= this._prioritySteps.high
    );
  }
}

interface IPrioritizerTask<T> {
  promise: () => Promise<T>;
  trigger: (shouldRun: boolean) => void;
  /** Priority of the task. Lower that number is, higher is the priority. */
  priority: number;
  /** `true` if the underlying wrapped Observable either errored of completed. */
  finished: boolean;
}

export interface IPrioritizerPrioritySteps {
  low: number;
  high: number;
}

export interface IPrioritizerOptions {
  /** @see IPrioritizerPrioritySteps */
  prioritySteps: IPrioritizerPrioritySteps;
}
