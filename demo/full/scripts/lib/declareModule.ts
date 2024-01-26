/**
 * Declares a "module", which are objects with an associated state (an object
 * whose properties can be listened to for change) and associated methods called
 * actions.
 *
 * @example - Example with a simple Counter module:
 * ```ts
 * // Declaring a new Module. Note that multiple instances of it could exist at
 * // the same time, each with its own state.
 * const CounterModule = declareModule(
 *
 *   // The module's initial state
 *   () => { counter: 0, },
 *
 *   // Function called when a new instance of the module is created.
 *   // Returns that module's actions (its linked functions)
 *   (
 *     moduleArg: null, // Optional module argument. Not used here
 *     state, // allows to query and update the state
 *     _abortSignal, // `AbortSignal` triggered when the module is destroyed
 *   ) => {
 *    return {
 *      // increment the counter
 *      increment(step: number): void {
 *        state.update("counter", state.get("counter") + step);
 *      },
 *      // decrement the counter
 *      decrement(step: number): void {
 *        state.update("counter", state.get("counter") - step);
 *      },
 *    };
 *  });
 *
 * // Create a new instance of the CounterModule
 * const counterModule = new CounterModule(null);
 *
 * console.log(counterModule.getState("counter"));
 * // outputs `0` (initial value)
 *
 * // Register an event listener, called when the `counter` state is updated
 * const stopListening = counterModule.listenToState("counter", (counter) => {
 *   console.log(counter);
 *   // outputs:
 *   //   - `1` when first incremented by 1
 *   //   - then `6` just after being re-incremented by 5
 *   //   - then `3` just after being decremented by 3
 *   //   - and that's all (`stopListening` is then called, below)
 * });
 *
 * counterModule.actions.increment(1);
 * console.log(counterModule.getState("counter")); // outputs `1`
 *
 * counterModule.actions.increment(5);
 * console.log(counterModule.getState("counter")); // outputs `6` (1 + 5)
 *
 * counterModule.actions.decrement(3);
 * console.log(counterModule.getState("counter")); // outputs `3` (6 - 3)
 *
 * stopListening(); // Removes the previously-registed event listener
 *
 * counterModule.actions.decrement(3);
 * console.log(counterModule.getState("counter")); // outputs `0` (3 - 3)
 *
 * // Remove all listeners and free module resources if it used some (it used
 * // none here) by triggering its associated AbortSignal
 * counterModule.destroy();
 * ```
 *
 * @param {Function} generateInitialState - Function returning the initial
 * state declared for that module.
 * Such "state" has to be declared as an object whose keys are the various
 * state properties' name and whose values are the initial value for the
 * corresponding state name.
 *
 * The type of this first argument is also used by TypeScript to define your
 * Module's state type if you did not explicitely declare it through this
 * function's first type argument.
 * As such, you can manually define the return type of that function to
 * properly type your state, thus avoiding potential TypeScript inference error.
 *
 * @param {Function} initialize - Your module function.
 * This function is called everytime a new instance of this module is
 * created. It is only called once by instance and can be used to initialize
 * event listeners which will update that instance's state.
 *
 * This function returns an object which will correspond to the module's action,
 * which are methods that can be called on it. Those methods will be able to be
 * called as is, with both their arguments and return value accessible from the
 * rest of the application.
 *
 * This function takes three arguments:
 *
 *   1. The argument that was communicated when creating the module.
 *
 *   2. An object allowing to get and update the current state of the current
 *      module instance. This function is the only place where that state can
 *      be updated.
 *
 *   3. An `AbortSignal` which will be triggered if ever and when that module is
 *      destroyed. You can profit from this value to free resources like event
 *      listeners you registered in the current function.
 *
 * @returns {Object} - An object with a single function, `create`, allowing to
 * create a new instance of this module, each with its own state.
 * That `create` function in turns returns a module instance, with its own set
 * of properties and functions:
 *
 *   - `getState`: Function returning synchronously the current value of the
 *      state property whose name is given in argument.
 *
 *   - `listenToState`: Function allowing to register an event listener which
 *     will be called everytime the value of the state property whose name is
 *     given as first argument is updated (by calling the function as second
 *     argument with the new value as this last function's unique argument).
 *
 *     That function itself returns a function allowing to remove the event
 *     listener.
 *
 *   - `actions`: The module's actions, which basically are the functions it
 *     returns when initialized (created).
 */
