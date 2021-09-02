/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  defer,
  mapTo,
  merge,
  NEVER,
  of,
  startWith,
  timer,
} from "rxjs";
import Prioritizer, {
  ITaskEvent,
} from "../prioritizer";

/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable no-restricted-properties */

function assert(condition: boolean, msg?: string): asserts condition {
  if (!condition) {
    throw new Error(msg ?? "The asserted condition turned out to be false.");
  }
}

describe("SegmentFetchers Prioritizer", () => {
  // beforeEach(() => {
  //   jest.resetModules();
  // });
  it("should not throw if updating the priority of a non-existent observable", () => {
    const never$ = NEVER;
    const prioritizer = new Prioritizer({ prioritySteps: { high: 5, low: 20 } });
    expect(() => { prioritizer.updatePriority(never$, 1); }).not.toThrow();
  });

  it("should run Observable right away", () => {
    const a1$ = of(1);
    const prioritizer = new Prioritizer({ prioritySteps: { high: 5, low: 20 } });
    let emitted = 0;
    let completed = 0;
    prioritizer.create(a1$, 99).subscribe({
      next: (evt) => {
        if (emitted === 0) {
          assert(evt.type === "data",
                 `evt.type should be equal to "data" but was equal to "${evt.type}"`);
          expect(evt.value).toEqual(1);
        } else if (emitted === 1) {
          expect(evt.type).toEqual("ended");
        } else {
          throw new Error("Should not have emitted an other event");
        }
        emitted++;
      },

      error: () => { throw new Error("Should not have thrown"); },

      complete: () => { completed++; },
    });
    expect(emitted).toEqual(2);
    expect(completed).toEqual(1);
  });

  /* eslint-disable max-len */
  it("should throw if the given high priority is a higher (or equal) number than the given low priority", () => {
    expect(() => new Prioritizer({ prioritySteps: { high: 7, low: 6 } })).toThrow();
    expect(() => new Prioritizer({ prioritySteps: { high: 7, low: 7 } })).toThrow();
    expect(() => new Prioritizer({ prioritySteps: { high: 7, low: 8 } })).not.toThrow();
  });

  it("should run multiple synchronous Observables right away", () => {
    const a1$ = of(1);
    const a2$ = of(2);
    const a3$ = of(3);
    const prioritizer = new Prioritizer({ prioritySteps: { high: 5, low: 20 } });
    let emitted = 0;
    let completed = 0;

    function onNext(expectedData : number) {
      let item = 0;
      return (evt : ITaskEvent<unknown>) => {
        if (item === 0) {
          expect(evt.type).toEqual("data");
          assert(evt.type === "data"); // for TypeScript
          expect(evt.value).toEqual(expectedData);
        } else if (item === 1) {
          expect(evt.type).toEqual("ended");
        } else {
          throw new Error("Should not have emitted an other event: " + evt.type);
        }
        item++;
        emitted++;
      };
    }

    prioritizer.create(a1$, 99).subscribe({
      next: onNext(1),
      error: () => { throw new Error("Should not have thrown"); },
      complete: () => { completed++; },
    });
    expect(emitted).toEqual(2);
    expect(completed).toEqual(1);

    prioritizer.create(a2$, 0).subscribe({
      next: onNext(2),
      error: () => { throw new Error("Should not have thrown"); },
      complete: () => { completed++; },
    });
    expect(emitted).toEqual(4);
    expect(completed).toEqual(2);

    prioritizer.create(a3$, 3).subscribe({
      next: onNext(3),
      error: () => { throw new Error("Should not have thrown"); },
      complete: () => { completed++; },
    });
    expect(emitted).toEqual(6);
    expect(completed).toEqual(3);
  });

  it("should not wait when all Observables have the same priority", (done) => {
    let obs1Started = false;
    let obs2Started = false;
    let obs3Started = false;
    let obs4Started = false;
    const obs1$ = defer(() => { obs1Started = true; return timer(1).pipe(mapTo(1)); });
    const obs2$ = defer(() => { obs2Started = true; return timer(1).pipe(mapTo(2)); });
    const obs3$ = defer(() => { obs3Started = true; return timer(1).pipe(mapTo(3)); });
    const obs4$ = defer(() => { obs4Started = true; return timer(1).pipe(mapTo(4)); });

    const prioritizer = new Prioritizer({ prioritySteps: { high: 5, low: 20 } });
    let emitted = 0;

    const pObs1 = prioritizer.create(obs1$, 1);
    const pObs2 = prioritizer.create(obs2$, 1);
    const pObs3 = prioritizer.create(obs3$, 1);
    const pObs4 = prioritizer.create(obs4$, 1);

    function expectData(
      evt : ITaskEvent<unknown>,
      expectedData : number,
      shouldHaveStartedObs : boolean
    ) : void {
      expect(obs1Started).toEqual(shouldHaveStartedObs);
      expect(obs2Started).toEqual(shouldHaveStartedObs);
      expect(obs3Started).toEqual(shouldHaveStartedObs);
      expect(obs4Started).toEqual(shouldHaveStartedObs);
      assert(evt.type === "data",
             `evt.type should be equal to "data" but was equal to "${evt.type}"`);
      expect(evt.value).toEqual(expectedData);
    }

    const checkEvents = [ (e : ITaskEvent<unknown>) => expectData(e, 0, false),
                          (e : ITaskEvent<unknown>) => expectData(e, 1, true),
                          (e : ITaskEvent<unknown>) => expect(e.type).toEqual("ended"),
                          (e : ITaskEvent<unknown>) => expectData(e, 2, true),
                          (e : ITaskEvent<unknown>) => expect(e.type).toEqual("ended"),
                          (e : ITaskEvent<unknown>) => expectData(e, 3, true),
                          (e : ITaskEvent<unknown>) => expect(e.type).toEqual("ended"),
                          (e : ITaskEvent<unknown>) => expectData(e, 4, true),
                          (e : ITaskEvent<unknown>) => expect(e.type).toEqual("ended") ];

    merge(pObs1, pObs2, pObs3, pObs4)
      .pipe(startWith({ type: "data" as const, value: 0 }))
      .subscribe({
        next: (evt) => {
          const checker = checkEvents[emitted];
          if (checker === undefined) {
            throw new Error("Unexpected event");
          }
          checker(evt);
          emitted++;
        },
        error: () => { throw new Error("Should not have thrown"); },
        complete: () => {
          expect(emitted).toEqual(9);
          done();
        },
      });
  });

  it("should not wait when Observables are run from lowest priority to highest", (done) => {
    let obs1Started = false;
    let obs2Started = false;
    let obs3Started = false;
    let obs4Started = false;
    const obs1$ = defer(() => { obs1Started = true; return timer(1).pipe(mapTo(1)); });
    const obs2$ = defer(() => { obs2Started = true; return timer(1).pipe(mapTo(2)); });
    const obs3$ = defer(() => { obs3Started = true; return timer(1).pipe(mapTo(3)); });
    const obs4$ = defer(() => { obs4Started = true; return timer(1).pipe(mapTo(4)); });

    const prioritizer = new Prioritizer({ prioritySteps: { high: 5, low: 20 } });
    let emitted = 0;

    const pObs1 = prioritizer.create(obs1$, 5 + 4);
    const pObs2 = prioritizer.create(obs2$, 5 + 3);
    const pObs3 = prioritizer.create(obs3$, 5 + 2);
    const pObs4 = prioritizer.create(obs4$, 5 + 1);

    function expectData(
      evt : ITaskEvent<unknown>,
      expectedData : number,
      shouldHaveStartedObs : boolean
    ) : void {
      expect(obs1Started).toEqual(shouldHaveStartedObs);
      expect(obs2Started).toEqual(shouldHaveStartedObs);
      expect(obs3Started).toEqual(shouldHaveStartedObs);
      expect(obs4Started).toEqual(shouldHaveStartedObs);
      assert(evt.type === "data",
             `evt.type should be equal to "data" but was equal to "${evt.type}"`);
      expect(evt.value).toEqual(expectedData);
    }

    const checkEvents = [ (e : ITaskEvent<unknown>) => expectData(e, 0, false),
                          (e : ITaskEvent<unknown>) => expectData(e, 1, true),
                          (e : ITaskEvent<unknown>) => expect(e.type).toEqual("ended"),
                          (e : ITaskEvent<unknown>) => expectData(e, 2, true),
                          (e : ITaskEvent<unknown>) => expect(e.type).toEqual("ended"),
                          (e : ITaskEvent<unknown>) => expectData(e, 3, true),
                          (e : ITaskEvent<unknown>) => expect(e.type).toEqual("ended"),
                          (e : ITaskEvent<unknown>) => expectData(e, 4, true),
                          (e : ITaskEvent<unknown>) => expect(e.type).toEqual("ended") ];

    merge(pObs1, pObs2, pObs3, pObs4)
      .pipe(startWith({ type: "data" as const, value: 0 }))
      .subscribe({
        next: (evt) => {
          const checker = checkEvents[emitted];
          if (checker === undefined) {
            throw new Error("Unexpected event");
          }
          checker(evt);
          emitted++;
        },
        error: () => { throw new Error("Should not have thrown"); },
        complete: () => {
          expect(emitted).toEqual(9);
          done();
        },
      });
  });

  it("should wait for higher-priority Observables", (done) => {
    let obs1Started = false;
    let obs2Started = false;
    let obs3Started = false;
    let obs4Started = false;
    const obs1$ = defer(() => { obs1Started = true; return timer(1).pipe(mapTo(1)); });
    const obs2$ = defer(() => { obs2Started = true; return timer(1).pipe(mapTo(2)); });
    const obs3$ = defer(() => { obs3Started = true; return timer(1).pipe(mapTo(3)); });
    const obs4$ = defer(() => { obs4Started = true; return timer(1).pipe(mapTo(4)); });

    const prioritizer = new Prioritizer({ prioritySteps: { high: 5, low: 20 } });
    let emitted = 0;

    const pObs1 = prioritizer.create(obs1$, 1);
    const pObs2 = prioritizer.create(obs2$, 2);
    const pObs3 = prioritizer.create(obs3$, 3);
    const pObs4 = prioritizer.create(obs4$, 4);

    merge(pObs1, pObs2, pObs3, pObs4)
      .pipe(startWith({ type: "data", value: 0 }))
      .subscribe({
        next: (evt) => {
          switch (emitted) {
            case 0:
              assert(evt.type === "data",
                     `evt.type should be equal to "data" but was equal to "${evt.type}"`);
              expect(evt.value).toEqual(0);
              break;
            case 1:
              expect(obs1Started).toEqual(true);
              expect(obs2Started).toEqual(false);
              expect(obs3Started).toEqual(false);
              expect(obs4Started).toEqual(false);
              assert(evt.type === "data",
                     `evt.type should be equal to "data" but was equal to "${evt.type}"`);
              expect(evt.value).toEqual(1);
              break;
            case 2:
              expect(evt.type).toEqual("ended");
              break;
            case 3:
              expect(obs1Started).toEqual(true);
              expect(obs2Started).toEqual(true);
              expect(obs3Started).toEqual(false);
              expect(obs4Started).toEqual(false);
              assert(evt.type === "data",
                     `evt.type should be equal to "data" but was equal to "${evt.type}"`);
              expect(evt.value).toEqual(2);
              break;
            case 4:
              expect(evt.type).toEqual("ended");
              break;
            case 5:
              expect(obs1Started).toEqual(true);
              expect(obs2Started).toEqual(true);
              expect(obs3Started).toEqual(true);
              expect(obs4Started).toEqual(false);
              assert(evt.type === "data",
                     `evt.type should be equal to "data" but was equal to "${evt.type}"`);
              expect(evt.value).toEqual(3);
              break;
            case 6:
              expect(evt.type).toEqual("ended");
              break;
            case 7:
              expect(obs1Started).toEqual(true);
              expect(obs2Started).toEqual(true);
              expect(obs3Started).toEqual(true);
              expect(obs4Started).toEqual(true);
              assert(evt.type === "data",
                     `evt.type should be equal to "data" but was equal to "${evt.type}"`);
              expect(evt.value).toEqual(4);
              break;
            case 8:
              expect(evt.type).toEqual("ended");
              break;
            default:
              throw new Error("Unexpected event");
          }
          emitted++;
        },
        error: () => { throw new Error("Should not have thrown"); },
        complete: () => {
          expect(emitted).toEqual(9);
          done();
        },
      });
  });

  it("should interrupt low-priority Observables when a high priority one is created", (done) => {
    let obs1Started = 0;
    let obs2Started = 0;
    let obs3Started = 0;
    let obs4Started = 0;
    const obs1$ = defer(() => { obs1Started++; return timer(1).pipe(mapTo(1)); });
    const obs2$ = defer(() => { obs2Started++; return timer(1).pipe(mapTo(2)); });
    const obs3$ = defer(() => { obs3Started++; return timer(1).pipe(mapTo(3)); });
    const obs4$ = defer(() => { obs4Started++; return timer(1).pipe(mapTo(4)); });

    const prioritizer = new Prioritizer({ prioritySteps: { high: 5, low: 20 } });
    let emitted = 0;

    const pObs1 = prioritizer.create(obs1$, 20);
    const pObs2 = prioritizer.create(obs2$, 20 - 1);
    const pObs3 = prioritizer.create(obs3$, 5);
    const pObs4 = prioritizer.create(obs4$, 0);

    merge(pObs1, pObs2, pObs3, pObs4)
      .subscribe({
        next: (evt) => {
          switch (emitted) {
            case 0:
              expect(evt.type).toEqual("interrupted");
              expect(obs1Started).toEqual(1);
              expect(obs2Started).toEqual(1);
              expect(obs3Started).toEqual(1);
              expect(obs4Started).toEqual(0);
              break;
            case 1:
              assert(evt.type === "data",
                     `evt.type should be equal to "data" but was equal to "${evt.type}"`);
              expect(evt.value).toEqual(2);
              expect(obs1Started).toEqual(1);
              expect(obs2Started).toEqual(1);
              expect(obs3Started).toEqual(1);
              expect(obs4Started).toEqual(1);
              break;
            case 2:
              expect(evt.type).toEqual("ended");
              break;
            case 3:
              assert(evt.type === "data",
                     `evt.type should be equal to "data" but was equal to "${evt.type}"`);
              expect(evt.value).toEqual(3);
              expect(obs1Started).toEqual(1);
              expect(obs2Started).toEqual(1);
              expect(obs3Started).toEqual(1);
              expect(obs4Started).toEqual(1);
              break;
            case 4:
              expect(evt.type).toEqual("ended");
              break;
            case 5:
              assert(evt.type === "data",
                     `evt.type should be equal to "data" but was equal to "${evt.type}"`);
              expect(evt.value).toEqual(4);
              expect(obs1Started).toEqual(1);
              expect(obs2Started).toEqual(1);
              expect(obs3Started).toEqual(1);
              expect(obs4Started).toEqual(1);
              break;
            case 6:
              expect(evt.type).toEqual("ended");
              break;
            case 7:
              assert(evt.type === "data",
                     `evt.type should be equal to "data" but was equal to "${evt.type}"`);
              expect(evt.value).toEqual(1);
              expect(obs1Started).toEqual(2);
              expect(obs2Started).toEqual(1);
              expect(obs3Started).toEqual(1);
              expect(obs4Started).toEqual(1);
              break;
            case 8:
              expect(evt.type).toEqual("ended");
              break;
            default:
              throw new Error("Unexpected event");
          }
          emitted++;
        },
        error: () => { throw new Error("Should not have thrown"); },
        complete: () => {
          expect(obs1Started).toEqual(2);
          expect(obs2Started).toEqual(1);
          expect(obs3Started).toEqual(1);
          expect(obs4Started).toEqual(1);
          expect(emitted).toEqual(9);
          done();
        },
      });
  });

  it("should be able to update a priority", (done) => {
    let obs1Started = false;
    let obs2Started = false;
    let obs3Started = false;
    let obs4Started = false;
    const obs1$ = defer(() => { obs1Started = true; return timer(1).pipe(mapTo(1)); });
    const obs2$ = defer(() => { obs2Started = true; return timer(1).pipe(mapTo(2)); });
    const obs3$ = defer(() => { obs3Started = true; return timer(1).pipe(mapTo(3)); });
    const obs4$ = defer(() => { obs4Started = true; return timer(1).pipe(mapTo(4)); });

    const prioritizer = new Prioritizer({ prioritySteps: { high: 5, low: 20 } });
    let emitted = 0;

    const pObs1 = prioritizer.create(obs1$, 5 + 1);
    const pObs2 = prioritizer.create(obs2$, 5 + 2);
    const pObs3 = prioritizer.create(obs3$, 5 + 3);
    const pObs4 = prioritizer.create(obs4$, 5 + 4);

    merge(pObs1, pObs2, pObs3, pObs4)
      .subscribe({
        next: (evt) => {
          switch (emitted) {
            case 0:
              prioritizer.updatePriority(pObs4, 5 + 1);

              assert(evt.type === "data",
                     `evt.type should be equal to "data" but was equal to "${evt.type}"`);
              expect(evt.value).toEqual(1);
              expect(obs1Started).toEqual(true);
              expect(obs2Started).toEqual(false);
              expect(obs3Started).toEqual(false);
              expect(obs4Started).toEqual(true);
              break;
            case 1:
              expect(evt.type).toEqual("ended");
              break;
            case 2:
              assert(evt.type === "data",
                     `evt.type should be equal to "data" but was equal to "${evt.type}"`);
              expect(evt.value).toEqual(4);
              expect(obs1Started).toEqual(true);
              expect(obs2Started).toEqual(false);
              expect(obs3Started).toEqual(false);
              expect(obs4Started).toEqual(true);
              break;
            case 3:
              expect(evt.type).toEqual("ended");
              break;
            case 4:
              assert(evt.type === "data",
                     `evt.type should be equal to "data" but was equal to "${evt.type}"`);
              expect(evt.value).toEqual(2);
              expect(obs1Started).toEqual(true);
              expect(obs2Started).toEqual(true);
              expect(obs3Started).toEqual(false);
              expect(obs4Started).toEqual(true);
              break;
            case 5:
              expect(evt.type).toEqual("ended");
              break;
            case 6:
              assert(evt.type === "data",
                     `evt.type should be equal to "data" but was equal to "${evt.type}"`);
              expect(evt.value).toEqual(3);
              expect(obs1Started).toEqual(true);
              expect(obs2Started).toEqual(true);
              expect(obs3Started).toEqual(true);
              expect(obs4Started).toEqual(true);
              break;
            case 7:
              expect(evt.type).toEqual("ended");
              break;
            default:
              throw new Error("Unexpected event");
          }
          emitted++;
        },
        error: () => { throw new Error("Should not have thrown"); },
        complete: () => {
          expect(emitted).toEqual(8);
          done();
        },
      });
  });

  it("should restart interrupted observables if given the right priority", (done) => {
    let obs1Started = 0;
    let obs2Started = 0;
    let obs3Started = 0;
    let obs4Started = 0;
    const obs1$ = defer(() => { obs1Started++; return timer(1).pipe(mapTo(1)); });
    const obs2$ = defer(() => { obs2Started++; return timer(1).pipe(mapTo(2)); });
    const obs3$ = defer(() => { obs3Started++; return timer(1).pipe(mapTo(3)); });
    const obs4$ = defer(() => { obs4Started++; return timer(1).pipe(mapTo(4)); });

    const prioritizer = new Prioritizer({ prioritySteps: { high: 5, low: 20 } });
    let emitted = 0;

    const pObs1 = prioritizer.create(obs1$, 20);
    const pObs2 = prioritizer.create(obs2$, 20 - 1);
    const pObs3 = prioritizer.create(obs3$, 5);
    const pObs4 = prioritizer.create(obs4$, 0);

    merge(pObs1, pObs2, pObs3, pObs4)
      .subscribe({
        next: (evt) => {
          switch (emitted) {
            case 0:
              expect(evt.type).toEqual("interrupted");
              expect(obs1Started).toEqual(1);
              expect(obs2Started).toEqual(1);
              expect(obs3Started).toEqual(1);
              expect(obs4Started).toEqual(0);

              // pObs1 has just been cancelled by pObs3.
              // Immediately set it the highest priority.
              prioritizer.updatePriority(pObs1, 0);
              break;
            case 1:
              assert(evt.type === "data",
                     `evt.type should be equal to "data" but was equal to "${evt.type}"`);
              expect(evt.value).toEqual(2);
              expect(obs1Started).toEqual(2);
              expect(obs2Started).toEqual(1);
              expect(obs3Started).toEqual(1);
              expect(obs4Started).toEqual(1);
              break;
            case 2:
              expect(evt.type).toEqual("ended");
              break;
            case 3:
              assert(evt.type === "data",
                     `evt.type should be equal to "data" but was equal to "${evt.type}"`);
              expect(evt.value).toEqual(3);
              expect(obs1Started).toEqual(2);
              expect(obs2Started).toEqual(1);
              expect(obs3Started).toEqual(1);
              expect(obs4Started).toEqual(1);
              break;
            case 4:
              expect(evt.type).toEqual("ended");
              break;
            case 5:
              assert(evt.type === "data",
                     `evt.type should be equal to "data" but was equal to "${evt.type}"`);
              expect(evt.value).toEqual(1);
              expect(obs1Started).toEqual(2);
              expect(obs2Started).toEqual(1);
              expect(obs3Started).toEqual(1);
              expect(obs4Started).toEqual(1);
              break;
            case 6:
              expect(evt.type).toEqual("ended");
              break;
            case 7:
              assert(evt.type === "data",
                     `evt.type should be equal to "data" but was equal to "${evt.type}"`);
              expect(evt.value).toEqual(4);
              expect(obs1Started).toEqual(2);
              expect(obs2Started).toEqual(1);
              expect(obs3Started).toEqual(1);
              expect(obs4Started).toEqual(1);
              break;
            case 8:
              expect(evt.type).toEqual("ended");
              break;
            default:
              throw new Error("Unexpected event");
          }
          emitted++;
        },
        error: () => { throw new Error("Should not have thrown"); },
        complete: () => {
          expect(obs1Started).toEqual(2);
          expect(obs2Started).toEqual(1);
          expect(obs3Started).toEqual(1);
          expect(obs4Started).toEqual(1);
          expect(emitted).toEqual(9);
          done();
        },
      });
  });

  it("should be able to update the priority of pending tasks", (done) => {
    let obs1Started = 0;
    let obs2Started = 0;
    let obs3Started = 0;
    let obs4Started = 0;
    const obs1$ = defer(() => { obs1Started++; return timer(1).pipe(mapTo(1)); });
    const obs2$ = defer(() => { obs2Started++; return timer(1).pipe(mapTo(2)); });
    const obs3$ = defer(() => { obs3Started++; return timer(1).pipe(mapTo(3)); });
    const obs4$ = defer(() => { obs4Started++; return timer(1).pipe(mapTo(4)); });

    const prioritizer = new Prioritizer({ prioritySteps: { high: 5, low: 20 } });
    let emitted = 0;

    const pObs1 = prioritizer.create(obs1$, 20);
    const pObs2 = prioritizer.create(obs2$, 20 - 1);
    const pObs3 = prioritizer.create(obs3$, 5);
    const pObs4 = prioritizer.create(obs4$, 20 + 10);

    merge(pObs1, pObs2, pObs3, pObs4)
      .subscribe({
        next: (evt) => {
          switch (emitted) {
            case 0: // interrupting pObs1 now that pObs3 is created
              expect(evt.type).toEqual("interrupted");
              expect(obs1Started).toEqual(1);
              expect(obs2Started).toEqual(1);
              expect(obs3Started).toEqual(1);
              expect(obs4Started).toEqual(0);

              prioritizer.updatePriority(pObs2, 20 + 12);
              break;
            case 1: // interrupting pObs2 now that it has been updated
              expect(evt.type).toEqual("interrupted");
              expect(obs1Started).toEqual(1);
              expect(obs2Started).toEqual(1);
              expect(obs3Started).toEqual(1);
              expect(obs4Started).toEqual(0);
              break;
            case 2: // pObs3 emits
              assert(evt.type === "data",
                     `evt.type should be equal to "data" but was equal to "${evt.type}"`);
              expect(evt.value).toEqual(3);
              expect(obs1Started).toEqual(1);
              expect(obs2Started).toEqual(1);
              expect(obs3Started).toEqual(1);
              expect(obs4Started).toEqual(0);
              break;
            case 3: // pObs3 ends
              expect(evt.type).toEqual("ended");
              break;
            case 4: // pObs1 emits
              assert(evt.type === "data",
                     `evt.type should be equal to "data" but was equal to "${evt.type}"`);
              expect(evt.value).toEqual(1);
              expect(obs1Started).toEqual(2);
              expect(obs2Started).toEqual(1);
              expect(obs3Started).toEqual(1);
              expect(obs4Started).toEqual(0);
              break;
            case 5: // pObs1 ends
              expect(evt.type).toEqual("ended");
              break;
            case 6: // pObs4 emits
              assert(evt.type === "data",
                     `evt.type should be equal to "data" but was equal to "${evt.type}"`);
              expect(evt.value).toEqual(4);
              expect(obs1Started).toEqual(2);
              expect(obs2Started).toEqual(1);
              expect(obs3Started).toEqual(1);
              expect(obs4Started).toEqual(1);
              break;
            case 7: // pObs4 ends
              expect(evt.type).toEqual("ended");
              break;
            case 8: // pObs2 emits
              assert(evt.type === "data",
                     `evt.type should be equal to "data" but was equal to "${evt.type}"`);
              expect(evt.value).toEqual(2);
              expect(obs1Started).toEqual(2);
              expect(obs2Started).toEqual(2);
              expect(obs3Started).toEqual(1);
              expect(obs4Started).toEqual(1);
              break;
            case 9: // pObs2 ends
              expect(evt.type).toEqual("ended");
              break;
            default:
              throw new Error("Unexpected event");
          }
          emitted++;
        },
        error: () => { throw new Error("Should not have thrown"); },
        complete: () => {
          expect(obs1Started).toEqual(2);
          expect(obs2Started).toEqual(2);
          expect(obs3Started).toEqual(1);
          expect(obs4Started).toEqual(1);
          expect(emitted).toEqual(10);
          done();
        },
      });
  });

  it("should be able to interrupt observables after a priority update on a pending task", (done) => {
    let obs1Started = 0;
    let obs2Started = 0;
    let obs3Started = 0;
    let obs4Started = 0;
    const obs1$ = defer(() => { obs1Started++; return timer(1).pipe(mapTo(1)); });
    const obs2$ = defer(() => { obs2Started++; return timer(1).pipe(mapTo(2)); });
    const obs3$ = defer(() => { obs3Started++; return timer(1).pipe(mapTo(3)); });
    const obs4$ = defer(() => { obs4Started++; return timer(1).pipe(mapTo(4)); });

    const prioritizer = new Prioritizer({ prioritySteps: { high: 5, low: 20 } });
    let emitted = 0;

    const pObs1 = prioritizer.create(obs1$, 20);
    const pObs2 = prioritizer.create(obs2$, 20);
    const pObs3 = prioritizer.create(obs3$, 20);
    const pObs4 = prioritizer.create(obs4$, 20);

    // Put in microtask
    Promise.resolve().then(() => {
      prioritizer.updatePriority(pObs4, 5);
    });

    merge(pObs1, pObs2, pObs3, pObs4)
      .subscribe({
        next: (evt) => {
          switch (emitted) {
            case 0:
              expect(evt.type).toEqual("interrupted");
              expect(obs1Started).toEqual(1);
              expect(obs2Started).toEqual(1);
              expect(obs3Started).toEqual(1);
              expect(obs4Started).toEqual(1);
              break;
            case 1:
              expect(evt.type).toEqual("interrupted");
              break;
            case 2:
              expect(evt.type).toEqual("interrupted");
              break;
            case 3:
              assert(evt.type === "data",
                     `evt.type should be equal to "data" but was equal to "${evt.type}"`);
              expect(evt.value).toEqual(4);
              break;
            case 4:
              expect(evt.type).toEqual("ended");
              expect(obs1Started).toEqual(1);
              expect(obs2Started).toEqual(1);
              expect(obs3Started).toEqual(1);
              expect(obs4Started).toEqual(1);
              break;
            case 5:
              assert(evt.type === "data",
                     `evt.type should be equal to "data" but was equal to "${evt.type}"`);
              expect(evt.value).toEqual(1);
              expect(obs1Started).toEqual(2);
              expect(obs2Started).toEqual(2);
              expect(obs3Started).toEqual(2);
              expect(obs4Started).toEqual(1);
              break;
            case 6:
              expect(evt.type).toEqual("ended");
              break;
            case 7:
              assert(evt.type === "data",
                     `evt.type should be equal to "data" but was equal to "${evt.type}"`);
              expect(evt.value).toEqual(2);
              break;
            case 8:
              expect(evt.type).toEqual("ended");
              break;
            case 9:
              assert(evt.type === "data",
                     `evt.type should be equal to "data" but was equal to "${evt.type}"`);
              expect(evt.value).toEqual(3);
              break;
            case 10:
              expect(evt.type).toEqual("ended");
              break;
            default:
              throw new Error("Unexpected event");
          }
          emitted++;
        },
        error: () => { throw new Error("Should not have thrown"); },
        complete: () => {
          expect(obs1Started).toEqual(2);
          expect(obs2Started).toEqual(2);
          expect(obs3Started).toEqual(2);
          expect(obs4Started).toEqual(1);
          expect(emitted).toEqual(11);
          done();
        },
      });
  });

  it("should not start right away an updated observable which has still not the priority", (done) => {
    let obs1Started = false;
    let obs2Started = false;
    let obs3Started = false;
    let obs4Started = false;
    const obs1$ = defer(() => { obs1Started = true; return timer(1).pipe(mapTo(1)); });
    const obs2$ = defer(() => { obs2Started = true; return timer(1).pipe(mapTo(2)); });
    const obs3$ = defer(() => { obs3Started = true; return timer(1).pipe(mapTo(3)); });
    const obs4$ = defer(() => { obs4Started = true; return timer(1).pipe(mapTo(4)); });

    const prioritizer = new Prioritizer({ prioritySteps: { high: 5, low: 20 } });
    let emitted = 0;

    const pObs1 = prioritizer.create(obs1$, 5);
    const pObs2 = prioritizer.create(obs2$, 5 + 1);
    const pObs3 = prioritizer.create(obs3$, 5 + 2);
    const pObs4 = prioritizer.create(obs4$, 5 + 3);

    function expectData(
      evt : ITaskEvent<unknown>,
      expectedData : number,
      shouldArray : [boolean, boolean, boolean, boolean]
    ) : void {
      expect(obs1Started).toEqual(shouldArray[0]);
      expect(obs2Started).toEqual(shouldArray[1]);
      expect(obs3Started).toEqual(shouldArray[2]);
      expect(obs4Started).toEqual(shouldArray[3]);
      assert(evt.type === "data",
             `evt.type should be equal to "data" but was equal to "${evt.type}"`);
      expect(evt.value).toEqual(expectedData);
    }

    const checkEvents = [ (e : ITaskEvent<unknown>) => expectData(e, 1, [true, false, false, false]),
                          (e : ITaskEvent<unknown>) => expect(e.type).toEqual("ended"),
                          (e : ITaskEvent<unknown>) => expectData(e, 2, [true, true, false, false]),
                          (e : ITaskEvent<unknown>) => expect(e.type).toEqual("ended"),
                          (e : ITaskEvent<unknown>) => expectData(e, 3, [true, true, true, true]),
                          (e : ITaskEvent<unknown>) => expect(e.type).toEqual("ended"),
                          (e : ITaskEvent<unknown>) => expectData(e, 4, [true, true, true, true]),
                          (e : ITaskEvent<unknown>) => expect(e.type).toEqual("ended") ];

    // Put in microtask
    Promise.resolve().then(() => {
      prioritizer.updatePriority(pObs4, 5 + 2);
    });

    merge(pObs1, pObs2, pObs3, pObs4)
      .subscribe({
        next: (evt) => {
          const checker = checkEvents[emitted];
          if (checker === undefined) {
            throw new Error("Unexpected event");
          }
          checker(evt);
          emitted++;
        },
        error: () => { throw new Error("Should not have thrown"); },
        complete: () => {
          expect(emitted).toEqual(checkEvents.length);
          done();
        },
      });
  });

  it("should not do anything special when updating a pending task with the same priority", (done) => {
    let obs1Started = 0;
    let obs2Started = 0;
    let obs3Started = 0;
    let obs4Started = 0;
    const obs1$ = defer(() => { obs1Started++; return timer(1).pipe(mapTo(1)); });
    const obs2$ = defer(() => { obs2Started++; return timer(1).pipe(mapTo(2)); });
    const obs3$ = defer(() => { obs3Started++; return timer(1).pipe(mapTo(3)); });
    const obs4$ = defer(() => { obs4Started++; return timer(1).pipe(mapTo(4)); });

    const prioritizer = new Prioritizer({ prioritySteps: { high: 5, low: 20 } });
    let emitted = 0;

    const pObs1 = prioritizer.create(obs1$, 20 + 1);
    const pObs2 = prioritizer.create(obs2$, 5);
    const pObs3 = prioritizer.create(obs3$, 20 + 2);
    const pObs4 = prioritizer.create(obs4$, 20 + 3);

    function expectInterrupted(
      evt : ITaskEvent<unknown>,
      shouldArray : [number, number, number, number]
    ) : void {
      expect(evt.type).toEqual("interrupted");
      expect(obs1Started).toEqual(shouldArray[0]);
      expect(obs2Started).toEqual(shouldArray[1]);
      expect(obs3Started).toEqual(shouldArray[2]);
      expect(obs4Started).toEqual(shouldArray[3]);
    }

    function expectData(
      evt : ITaskEvent<unknown>,
      expectedData : number,
      shouldArray : [number, number, number, number]
    ) : void {
      expect(obs1Started).toEqual(shouldArray[0]);
      expect(obs2Started).toEqual(shouldArray[1]);
      expect(obs3Started).toEqual(shouldArray[2]);
      expect(obs4Started).toEqual(shouldArray[3]);
      assert(evt.type === "data",
             `evt.type should be equal to "data" but was equal to "${evt.type}"`);
      expect(evt.value).toEqual(expectedData);
    }

    const checkEvents = [ (e : ITaskEvent<unknown>) => expectInterrupted(e, [1, 1, 0, 0]),
                          (e : ITaskEvent<unknown>) => expectData(e, 2, [1, 1, 0, 0]),
                          (e : ITaskEvent<unknown>) => expect(e.type).toEqual("ended"),
                          (e : ITaskEvent<unknown>) => expectData(e, 1, [2, 1, 0, 0]),
                          (e : ITaskEvent<unknown>) => expect(e.type).toEqual("ended"),
                          (e : ITaskEvent<unknown>) => expectData(e, 3, [2, 1, 1, 0]),
                          (e : ITaskEvent<unknown>) => expect(e.type).toEqual("ended"),
                          (e : ITaskEvent<unknown>) => expectData(e, 4, [2, 1, 1, 1]),
                          (e : ITaskEvent<unknown>) => expect(e.type).toEqual("ended") ];

    // Put in microtask
    Promise.resolve().then(() => {
      prioritizer.updatePriority(pObs2, 5);
    });

    merge(pObs1, pObs2, pObs3, pObs4)
      .subscribe({
        next: (evt) => {
          const checker = checkEvents[emitted];
          if (checker === undefined) {
            throw new Error("Unexpected event");
          }
          checker(evt);
          emitted++;
        },
        error: () => { throw new Error("Should not have thrown"); },
        complete: () => {
          expect(emitted).toEqual(checkEvents.length);
          done();
        },
      });
  });
});
