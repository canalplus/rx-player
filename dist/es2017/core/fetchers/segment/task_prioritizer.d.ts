import type { CancellationSignal } from "../../../utils/task_canceller";
export default class TaskPrioritizer<T> {
    /**
     * Priority of the most prioritary task currently running.
     * `null` if no task is currently running.
     */
    private _minPendingPriority;
    /** Queue of tasks currently waiting for more prioritary ones to finish. */
    private _waitingQueue;
    /** Tasks currently pending.  */
    private _pendingTasks;
    /** @see IPrioritizerPrioritySteps */
    private _prioritySteps;
    /**
     * @param {Options} prioritizerOptions
     */
    constructor({ prioritySteps }: IPrioritizerOptions);
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
    create(taskFn: ITaskFn<T>, priority: number, callbacks: ITaskPrioritizerCallbacks, cancelSignal: CancellationSignal): Promise<T>;
    private _endTask;
    /**
     * Update the priority of a promise given to the TaskPrioritizer.
     * @param {Object} promise
     * @param {number} priority
     */
    updatePriority(promise: ITaskFn<T>, priority: number): void;
    /**
     * Browse the current waiting queue and start all task in it that needs to be
     * started: start the ones with the lowest priority value below
     * `_minPendingPriority`.
     *
     * Private properties, such as `_minPendingPriority` are updated accordingly
     * while this method is called.
     */
    private _loopThroughWaitingQueue;
    /**
     * Interrupt and move back to the waiting queue all pending tasks that are
     * low priority (having a higher priority number than
     * `this._prioritySteps.low`).
     */
    private _interruptCancellableTasks;
    /**
     * Start task which is at the given index in the waiting queue.
     * The task will be removed from the waiting queue in the process.
     * @param {number} index
     */
    private _findAndRunWaitingQueueTask;
    /**
     * Move back pending task to the waiting queue and interrupt it.
     * @param {object} task
     */
    private _interruptPendingTask;
    /**
     * Return `true` if the given task can be started immediately based on its
     * priority.
     * @param {Object} task
     * @returns {boolean}
     */
    private _canBeStartedNow;
    /**
     * Returns `true` if any running task is considered "high priority".
     * returns `false` otherwise.
     * @returns {boolean}
     */
    private _isRunningHighPriorityTasks;
}
/**
 * Task function as given to the TaskPrioritizer.
 * The `CancellationSignal` given as argument should be used to directly
 * interrupt the task.
 *
 * A same task might be re-run multiple times.
 */
export type ITaskFn<T> = (cancellationSignal: CancellationSignal) => Promise<T>;
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
