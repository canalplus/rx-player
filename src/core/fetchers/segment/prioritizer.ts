/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  concat as observableConcat,
  defer as observableDefer,
  EMPTY,
  merge as observableMerge,
  Observable,
  of as observableOf,
  Subject,
} from "rxjs";
import {
  finalize,
  map,
  startWith,
  switchMap,
} from "rxjs/operators";
import log from "../../../log";
import arrayFindIndex from "../../../utils/array_find_index";

/**
 * Event sent when the corresponding task is a low-priority task that has just
 * been temporarly interrupted due to another task with a high priority.
 * The task will restart (from scratch) when tasks with more priority are
 * finished.
 */
export interface IInterruptedTaskEvent { type : "interrupted"; }

/** Event sent when the corresponding task emit an event. */
export interface ITaskDataEvent<T> { type : "data";
                                     value : T; }

/**
 * Event sent when the corresponding task has ended (it will then complete).
 * You can use this event to schedule another task you wanted to perform after
 * that one.
 */
export interface IEndedTaskEvent { type : "ended"; }

/** Events sent when a task has been created through the `create` method. */
export type ITaskEvent<T> = IInterruptedTaskEvent |
                            ITaskDataEvent<T> |
                            IEndedTaskEvent;

/** Stored object representing a single task. */
interface IPrioritizerTask<T> {
  /** Task to run. */
  observable : Observable<ITaskEvent<T>>;
  /**
   * Subject used to start and interrupt a task:
   *   - when `true` is emitted the task should be started
   *   - when `false` is emitted, the task should be interrupted
   */
  trigger : Subject<boolean>;
  /** Priority of the task. Lower that number is, higher is the priority. */
  priority : number;
}

/** Options to give to the ObservablePrioritizer. */
export interface IPrioritizerOptions {
  /** @see IPrioritizerPrioritySteps */
  prioritySteps : IPrioritizerPrioritySteps;
}

/**
 * Define both the `low` and `high` priority steps:
 *
 *   - Any Observable with a priority number that is lower or equal to the
 *     `high` value will be an Observable with high priority.
 *
 *     When Observables with high priorities are scheduled, they immediately
 *     abort pending Observables with low priorities (which will have then to
 *     wait until all higher-priority Observable have ended before re-starting).
 *
 *   - Any Observable with a priority number that is higher or equal to the
 *     `low` value will be an Observable with low priority.
 *
 *     Pending Observables with low priorities have the added particularity*
 *     of being aborted as soon as a high priority Observable is scheduled.
 *
 *     * Other pending Observables are not aborted when a higher-priority
 *     Observable is scheduled, as their priorities only affect them before
 *     they are started (to know when to start them).
 */
export interface IPrioritizerPrioritySteps {
  low : number;
  high : number;
}

/**
 * Create Observables which can be priorized between one another.
 *
 * With this class, you can link an Observables to a priority number.
 * The lower this number is, the more priority the resulting Observable will
 * have.
 *
 * Such returned Observables - called "tasks" - will then basically wait for
 * pending task with more priority (i.e. a lower priority number) to finish
 * before "starting".
 *
 * This only applies for non-pending tasks. For pending tasks, those are usually
 * not interrupted except in the following case:
 *
 * When a task with a "high priority" (which is a configurable priority
 * value) is created, pending tasks with a "low priority" (also configurable)
 * will be interrupted. Those tasks will be restarted when all tasks with a
 * higher priority are finished.
 *
 * You can also update the priority of an already-created task.
 *
 * ```js
 * const observable1 = Observable.timer(100).pipe(mapTo(1));
 * const observable2 = Observable.timer(100).pipe(mapTo(2));
 * const observable3 = Observable.timer(100).pipe(mapTo(3));
 * const observable4 = Observable.timer(100).pipe(mapTo(4));
 * const observable5 = Observable.timer(100).pipe(mapTo(5));
 *
 * // Instanciate ObservablePrioritizer.
 * // Also provide a `high` priority step - the maximum priority number a "high
 * // priority task" has and a `low` priority step - the minimum priority number
 * // a "low priority task" has.
 * const prioritizer = new ObservablePrioritizer({
 *   prioritySteps: { high: 0, low: 20 }
 * });
 *
 * const pObservable1 = prioritizer.create(observable1, 4);
 * const pObservable2 = prioritizer.create(observable2, 2);
 * const pObservable3 = prioritizer.create(observable3, 1);
 * const pObservable4 = prioritizer.create(observable4, 3);
 * const pObservable5 = prioritizer.create(observable5, 2);
 *
 * // start every Observables at the same time
 * observableMerge(
 *   pObservable1,
 *   pObservable2,
 *   pObservable3,
 *   pObservable4,
 *   pObservable5
 * ).subscribe((evt) => {
 *   if (evt.type === "data") {
 *     console.log(i);
 *
 *     // To spice things up, update pObservable1 priority to go before
 *     // pObservable4
 *     if (i === 5) { // if pObservable5 is currently emitting
 *       prioritizer.updatePriority(pObservable1, 1);
 *     }
 *   }
 * });
 *
 * // Result:
 * // 3
 * // 2
 * // 5
 * // 1
 * // 4
 *
 * // Note: here "1" goes before "4" only because the former's priority has been
 * // updated before the latter was started.
 * // It would be the other way around if not.
 * ```
 *
 * @class ObservablePrioritizer
 */
