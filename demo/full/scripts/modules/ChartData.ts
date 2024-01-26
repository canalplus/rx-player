import { declareModule, IStateUpdater } from "../lib/declareModule";

export interface IChartDataModuleState {
  data: Array<{
    date: number;
    value: number;
  }>;
}

const DEFAULT_MAX_SIZE = 100;
const ChartModule = declareModule(
  (): IChartDataModuleState => ({
    data: [],
  }),
  (
    maxSize: number | undefined = DEFAULT_MAX_SIZE,
    state: IStateUpdater<IChartDataModuleState>,
  ) => {
    return {
      addData(val: number): void {
        const data = state.get("data");
        if (data.length >= maxSize) {
          data.splice(0, data.length + 1 - maxSize);
        }
        data.push({
          date: performance.now(),
          value: val,
        });
        state.update("data", data.slice());
      },

      removeData(nb = 1) {
        const data = state.get("data");
        data.splice(0, nb);
        state.update("data", data.slice());
      },
    };
  },
);

export type IChartModule = InstanceType<typeof ChartModule>;
export default ChartModule;
