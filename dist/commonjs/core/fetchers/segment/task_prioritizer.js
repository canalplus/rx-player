"use strict";
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var log_1 = require("../../../log");
var array_find_index_1 = require("../../../utils/array_find_index");
var create_cancellable_promise_1 = require("../../../utils/create_cancellable_promise");
var task_canceller_1 = require("../../../utils/task_canceller");
var TaskPrioritizer = /** @class */ (function () {
    /**
     * @param {Options} prioritizerOptions
     */
    function TaskPrioritizer(_a) {
        var prioritySteps = _a.prioritySteps;
        this._minPendingPriority = null;
        this._waitingQueue = [];
        this._pendingTasks = [];
        this._prioritySteps = prioritySteps;
        if (this._prioritySteps.high >= this._prioritySteps.low) {
            throw new Error("TP: the max high level priority should be given a lower" +
                "priority number than the min low priority.");
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
    TaskPrioritizer.prototype.create = function (taskFn, priority, callbacks, cancelSignal) {
        var _this = this;
        var newTask;
        return (0, create_cancellable_promise_1.default)(cancelSignal, function (resolve, reject) {
            /** Function allowing to start the underlying Promise. */
            var trigger = function () {
                if (newTask.hasEnded) {
                    return;
                }
                var finishTask = function () {
                    unlinkInterrupter();
                    _this._endTask(newTask);
                };
                var onResolve = function (value) {
                    callbacks.beforeEnded();
                    finishTask();
                    resolve(value);
                };
                var onReject = function (err) {
                    finishTask();
                    reject(err);
                };
                var interrupter = new task_canceller_1.default();
                var unlinkInterrupter = interrupter.linkToSignal(cancelSignal);
                newTask.interrupter = interrupter;
                interrupter.signal.register(function () {
                    newTask.interrupter = null;
                    if (!cancelSignal.isCancelled()) {
                        callbacks.beforeInterrupted();
                    }
                });
                _this._minPendingPriority =
                    _this._minPendingPriority === null
                        ? newTask.priority
                        : Math.min(_this._minPendingPriority, newTask.priority);
                _this._pendingTasks.push(newTask);
                newTask
                    .taskFn(interrupter.signal)
                    .then(onResolve)
                    .catch(function (err) {
                    if (!cancelSignal.isCancelled() &&
                        interrupter.isUsed() &&
                        err instanceof task_canceller_1.CancellationError) {
                        return;
                    }
                    onReject(err);
                });
            };
            newTask = {
                hasEnded: false,
                priority: priority,
                trigger: trigger,
                taskFn: taskFn,
                interrupter: null,
            };
            if (!_this._canBeStartedNow(newTask)) {
                _this._waitingQueue.push(newTask);
            }
            else {
                // We can start the task right away
                newTask.trigger();
                if (_this._isRunningHighPriorityTasks()) {
                    // Note: we want to begin interrupting low-priority tasks just
                    // after starting the current one because the interrupting
                    // logic can call external code.
                    // This would mean re-entrancy, itself meaning that some weird
                    // half-state could be reached unless we're very careful.
                    // To be sure no harm is done, we put that code at the last
                    // possible position.
                    _this._interruptCancellableTasks();
                }
            }
            return function () { return _this._endTask(newTask); };
        });
    };
    TaskPrioritizer.prototype._endTask = function (task) {
        task.hasEnded = true;
        var waitingQueueIndex = _findTaskIndex(task.taskFn, this._waitingQueue);
        if (waitingQueueIndex >= 0) {
            // If it was still waiting for its turn
            this._waitingQueue.splice(waitingQueueIndex, 1);
        }
        else {
            // remove it from pending queue if in it
            var pendingTasksIndex = _findTaskIndex(task.taskFn, this._pendingTasks);
            if (pendingTasksIndex < 0) {
                return;
            }
            this._pendingTasks.splice(pendingTasksIndex, 1);
            if (this._pendingTasks.length > 0) {
                if (this._minPendingPriority === task.priority) {
                    this._minPendingPriority = Math.min.apply(Math, __spreadArray([], __read(this._pendingTasks.map(function (t) { return t.priority; })), false));
                }
            }
            else {
                this._minPendingPriority = null;
            }
            this._loopThroughWaitingQueue();
        }
    };
    /**
     * Update the priority of a promise given to the TaskPrioritizer.
     * @param {Object} promise
     * @param {number} priority
     */
    TaskPrioritizer.prototype.updatePriority = function (promise, priority) {
        var waitingQueueIndex = _findTaskIndex(promise, this._waitingQueue);
        if (waitingQueueIndex >= 0) {
            // If it was still waiting for its turn
            var waitingQueueElt = this._waitingQueue[waitingQueueIndex];
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
        var pendingTasksIndex = _findTaskIndex(promise, this._pendingTasks);
        if (pendingTasksIndex < 0) {
            log_1.default.warn("TP: request to update the priority of a non-existent task");
            return;
        }
        var task = this._pendingTasks[pendingTasksIndex];
        if (task.priority === priority) {
            return;
        }
        var prevPriority = task.priority;
        task.priority = priority;
        if (this._minPendingPriority === null || priority < this._minPendingPriority) {
            this._minPendingPriority = priority;
        }
        else if (this._minPendingPriority === prevPriority) {
            // was highest priority
            if (this._pendingTasks.length === 1) {
                this._minPendingPriority = priority;
            }
            else {
                this._minPendingPriority = Math.min.apply(Math, __spreadArray([], __read(this._pendingTasks.map(function (t) { return t.priority; })), false));
            }
            this._loopThroughWaitingQueue();
        }
        if (this._isRunningHighPriorityTasks()) {
            // Always interrupt cancellable tasks after all other side-effects, to
            // avoid re-entrancy issues
            this._interruptCancellableTasks();
        }
    };
    /**
     * Browse the current waiting queue and start all task in it that needs to be
     * started: start the ones with the lowest priority value below
     * `_minPendingPriority`.
     *
     * Private properties, such as `_minPendingPriority` are updated accordingly
     * while this method is called.
     */
    TaskPrioritizer.prototype._loopThroughWaitingQueue = function () {
        var minWaitingPriority = this._waitingQueue.reduce(function (acc, elt) {
            return acc === null || acc > elt.priority ? elt.priority : acc;
        }, null);
        if (minWaitingPriority === null ||
            (this._minPendingPriority !== null && this._minPendingPriority < minWaitingPriority)) {
            return;
        }
        for (var i = 0; i < this._waitingQueue.length; i++) {
            var priorityToCheck = this._minPendingPriority === null
                ? minWaitingPriority
                : Math.min(this._minPendingPriority, minWaitingPriority);
            var elt = this._waitingQueue[i];
            if (elt.priority <= priorityToCheck) {
                this._findAndRunWaitingQueueTask(i);
                i--; // previous operation should have removed that element from the
                // the waiting queue
            }
        }
    };
    /**
     * Interrupt and move back to the waiting queue all pending tasks that are
     * low priority (having a higher priority number than
     * `this._prioritySteps.low`).
     */
    TaskPrioritizer.prototype._interruptCancellableTasks = function () {
        for (var i = 0; i < this._pendingTasks.length; i++) {
            var pendingObj = this._pendingTasks[i];
            if (pendingObj.priority >= this._prioritySteps.low) {
                this._interruptPendingTask(pendingObj);
                // The previous call could have a lot of potential side-effects.
                // It is safer to re-start the function to not miss any pending
                // task that needs to be cancelled.
                return this._interruptCancellableTasks();
            }
        }
    };
    /**
     * Start task which is at the given index in the waiting queue.
     * The task will be removed from the waiting queue in the process.
     * @param {number} index
     */
    TaskPrioritizer.prototype._findAndRunWaitingQueueTask = function (index) {
        if (index >= this._waitingQueue.length || index < 0) {
            log_1.default.warn("TP : Tried to start a non existing task");
            return false;
        }
        var task = this._waitingQueue.splice(index, 1)[0];
        task.trigger();
        return true;
    };
    /**
     * Move back pending task to the waiting queue and interrupt it.
     * @param {object} task
     */
    TaskPrioritizer.prototype._interruptPendingTask = function (task) {
        var _a;
        var pendingTasksIndex = _findTaskIndex(task.taskFn, this._pendingTasks);
        if (pendingTasksIndex < 0) {
            log_1.default.warn("TP: Interrupting a non-existent pending task. Aborting...");
            return;
        }
        // Stop task and put it back in the waiting queue
        this._pendingTasks.splice(pendingTasksIndex, 1);
        this._waitingQueue.push(task);
        if (this._pendingTasks.length === 0) {
            this._minPendingPriority = null;
        }
        else if (this._minPendingPriority === task.priority) {
            this._minPendingPriority = Math.min.apply(Math, __spreadArray([], __read(this._pendingTasks.map(function (t) { return t.priority; })), false));
        }
        (_a = task.interrupter) === null || _a === void 0 ? void 0 : _a.cancel(); // Interrupt at last step because it calls external code
    };
    /**
     * Return `true` if the given task can be started immediately based on its
     * priority.
     * @param {Object} task
     * @returns {boolean}
     */
    TaskPrioritizer.prototype._canBeStartedNow = function (task) {
        return this._minPendingPriority === null || task.priority <= this._minPendingPriority;
    };
    /**
     * Returns `true` if any running task is considered "high priority".
     * returns `false` otherwise.
     * @returns {boolean}
     */
    TaskPrioritizer.prototype._isRunningHighPriorityTasks = function () {
        return (this._minPendingPriority !== null &&
            this._minPendingPriority <= this._prioritySteps.high);
    };
    return TaskPrioritizer;
}());
exports.default = TaskPrioritizer;
/**
 * Simple utils function allowing to find a given task function in the given
 * `queue`.
 *
 * Returns `-1` if `taskFn` is not found.
 * @param {Function} taskFn
 * @param {Array.<Object>} queue
 * @returns {number}
 */
function _findTaskIndex(taskFn, queue) {
    return (0, array_find_index_1.default)(queue, function (elt) { return elt.taskFn === taskFn; });
}
