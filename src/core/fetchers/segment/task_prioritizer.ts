import log from "../../../log";
import arrayFindIndex from "../../../utils/array_find_index";
import TaskCanceller, {
  CancellationError,
  CancellationSignal,
} from "../../../utils/task_canceller";

export default class TaskPrioritizer<T> {
  /**
   * Priority of the most prioritary task currently running.
   * `null` if no task is currently running.
   */
  private _minPendingPriority : number | null;
  /** Queue of tasks currently waiting for more prioritary ones to finish. */
  private _waitingQueue: Array<IPrioritizerTask<T>>;
  /** Tasks currently pending.  */
  private _pendingTasks: Array<IPrioritizerTask<T>>;
  /** @see IPrioritizerPrioritySteps */
  private _prioritySteps: IPrioritizerPrioritySteps;

  /**
   * @param {Options} prioritizerOptions
   */
  constructor({ prioritySteps }: IPrioritizerOptions) {
    this._minPendingPriority = null;
    this._waitingQueue = [];
    this._pendingTasks = [];
    this._prioritySteps = prioritySteps;

    if (this._prioritySteps.high >= this._prioritySteps.low) {
      throw new Error(
        "TP: the max high level priority should be given a lower" +
          "priority number than the min low priority."
      );
    }
  }

  /**
   * Create a priorized Promise from a base task.
   *
   * This task will immediately have its priority compared to all the
   * already-running ones created from this class.
   *
   * Only if this number is inferior or equal to the priority of the
   * minimum priority number of all currently-running tasks  will it be
   * immediately started.
   * In the opposite case, we will wait for higher-priority tasks to
   * finish before starting it.
   *
   * Note that while this task is waiting for its turn, it is possible
   * to update its property through the updatePriority method, by providing
   * the task again and its new priority number.
   *
   * @param {Function} taskFn
   * @param {number} priority
   * @param {Object} callbacks
   * @param {Object} cancelSignal
   * @returns {Promise}
   */
  public create(
    taskFn: ITaskFn<T>,
    priority: number,
    callbacks: ITaskPrioritizerCallbacks,
    cancelSignal: CancellationSignal
  ): Promise<T> {
    let newTask: IPrioritizerTask<T>;

    return new Promise<T>((resolve, reject) => {
      /** Function allowing to start the underlying Promise. */
      const trigger = () => {
        if (newTask.hasEnded) {
          unregisterCancelSignal();
          return;
        }

        const finishTask = () => {
          unlinkInterrupter();
          unregisterCancelSignal();
          this._endTask(newTask);
        };

        const onResolve = (value: T) => {
          callbacks.beforeEnded();
          finishTask();
          resolve(value);
        };

        const onReject = (err: unknown) => {
          finishTask();
          reject(err);
        };

        const interrupter =  new TaskCanceller();
        const unlinkInterrupter = interrupter.linkToSignal(cancelSignal);
        newTask.interrupter = interrupter;
        interrupter.signal.register(() => {
          newTask.interrupter = null;
          if (!cancelSignal.isCancelled()) {
            callbacks.beforeInterrupted();
          }
        });

        this._minPendingPriority = this._minPendingPriority === null ?
          newTask.priority :
          Math.min(this._minPendingPriority, newTask.priority);
        this._pendingTasks.push(newTask);

        newTask.taskFn(interrupter.signal)
          .then(onResolve)
          .catch((err) => {
            if (!cancelSignal.isCancelled() &&
                interrupter.isUsed() &&
                err instanceof CancellationError)
            {
              return;
            }
            onReject(err);
          });
      };

      const unregisterCancelSignal = cancelSignal.register(
        (cancellationError: CancellationError) => {
          this._endTask(newTask);
          reject(cancellationError);
        }
      );

      newTask = {
        hasEnded: false,
        priority,
        trigger,
        taskFn,
        interrupter: null,
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

  private _endTask(task: IPrioritizerTask<T>): void {
    task.hasEnded = true;
    const waitingQueueIndex = _findTaskIndex(task.taskFn, this._waitingQueue);
    if (waitingQueueIndex >= 0) {
      // If it was still waiting for its turn
      this._waitingQueue.splice(waitingQueueIndex, 1);
    } else {
      // remove it from pending queue if in it
      const pendingTasksIndex = _findTaskIndex(task.taskFn, this._pendingTasks);
      if (pendingTasksIndex < 0) {
        return;
      }
      this._pendingTasks.splice(pendingTasksIndex, 1);

      if (this._pendingTasks.length > 0) {
        if (this._minPendingPriority === task.priority) {
          this._minPendingPriority = Math.min(...this._pendingTasks.map(t => t.priority));
        }
      } else {
        this._minPendingPriority = null;
      }
      this._loopThroughWaitingQueue();
    }
  }

  /**
   * Update the priority of a promise given to the TaskPrioritizer.
   * @param {Object} promise
   * @param {number} priority
   */
  public updatePriority(promise: ITaskFn<T>, priority: number): void {
    const waitingQueueIndex = _findTaskIndex(promise, this._waitingQueue);

    if (waitingQueueIndex >= 0) { // If it was still waiting for its turn
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
    const pendingTasksIndex = _findTaskIndex(promise, this._pendingTasks);
    if (pendingTasksIndex < 0) {
      log.warn("TP: request to update the priority of a non-existent task");
      return;
    }

    const task = this._pendingTasks[pendingTasksIndex];
    if (task.priority === priority) {
      return;
    }

    const prevPriority = task.priority;
    task.priority = priority;

    if (this._minPendingPriority === null || priority < this._minPendingPriority) {
      this._minPendingPriority = priority;
    } else if (this._minPendingPriority === prevPriority) { // was highest priority
      if (this._pendingTasks.length === 1) {
        this._minPendingPriority = priority;
      } else {
        this._minPendingPriority = Math.min(...this._pendingTasks.map(t => t.priority));
      }
      this._loopThroughWaitingQueue();
    }

    if (this._isRunningHighPriorityTasks()) {
      // Always interrupt cancellable tasks after all other side-effects, to
      // avoid re-entrancy issues
      this._interruptCancellableTasks();
    }
  }

  /**
   * Browse the current waiting queue and start all task in it that needs to be
   * started: start the ones with the lowest priority value below
   * `_minPendingPriority`.
   *
   * Private properties, such as `_minPendingPriority` are updated accordingly
   * while this method is called.
   */
  private _loopThroughWaitingQueue(): void {
    const minWaitingPriority = this._waitingQueue.reduce((acc : number | null, elt) => {
      return acc === null || acc > elt.priority ? elt.priority :
                                                  acc;
    }, null);
    if (minWaitingPriority === null ||
        (this._minPendingPriority !== null &&
         this._minPendingPriority < minWaitingPriority))
    {
      return;
    }
    for (let i = 0; i < this._waitingQueue.length; i++) {
      const priorityToCheck = this._minPendingPriority === null ?
        minWaitingPriority :
        Math.min(this._minPendingPriority, minWaitingPriority);
      const elt = this._waitingQueue[i];
      if (elt.priority <= priorityToCheck) {
        this._findAndRunWaitingQueueTask(i);
        i--; // previous operation should have removed that element from the
             // the waiting queue
      }
    }
  }

  /**
   * Interrupt and move back to the waiting queue all pending tasks that are
   * low priority (having a higher priority number than
   * `this._prioritySteps.low`).
   */
  private _interruptCancellableTasks(): void {
    for (let i = 0; i < this._pendingTasks.length; i++) {
      const pendingObj = this._pendingTasks[i];
      if (pendingObj.priority >= this._prioritySteps.low) {
        this._interruptPendingTask(pendingObj);

        // The previous call could have a lot of potential side-effects.
        // It is safer to re-start the function to not miss any pending
        // task that needs to be cancelled.
        return this._interruptCancellableTasks();
      }
    }
  }

  /**
   * Start task which is at the given index in the waiting queue.
   * The task will be removed from the waiting queue in the process.
   * @param {number} index
   */
  private _findAndRunWaitingQueueTask(index: number): boolean {
    if (index >= this._waitingQueue.length || index < 0) {
      log.warn("TP : Tried to start a non existing task");
      return false;
    }
    const task = this._waitingQueue.splice(index, 1)[0];
    task.trigger();
    return true;
  }

  /**
   * Move back pending task to the waiting queue and interrupt it.
   * @param {object} task
   */
  private _interruptPendingTask(task: IPrioritizerTask<T>): void {
    const pendingTasksIndex = _findTaskIndex(task.taskFn, this._pendingTasks);
    if (pendingTasksIndex < 0) {
      log.warn("TP: Interrupting a non-existent pending task. Aborting...");
      return;
    }

    // Stop task and put it back in the waiting queue
    this._pendingTasks.splice(pendingTasksIndex, 1);
    this._waitingQueue.push(task);
    if (this._pendingTasks.length === 0) {
      this._minPendingPriority = null;
    } else if (this._minPendingPriority === task.priority) {
      this._minPendingPriority = Math.min(...this._pendingTasks.map(t => t.priority));
    }
    task.interrupter?.cancel(); // Interrupt at last step because it calls external code
  }

  /**
   * Return `true` if the given task can be started immediately based on its
   * priority.
   * @param {Object} task
   * @returns {boolean}
   */
  private _canBeStartedNow(task: IPrioritizerTask<T>): boolean {
    return this._minPendingPriority === null ||
           task.priority <= this._minPendingPriority;
  }

  /**
   * Returns `true` if any running task is considered "high priority".
   * returns `false` otherwise.
   * @returns {boolean}
   */
  private _isRunningHighPriorityTasks() : boolean {
    return this._minPendingPriority !== null &&
           this._minPendingPriority <= this._prioritySteps.high;
  }
}

/**
 * Simple utils function allowing to find a given task function in the given
 * `queue`.
 *
 * Returns `-1` if `taskFn` is not found.
 * @param {Function} taskFn
 * @param {Array.<Object>} queue
 * @returns {number}
 */
function _findTaskIndex<T>(
  taskFn: ITaskFn<T>,
  queue: Array<IPrioritizerTask<T>>
): number {
  return arrayFindIndex(queue, (elt) => elt.taskFn === taskFn);
}

/**
 * Task function as given to the TaskPrioritizer.
 * The `CancellationSignal` given as argument should be used to directly
 * interrupt the task.
 *
 * A same task might be re-run multiple times.
 */
export type ITaskFn<T> = (cancellationSignal: CancellationSignal) => Promise<T>;

/** Stored object representing a single task. */
interface IPrioritizerTask<T> {
  /**
   * Actual task called by the TaskPrioritizer, as well as the object used as an
   * identifier to update its priority.
   * This is the same task than the one the TaskPrioritizer is asked to run.
   */
  taskFn: ITaskFn<T>;
  /** Function allowing to start the task. */
  trigger: () => void;
  /** Priority of the task. Lower that number is, higher is the priority. */
  priority: number;
  /** `true` if the underlying wrapped promise is either errored or completed. */
  hasEnded: boolean;
  /**
   * Allows to temporarily cancel the task, for example due to changing
   * priorities.
   * It will then be possible to restart the task by calling `trigger` again.
   */
  interrupter: TaskCanceller | null;
}

/** Options to give to the `TaskPrioritizer`. */
export interface IPrioritizerOptions {
  /** @see IPrioritizerPrioritySteps */
  prioritySteps: IPrioritizerPrioritySteps;
}

/**
 * Define both the `low` and `high` priority steps:
 *
 *   - Any task with a priority number that is lower or equal to the
 *     `high` value will be a task with high priority.
 *
 *     When tasks with high priorities are scheduled, they immediately
 *     abort pending tasks with low priorities (which will have then to
 *     wait until all higher-priority task have ended before re-starting).
 *
 *   - Any task with a priority number that is higher or equal to the
 *     `low` value will be a task with low priority.
 *
 *     Pending tasks with low priorities have the added particularity*
 *     of being aborted as soon as a high priority task is scheduled.
 *
 *     * Other pending tasks are not aborted when a higher-priority
 *     task is scheduled, as their priorities only affect them before
 *     they are started (to know when to start them).
 */
export interface IPrioritizerPrioritySteps {
  low: number;
  high: number;
}

/**
 * Callbacks called by the `TaskPrioritizer` on various events associated to a
 * single task.
 */
export interface ITaskPrioritizerCallbacks {
  /**
   * Callback called just before the `TaskPrioritizer` temporarily cancels
   * a task, to prioritize higher-priority tasks.
   *
   * Interrupted tasks are restarted from scratch at a later time.
   */
  beforeInterrupted(): void;
  /**
   * Callback called when the task ended just before the `TaskPrioritizer`
   * chooses the next task(s) to run.
   *
   * You can use this callback to add yet other tasks just in time before the
   * `TaskPrioritizer` chooses the next one.
   */
  beforeEnded(): void;
}
