import React from "react";

/**
 * Higher Order component which link module(s) state to your component's prop.
 *
 * The module(s) concerned should be in your component's prop, named as you
 * wish.
 *
 * The state listened to and the corresponding prop passed to your component
 * is done when calling withModuleState.
 *
 * @example
 * ```js
 * import MyComponent from "./MyComponent.js";
 *
 * const MyEnhancedComponent = withModuleState({
 *   moduleA: {
 *     name_of_the_wanted_state_in_module_A: "wanted_resulting_prop_name",
 *     stateA1: "stateA1Prop",
 *     stateA2: "stateA2Prop",
 *   },
 *
 *   moduleB: {
 *     // Most of the time you might want to name them the same
 *     stateB1: "stateB1",
 *     stateB2: "stateB2",
 *   },
 * })(MyComponent);
 *
 * ReactDOM.render(
 *   <MyEnhancedComponent
 *     moduleA={moduleA}
 *     moduleB={moduleB}
 *   />, el);
 *
 * // in __MyComponent__, the corresponding state will be available in
 * // this.props (example: this.props.stateA1Prop). Those will be binded to the
 * // module's state, so updates will be repercuted on your module.
 *
 * // Note that module can be removed and added to the MyEnhancedComponent props
 * // component without problems. State subscriptions will be unlinked/relinked.
 * ```
 * @param {Object} moduleState
 * @returns {Function}
 */
const withModulesState = (modulesState) => (Comp) => {
  const modulesProps = Object.keys(modulesState);
  const modulesSubscriptions = {};
  return class extends React.Component {
    constructor(...args) {
      super(...args);
      this.state = {};

      modulesProps.forEach(moduleProp => {
        if (!this.props[moduleProp]) {
          return;
        }

        const translations = modulesState[modulesProps];
        const module = this.props[moduleProp];
        const wantedProps = Object.keys(modulesState[moduleProp]);
        wantedProps.forEach((state) => {
          this.state[translations[state]] = module.get(state);
        });
      });
    }

    componentDidMount() {
      modulesProps.forEach(moduleProp => {
        if (!this.props[moduleProp]) {
          return;
        }

        modulesSubscriptions[moduleProp] = [];

        const translations = modulesState[modulesProps];
        const module = this.props[moduleProp];
        const wantedProps = Object.keys(modulesState[moduleProp]);
        wantedProps.forEach((state) => {
          const sub = module
            .$get(state)
            .subscribe(val => this.setState({
              [translations[state]]: val,
            }));

          modulesSubscriptions[moduleProp].push(sub);
        });
      });
    }

    UNSAFE_componentWillReceiveProps(nextProps) {
      modulesProps.forEach(moduleProp => {
        if (!nextProps.hasOwnProperty(moduleProp) || nextProps[moduleProp] !== this.props[moduleProp]) {
          if (modulesSubscriptions[moduleProp]) {
            modulesSubscriptions[moduleProp]
              .forEach(sub => sub.unsubscribe());
            delete modulesSubscriptions[moduleProp];
          }
        }

        if (nextProps.hasOwnProperty(moduleProp) && !modulesSubscriptions[moduleProp]) {
          modulesSubscriptions[moduleProp] = [];
          const translations = modulesState[modulesProps];
          const module = nextProps[moduleProp];
          const wantedProps = Object.keys(modulesState[moduleProp]);
          wantedProps.forEach((state) => {
            const sub = module
              .$get(state)
              .subscribe(val => this.setState({
                [translations[state]]: val,
              }));

            modulesSubscriptions[moduleProp].push(sub);
          });
        }
      });
    }

    componentWillUnmount() {
      Object.keys(modulesSubscriptions).forEach(moduleProp => {
        modulesSubscriptions[moduleProp]
          .forEach(sub => sub.unsubscribe());
        delete modulesSubscriptions[moduleProp];
      });
    }

    render() {
      const newProps = Object.assign({}, this.props, this.state);
      return <Comp {...newProps} />;
    }
  };
};

export default withModulesState;