export default class ObservablePrioritizer<T> {
  /**
   * Priority of the most prioritary task currently running.
   * `null` if no task is currently running.
   */
  private _minPendingPriority : number | null;
  /** Queue of tasks currently waiting for more prioritary ones to finish. */
  private _waitingQueue : Array<IPrioritizerTask<T>>;
  /** Tasks currently pending.  */
  private _pendingTasks : Array<IPrioritizerTask<T>>;
  /** @see IPrioritizerPrioritySteps */
  private _prioritySteps : IPrioritizerPrioritySteps;

  /**
   * @param {Options} prioritizerOptions
   */
  constructor({ prioritySteps } : IPrioritizerOptions) {
    this._minPendingPriority = null;
    this._waitingQueue = [];
    this._pendingTasks =  [];
    this._prioritySteps = prioritySteps;

    if (this._prioritySteps.high >= this._prioritySteps.low) {
      throw new Error("FP Error: the max high level priority should be given a lower" +
                      "priority number than the min low priority.");
    }
  }

  /**
   * Create a priorized Observable from a base Observable.
   *
   * When subscribed to, this Observable will have its priority compared to
   * all the already-running Observables created from this class.
   *
   * Only if this number is inferior or equal to the priority of the
   * currently-running Observables will it be immediately started.
   * In the opposite case, we will wait for higher-priority Observables to
   * finish before starting it.
   *
   * Note that while this Observable is waiting for its turn, it is possible
   * to update its property through the updatePriority method, by providing
   * the Observable returned by this function and its new priority number.
   *
   * @param {Observable} obs
   * @param {number} priority
   * @returns {Observable}
   */
  public create(obs : Observable<T>, priority : number) : Observable<ITaskEvent<T>> {
    const pObs$ = observableDefer(() => {
      const trigger = new Subject<boolean>();

      const newTask : IPrioritizerTask<T> = { observable: pObs$, priority, trigger };

      /**
       * Function executed each time the `trigger` Subject emits.
       * @param {Boolean} shouldRun - If `true`, the observable can run. If
       * `false` it means that it has just been interrupted.
       * @returns {Observable} - Returns events corresponding to the lifecycle
       * of the observable.
       */
      const onTrigger = (shouldRun : boolean) : Observable<ITaskEvent<T>> => {
        if (!shouldRun) {
          return observableOf({ type: "interrupted" as const });
        }
        this._onTaskBegin(newTask);
        return observableConcat(
          obs.pipe(map((data) => ({ type: "data" as const, value: data }))),
          observableOf({ type: "ended" as const })
        ).pipe(finalize(() => {
          this._onTaskEnd(newTask);
        }));
      };

      if (!this._canBeStartedNow(newTask)) {
        // This task doesn't have priority yet. Start it on trigger
        this._waitingQueue.push(newTask);
        return trigger.pipe(switchMap(onTrigger));
      }

      // Start it right away
      const startTask$ = trigger.pipe(startWith(true), switchMap(onTrigger));
      return !this._isHighPriority(newTask) ?
        startTask$ :
        observableMerge(startTask$,

                        // Note: we want to begin interrupting low-priority tasks just
                        // after starting the current one because the interrupting
                        // logic can call external code.
                        // This would mean re-entrancy, itself meaning that some weird
                        // half-state could be reached unless we're very careful.
                        // To be sure no harm is done, we put that code at the last
                        // possible position (the previous Observable sould be
                        // performing all its initialization synchronously).
                        observableDefer(() => { this._interruptCancellableTasks();
                                                return EMPTY; }));
    });

    return pObs$;
  }

