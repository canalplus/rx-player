import type { SegmentSinkMetrics } from "../../core/segment_sinks/segment_buffers_store";
import type { IListener } from "../../utils/event_emitter";
import EventEmitter from "../../utils/event_emitter";
import type { CancellationSignal } from "../../utils/task_canceller";

export interface MetricsControllerEvents {
  metrics: SegmentSinkMetrics;
}

export class MetricsController extends EventEmitter<MetricsControllerEvents> {
  metricListeners: Array<IListener<MetricsControllerEvents, "metrics">>;

  constructor() {
    super();
    this.metricListeners = [];
  }
  subscribe(
    fn: IListener<MetricsControllerEvents, "metrics">,
    cancellationSignal?: CancellationSignal,
  ) {
    this.addEventListener("metrics", fn, cancellationSignal);
    this.metricListeners.push(fn);
    if (cancellationSignal !== undefined) {
      cancellationSignal.register(() => {
        this.removeEventListener("metrics", fn);
        const index = this.metricListeners.indexOf(fn);
        if (index !== -1) {
          this.metricListeners.splice(index, 1);
        }
      });
    }
  }

  dispatchMetricsEvent(metrics: SegmentSinkMetrics) {
    this.trigger("metrics", metrics);
  }
}
