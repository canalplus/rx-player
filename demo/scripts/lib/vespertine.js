const { Subject } = require("rxjs/Subject");
const { BehaviorSubject } = require("rxjs/BehaviorSubject");
const { Observable } = require("rxjs/Observable");

/**
 * Homemade redux and r9webapp-core inspired state management architecture.
 *
 * This function creates a new module (defined in the modules directory) and
 * give it the payload in argument.
 *
 * The module can send state updates at any time, through its $state Subject,
 * and returns an Object containing functions: the actions.
 *
 * The actions can then be called through the dispatch function returned here.
 *
 * As an example is simpler for everyone:
 * @example
 * ```js
 * // 1 - The module
 * const TodoList = ({ $state }, { maxLength }) => {
 *   // initial state
 *   $state.next({
 *     todos: [],
 *   });
 *
 *   let lastTodoId = 0;
 *   return {
 *
 *     // add a todo if max length is not yet reached
 *     ADD_TODO: function(text) {
 *       const currentTodos = $state.getValue().todos;
 *       if (currentTodos.length >= maxLength) {
 *         return -1;
 *       }
 *
 *       const id = lastTodoId++;
 *
 *       // update state
 *       $state.next({
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
 *       const currentTodos = $state.getValue().todos;
 *
 *       const index = currentTodos
 *        .findIndex(({ id }) => id === todoId);
 *
 *        if (index < 0) {
 *          // this can help the caller to realize that the todo did not exist
 *          return false;
 *        }
 *
 *        // cleaner to clone
 *        const todosClone = [ ...currentTodos ];
 *        todosClone.splice(index, 1);
 *
 *        $state.next({
 *          todos: todosClone,
 *        });
 *        return true;
 *     },
 *   };
 * };
 *
 * // 2 - The interactions with it
 * const todoList = createModule(TodoList, { maxLength: 2 });
 *
 * // display todos when they change ($get is asynchronous, get is synchronous)
 * todoList.$get("todos")
 *   .subscribe(todos => {
 *     display(todos);
 *   });
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
 * todoList.destroy(); // cleanup and stop $get subscriptions
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
 *     argument (a string). If you give it multiple strings, it returns an array
 *     for all the values asked.
 *
 *   - $get: same as get, but returns an observable instead. Start emitting at
 *     the first change (I do not know yet if it's better to first emit the
 *     initial value immediately).
 *
 *   - destroy: destroy the module. Completes all subscriptions.
 */
const createModule = (module, payload) => {
  if (typeof module !== "function") {
    throw new Error("A module should be a function");
  }

  const moduleState = {};
  const $state = new BehaviorSubject();
  const $destroy = new Subject();

  const $updates = $state
    .skip(1)
    .map(newState => Object.assign(moduleState, newState))
    .takeUntil($destroy);

  // TODO find better operator!
  $updates.publish().connect();

  // try {
  const args = {
    $state,
    $destroy,
  };

  const moduleActions = module(args, payload);
  // } catch (e) {
  //   const message = (e && e.message) ? e.message : e;
  //   throw new Error(`Error while creating a module: ${message}`);
  // }

  return {
    dispatch: (actionName, payload) => {
      if (!moduleActions || typeof moduleActions[actionName] !== "function") {
        throw new Error(
          `The ${actionName} action does not exist on this module.`
        );
      }

      // try {
      return moduleActions[actionName](payload);
      // } catch (e) {
      //   const message = (e && e.message) ? e.message : e;
      //   throw new Error(`Error while dispatching ${actionName}: ${message}`);
      // }
    },

    get: (...args) => {
      if (!args.length) {
        return moduleState;
      }
      if (args.length === 1) {
        return moduleState[args];
      }

      return args.map(arg => moduleState[arg]);
    },

    $get: (...args) => {
      if (!args.length) {
        return $updates;
      }

      if (args.length === 1) {
        return $updates
          .map(state => state[args])
          .distinctUntilChanged();
      }

      const observables = args.map(arg =>
        $updates
          .map(state => state[arg])
          .distinctUntilChanged()
      );

      return Observable
        .combineLatest(...observables);
    },

    destroy: () => {
      $destroy.next();
      $destroy.complete();
    },
  };
};

module.exports = {
  createModule,
};