export function declareModule<TStateObject extends object, TModuleArg, TActions>(
  generateInitialState: () => TStateObject,
  initialize: (
    moduleArg: TModuleArg,
    state: IStateUpdater<TStateObject>,
    abortSignal: AbortSignal,
  ) => TActions,
): IDeclaredModule<TModuleArg, TStateObject, TActions> {
  return class {
    private _listeners: IListeners<TStateObject>;
    private _stateObject: TStateObject;
    private _abortController: AbortController;
    public actions: TActions;

    constructor(moduleArg: TModuleArg) {
      this._listeners = {};
      const stateObject = generateInitialState();
      this._stateObject = stateObject;
      this._abortController = new AbortController();

      const notifyUpdatedValue = (stateName: keyof TStateObject): void => {
        const listeners = this._listeners[stateName];
        if (!Array.isArray(listeners)) {
          return;
        }

        listeners.slice().forEach((listener) => {
          try {
            listener(stateObject[stateName]);
          } catch (e) {
            /* eslint-disable-next-line no-console */
            console.error("EventEmitter: listener error", e instanceof Error ? e : null);
          }
        });
      };

      const stateUpdater: IStateUpdater<TStateObject> = {
        get<K extends keyof TStateObject>(stateName: K): TStateObject[K] {
          return stateObject[stateName];
        },

        update<K extends keyof TStateObject>(stateName: K, value: TStateObject[K]): void {
          stateObject[stateName] = value;
          notifyUpdatedValue(stateName);
        },

        updateBulk(bulk: Partial<TStateObject>): void {
          Object.assign(stateObject, bulk);

          for (const stateName of Object.keys(bulk) as Array<keyof TStateObject>) {
            notifyUpdatedValue(stateName);
          }
        },
      };
      this.actions = initialize(moduleArg, stateUpdater, this._abortController.signal);
    }

    getState<K extends keyof TStateObject>(stateName: K): TStateObject[K] {
      return this._stateObject[stateName];
    }

    listenToState<K extends keyof TStateObject>(
      stateName: K,
      callback: (currentValue: TStateObject[K]) => void,
    ): () => void {
      const listeners = this._listeners[stateName];
      if (!Array.isArray(listeners)) {
        this._listeners[stateName] = [callback];
      } else {
        listeners.push(callback);
      }

      return (): void => {
        const currListeners = this._listeners[stateName];
        if (!Array.isArray(currListeners)) {
          return;
        }
        const index = currListeners.indexOf(callback);
        if (index !== -1) {
          currListeners.splice(index, 1);
        }

        if (currListeners.length === 0) {
          delete this._listeners[stateName];
        }
      };
    }
    destroy(): void {
      this._listeners = {};
      return this._abortController.abort();
    }
  };
}

export abstract class Module<TStateObject extends object, TActions> {
  abstract actions: TActions;
  abstract getState<K extends keyof TStateObject>(stateName: K): TStateObject[K];
  abstract listenToState<K extends keyof TStateObject>(
    stateName: K,
    callback: (currentValue: TStateObject[K]) => void,
  ): () => void;
  abstract destroy(): void;
}

export interface IDeclaredModule<TModuleArg, TStateObject extends object, TActions> {
  new (arg: TModuleArg): Module<TStateObject, TActions>;
}

export interface IStateUpdater<TStateObject> {
  get<K extends keyof TStateObject>(stateName: K): TStateObject[K];
  update<K extends keyof TStateObject>(stateName: K, value: TStateObject[K]): void;
  updateBulk(bulk: Partial<TStateObject>): void;
}

// Type of the argument in the listener's callback
type IArgs<
  TEventRecord,
  TEventName extends keyof TEventRecord,
> = TEventRecord[TEventName];

// Type of the listener function
type IListener<TEventRecord, TEventName extends keyof TEventRecord> = (
  args: IArgs<TEventRecord, TEventName>,
) => void;

type IListeners<TEventRecord> = {
  [P in keyof TEventRecord]?: Array<IListener<TEventRecord, P>>;
};
