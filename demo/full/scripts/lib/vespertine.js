/**
 * Homemade redux and r9webapp-core inspired state management architecture.
 *
 * This function creates a new module (defined in the modules directory) and
 * give it the payload in argument.
 *
 * The module can send state updates at any time, through its state Object,
 * and returns an Object containing functions: the actions.
 *
 * The actions can then be called through the dispatch function returned here.
 *
 * As an example is simpler for everyone:
 * @example
 * ```js
 * // 1 - The module
 * const TodoList = ({ state }, { maxLength }) => {
 *   // initial state
 *   state.set({
 *     todos: [],
 *   });
 *
 *   let lastTodoId = 0;
 *   return {
 *
 *     // add a todo if max length is not yet reached
 *     ADD_TODO: function(text) {
 *       const currentTodos = state.get("todos");
 *       if (currentTodos.length >= maxLength) {
 *         return -1;
 *       }
 *
 *       const id = lastTodoId++;
 *
 *       // update state
 *       state.set({
 *         todos: [
 *           ...currentTodos,
 *           { id, text },
 *         ],
 *       });
 *
 *       // return id so it's easier to retrieve for the caller
 *       return id;
 *     },
 *
 *     // remove a todo thanks to its id
 *     REMOVE_TODO function(todoId) {
 *       const currentTodos = state.get("todos");
 *
 *       const index = currentTodos
 *        .findIndex(({ id }) => id === todoId);
 *
 *        if (index < 0) {
 *          // Returning a boolean can help the caller to realize that the todo
 *          // did not exist
 *          return false;
 *        }
 *
 *        // clone to stay immutable here
 *        const todosClone = [ ...currentTodos ];
 *
 *        todosClone.splice(index, 1);
 *        state.set({ todos: todosClone });
 *        return true;
 *     },
 *   };
 * };
 *
 * // 2 - The interactions with it
 * const todoList = createModule(TodoList, { maxLength: 2 });
 *
 * // display todos when they change
 * const stopListening = todoList.addStateListener("todos", todos => {
 *   display(todos);
 * });
 *
 * // stop the callback given to the previous `addStateListener` from being
 * // triggered again
 * stopListening();
 *
 * console.log(todoList.get("todos").length); // 0
 *
 * const firstId = todoList.dispatch("ADD_TODO", "do something");
 * console.log(todoList.get("todos").length); // 1
 *
 * todoList.dispatch("ADD_TODO", "do another thing");
 * console.log(todoList.get("todos").length); // 2
 *
 * todoList.dispatch("ADD_TODO", "yet another");
 * console.log(todoList.get("todos").length); // still 2 - as it's the max
 *                                            // length set
 *
 * // remove the first todo created
 * todoList.dispatch("REMOVE_TODO", firstId);
 * console.log(todoList.get("todos").length); // back to 1
 *
 * todoList.destroy(); // cleanup and stop callbacks added through
 *                     // `addStateListener` from being triggered
 * ```
 *
 * @param {Function} module
 * @param {*} payload
 * @returns {Object} - Object with the following functions:
 *
 *   - dispatch: call an action from the module. Takes the name of the action
 *     (a string) + an eventual payload in argument. Returns what the action
 *     returns.
 *
 *   - get: get the entire module state, or the property named after the
 *     argument (a string).
 *
 *   - addStateListener: Allow to add a callback that will be triggered when the
 *     asked state changes.
 *
 *   - destroy: destroy the module. Completes all subscriptions.
 */
const createModule = (module, payload) => {
  if (typeof module !== "function") {
    throw new Error("A module should be a function");
  }

  const moduleState = {};
  const stateListeners = {};

  const getFromModule = (...args) => {
    if (!args.length) {
      return moduleState;
    }
    if (args.length === 1) {
      return moduleState[args[0]];
    }
    return args.map(arg => moduleState[arg]);
  };

  const addStateListener = (arg, cb) => {
    if (typeof arg === "string") {
      if (stateListeners[arg] === undefined) {
        stateListeners[arg] = [];
      }
      stateListeners[arg].push(onStateUpdate);
      function onStateUpdate() {
        cb(moduleState[arg]);
      }
      return () => {
        if (stateListeners[arg] !== undefined) {
          const indexOf = stateListeners[arg].indexOf(onStateUpdate);
          stateListeners[arg].splice(indexOf, 1);
          if (stateListeners[arg].length === 0) {
            delete stateListeners[arg];
          }
        }
      };
    }

    /* eslint-disable-next-line no-console */
    console.error("Invalid usage of `addStateListener`");
  };

  const abortController = new AbortController();
  const state = {
    get: getFromModule,
    set: (arg) => {
      Object.assign(moduleState, arg);
      for (const key of Object.keys(arg)) {
        if (stateListeners[key] !== undefined) {
          for (const listener of stateListeners[key].slice()) {
            try {
              listener(moduleState[key]);
            } catch (err) {
              /* eslint-disable-next-line no-console */
              console.error("Error when calling listener for", key, err);
            }
          }
        }
      }
    },
  };

  const moduleActions = module(state, payload, abortController.signal);

  return {
    dispatch: (actionName, actionPayload) => {
      if (!moduleActions || typeof moduleActions[actionName] !== "function") {
        throw new Error(
          `The ${actionName} action does not exist on this module.`
        );
      }
      return moduleActions[actionName](actionPayload);
    },

    get: getFromModule,
    addStateListener,
    destroy: () => {
      abortController.abort();
    },
  };
};

export {
  createModule,
};
