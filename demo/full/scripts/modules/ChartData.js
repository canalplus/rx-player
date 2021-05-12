export default ({ state }, { maxSize }) => {
  const data = [];

  state.set({ data: data.slice() });
  return {
    ADD_DATA: (val) => {
      if (data.length >= maxSize) {
        data.splice(0, (data.length + 1) - maxSize);
      }
      data.push({
        date: performance.now(),
        value: val,
      });

      state.set({ data: data.slice() });
    },

    REMOVE_DATA: (number = 1) => {
      data.splice(0, number);
      state.set({ data: data.slice() });
    },
  };
};
