const ChartData = ({ $state }, { maxSize }) => {
  const data = [];

  $state.next({ data: data.slice() });
  return {
    ADD_DATA: (val) => {
      if (data.length >= maxSize) {
        data.splice(0, (data.length + 1) - maxSize);
      }
      data.push({
        date: Date.now(),
        value: val,
      });

      $state.next({ data: data.slice() });
    },

    REMOVE_DATA: (number = 1) => {
      data.splice(0, number);
      $state.next({ data: data.slice() });
    },
  };
};

module.exports = ChartData;
