import type { SegmentSinkMetrics } from "../../core/segment_sinks/segment_buffers_store";
import type { IListener } from "../../utils/event_emitter";
import EventEmitter from "../../utils/event_emitter";
import type { CancellationSignal } from "../../utils/task_canceller";
import { DEFAULT_REFRESH_INTERVAL } from "./debug/constants";

export interface MetricsCollectorEvents {
  metrics: SegmentSinkMetrics;
}

export class MetricsCollector extends EventEmitter<MetricsCollectorEvents> {
  metricListeners: Array<IListener<MetricsCollectorEvents, "metrics">>;
  private collectFn: (() => void | SegmentSinkMetrics) | null;

  constructor() {
    super();
    this.metricListeners = [];
    this.collectFn = null;
  }
  subscribe(
    fn: IListener<MetricsCollectorEvents, "metrics">,
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
    // collect immediately metrics when a subscriber is added
    // to have data as soon as possible
    this.collectMetrics();
  }

  setCollectFn(fn: () => void) {
    this.collectFn = fn;
  }

  startCollectingMetrics(cancellationSignal: CancellationSignal) {
    const intervalId = setInterval(() => {
      if (this.metricListeners.length === 0) {
        return;
      }
      this.collectMetrics();
    }, DEFAULT_REFRESH_INTERVAL);

    cancellationSignal.register(() => {
      clearInterval(intervalId);
    });
  }

  private collectMetrics() {
    if (this.collectFn === null) {
      return;
    }
    const metrics = this.collectFn();
    if (metrics !== undefined) {
      this.dispatchMetricsEvent(metrics);
    }
  }

  dispatchMetricsEvent(metrics: SegmentSinkMetrics) {
    this.trigger("metrics", metrics);
  }
}