  /**
   * Update the priority of an Observable created through the `create` method.
   * @param {Observable} obs
   * @param {number} priority
   */
  public updatePriority(obs : Observable<ITaskEvent<T>>, priority : number) : void {
    const waitingQueueIndex = arrayFindIndex(this._waitingQueue,
                                             (elt) => elt.observable === obs);

    if (waitingQueueIndex >= 0) { // If it was still waiting for its turn
      const waitingQueueElt = this._waitingQueue[waitingQueueIndex];
      if (waitingQueueElt.priority === priority) {
        return;
      }

      waitingQueueElt.priority = priority;

      if (!this._canBeStartedNow(waitingQueueElt)) {
        return;
      }

      this._startTask(waitingQueueIndex);

      if (this._isHighPriority(waitingQueueElt)) {
        // This task has high priority.
        // We should cancel every "cancellable" pending task
        //
        // Note: We start the task before interrupting cancellable tasks on
        // purpose.
        // Because both `_startTask` and `_interruptCancellableTasks` can emit
        // events and thus call external code, we could retrieve ourselves in a
        // very weird state at this point (for example, the different Observable
        // priorities could all be shuffled up, new Observables could have been
        // started in the meantime, etc.).
        //
        // By starting the task first, we ensure that this is manageable:
        // `_minPendingPriority` has already been updated to the right value at
        // the time we reached external code, the priority of the current
        // Observable has just been re-checked by `_isHighPriority`, and
        // `_interruptCancellableTasks` will ensure that we're basing ourselves
        // on the last `priority` value each time.
        // Doing it in the reverse order is an order of magnitude more difficult
        // to write and to reason about.
        this._interruptCancellableTasks();
      }
      return;
    }

    const pendingTasksIndex = arrayFindIndex(this._pendingTasks,
                                             (elt) => elt.observable === obs);
    if (pendingTasksIndex < 0) {
      log.warn("FP: request to update the priority of a non-existent task");
      return;
    }

    const task = this._pendingTasks[pendingTasksIndex];
    if (task.priority === priority) {
      return;
    }

    const oldPriority = task.priority;
    task.priority = priority;

    if (priority < oldPriority) {
      if (this._isHighPriority(task)) {
        this._interruptCancellableTasks();
      }
      return;
    }

    if (this._minPendingPriority !== null &&
        this._minPendingPriority <= this._prioritySteps.high)
    {
      // We could need to interrupt this task
      this._interruptPendingTask(task);
    }
  }

  /**
   * Interrupt and move back to the waiting queue all pending tasks that are
   * low priority (having a higher priority number than
   * `this._prioritySteps.low`).
   */
  private _interruptCancellableTasks() : void {
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
  private _startTask(index : number) : void {
    const task = this._waitingQueue.splice(index, 1)[0];
    task.trigger.next(true);
  }

  /**
   * Move back pending task to the waiting queue and interrupt it.
   * @param {object} task
   */
  private _interruptPendingTask(task : IPrioritizerTask<T>) : void {
    const pendingTasksIndex = arrayFindIndex(this._pendingTasks,
                                             (elt) => elt.observable === task.observable);
    if (pendingTasksIndex < 0) {
      log.warn("FP: Interrupting a non-existent pending task. Aborting...");
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
    task.trigger.next(false);
  }

  /**
   * Logic ran when a task begin.
   * @param {Object} task
   */
  private _onTaskBegin(task : IPrioritizerTask<T>) : void {
    this._minPendingPriority = this._minPendingPriority === null ?
      task.priority :
      Math.min(this._minPendingPriority, task.priority);
    this._pendingTasks.push(task);
  }

  /**
   * Logic ran when a task has ended.
   * @param {Object} task
   */
  private _onTaskEnd(task : IPrioritizerTask<T>) : void {
    const pendingTasksIndex = arrayFindIndex(this._pendingTasks,
                                             (elt) => elt.observable === task.observable);
    if (pendingTasksIndex < 0) {
      return; // Happen for example when the task has been interrupted
    }

    task.trigger.complete();

    this._pendingTasks.splice(pendingTasksIndex, 1);

    if (this._pendingTasks.length > 0) {
      return; // still waiting for Observables to finish
    }

    this._minPendingPriority = null;

    if (this._waitingQueue.length === 0) {
      return; // no more task to do
    }

    // Calculate minimum waiting priority
    this._minPendingPriority = this._waitingQueue.reduce((acc : number | null, elt) => {
      return acc === null || acc > elt.priority ? elt.priority :
                                                  acc;
    }, null);

    // Start all tasks with that minimum priority
    for (let i = 0; i < this._waitingQueue.length; i++) {
      const elt = this._waitingQueue[i];
      if (elt.priority === this._minPendingPriority) {
        this._startTask(i);
        i--; // previous operation should have removed that element from the
             // the waiting queue
      }
    }
  }

  /**
   * Return `true` if the given task can be started immediately based on its
   * priority.
   * @param {Object} task
   * @returns {boolean}
   */
  private _canBeStartedNow(task : IPrioritizerTask<T>) : boolean {
    return this._minPendingPriority === null ||
           task.priority <= this._minPendingPriority;
  }

  /**
   * Returns `true` if the given task can be considered "high priority".
   * returns false otherwise.
   * @param {Object} task
   * @returns {boolean}
   */
  private _isHighPriority(task : IPrioritizerTask<T>) : boolean {
    return task.priority <= this._prioritySteps.high;
  }
}
