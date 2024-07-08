import { describe, it, expect } from "vitest";
import EventEmitter from "../event_emitter";

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */

describe("utils - EventEmitter", () => {
  it("should be able to call synchronously a callback on a given event", () => {
    const eventEmitter = new EventEmitter<{
      something: undefined;
      nope: undefined;
    }>();
    let wasCalled = 0;
    eventEmitter.addEventListener("something", () => {
      wasCalled++;
    });

    expect(wasCalled).toEqual(0);
    (eventEmitter as any).trigger("something", undefined);
    expect(wasCalled).toEqual(1);
    (eventEmitter as any).trigger("nope", undefined);
    expect(wasCalled).toEqual(1);
    eventEmitter.removeEventListener();
  });

  it("should communicate the given payload", () => {
    const eventEmitter = new EventEmitter<{
      something: undefined | "a" | { a: string };
      nope: undefined | "a" | { a: string };
    }>();
    let wasCalledWithString = 0;
    let wasCalledWithObject = 0;
    eventEmitter.addEventListener(
      "something",
      (payload: undefined | "a" | { a: string }) => {
        if (payload === "a") {
          wasCalledWithString++;
        } else if (payload !== undefined && payload.a === "b") {
          wasCalledWithObject++;
        }
      },
    );

    expect(wasCalledWithString).toEqual(0);
    expect(wasCalledWithObject).toEqual(0);

    (eventEmitter as any).trigger("something", undefined);
    expect(wasCalledWithString).toEqual(0);
    expect(wasCalledWithObject).toEqual(0);

    (eventEmitter as any).trigger("something", "a");
    expect(wasCalledWithString).toEqual(1);
    expect(wasCalledWithObject).toEqual(0);

    (eventEmitter as any).trigger("nope", undefined);
    expect(wasCalledWithString).toEqual(1);
    expect(wasCalledWithObject).toEqual(0);

    (eventEmitter as any).trigger("nope", undefined);
    expect(wasCalledWithString).toEqual(1);
    expect(wasCalledWithObject).toEqual(0);

    (eventEmitter as any).trigger("something", { a: "b" });
    expect(wasCalledWithString).toEqual(1);
    expect(wasCalledWithObject).toEqual(1);

    (eventEmitter as any).trigger("something", "a");
    (eventEmitter as any).trigger("something", "a");
    (eventEmitter as any).trigger("something", "a");
    expect(wasCalledWithString).toEqual(4);
    expect(wasCalledWithObject).toEqual(1);

    (eventEmitter as any).trigger("nope", undefined);
    expect(wasCalledWithString).toEqual(4);
    expect(wasCalledWithObject).toEqual(1);
    eventEmitter.removeEventListener();
  });

  it("should be able to remove the listener for a given event", () => {
    const eventEmitter = new EventEmitter<{
      something: undefined | "a" | { a: string };
      nope: undefined | "a" | { a: string };
    }>();
    let wasCalledWithString = 0;
    let wasCalledWithObject = 0;
    const callback = (payload: undefined | "a" | { a: string }) => {
      if (payload === "a") {
        wasCalledWithString++;
      } else if (payload !== undefined && payload.a === "b") {
        wasCalledWithObject++;
      }
    };
    eventEmitter.addEventListener("something", callback);
    eventEmitter.addEventListener("nope", callback);

    expect(wasCalledWithString).toEqual(0);
    expect(wasCalledWithObject).toEqual(0);

    (eventEmitter as any).trigger("something", undefined);
    expect(wasCalledWithString).toEqual(0);
    expect(wasCalledWithObject).toEqual(0);

    (eventEmitter as any).trigger("something", "a");
    expect(wasCalledWithString).toEqual(1);
    expect(wasCalledWithObject).toEqual(0);

    (eventEmitter as any).trigger("nope", undefined);
    expect(wasCalledWithString).toEqual(1);
    expect(wasCalledWithObject).toEqual(0);

    (eventEmitter as any).trigger("nope", "a");
    expect(wasCalledWithString).toEqual(2);
    expect(wasCalledWithObject).toEqual(0);

    (eventEmitter as any).trigger("something", { a: "b" });
    expect(wasCalledWithString).toEqual(2);
    expect(wasCalledWithObject).toEqual(1);

    eventEmitter.removeEventListener("something", callback);
    (eventEmitter as any).trigger("something", "a");
    (eventEmitter as any).trigger("something", "a");
    (eventEmitter as any).trigger("something", "a");
    expect(wasCalledWithString).toEqual(2);
    expect(wasCalledWithObject).toEqual(1);

    (eventEmitter as any).trigger("nope", undefined);
    expect(wasCalledWithString).toEqual(2);
    expect(wasCalledWithObject).toEqual(1);

    (eventEmitter as any).trigger("nope", "a");
    expect(wasCalledWithString).toEqual(3);
    expect(wasCalledWithObject).toEqual(1);
    eventEmitter.removeEventListener();
  });

  it("should be able to register multiple callbacks for the same event", () => {
    const eventEmitter = new EventEmitter<{
      something: undefined | "a" | { a: string };
      nope: undefined | "a" | { a: string };
    }>();
    let wasCalledWithString1 = 0;
    let wasCalledWithObject1 = 0;
    let wasCalledWithString2 = 0;
    let wasCalledWithObject2 = 0;
    let wasCalledWithString3 = 0;
    let wasCalledWithObject3 = 0;
    const callback1 = (payload: undefined | "a" | { a: string }) => {
      if (payload === "a") {
        wasCalledWithString1++;
      } else if (payload !== undefined && payload.a === "b") {
        wasCalledWithObject1++;
      }
    };
    const callback2 = (payload: undefined | "a" | { a: string }) => {
      if (payload === "a") {
        wasCalledWithString2++;
      } else if (payload !== undefined && payload.a === "b") {
        wasCalledWithObject2++;
      }
    };
    const callback3 = (payload: undefined | "a" | { a: string }) => {
      if (payload === "a") {
        wasCalledWithString3++;
      } else if (payload !== undefined && payload.a === "b") {
        wasCalledWithObject3++;
      }
    };

    eventEmitter.addEventListener("something", callback1);
    eventEmitter.addEventListener("something", callback2);
    eventEmitter.addEventListener("nope", callback1);
    eventEmitter.addEventListener("nope", callback3);
    expect(wasCalledWithString1).toEqual(0);
    expect(wasCalledWithObject1).toEqual(0);
    expect(wasCalledWithString2).toEqual(0);
    expect(wasCalledWithObject2).toEqual(0);
    expect(wasCalledWithString3).toEqual(0);
    expect(wasCalledWithObject3).toEqual(0);

    (eventEmitter as any).trigger("something", undefined);
    expect(wasCalledWithString1).toEqual(0);
    expect(wasCalledWithObject1).toEqual(0);
    expect(wasCalledWithString2).toEqual(0);
    expect(wasCalledWithObject2).toEqual(0);
    expect(wasCalledWithString3).toEqual(0);
    expect(wasCalledWithObject3).toEqual(0);

    (eventEmitter as any).trigger("something", "a");
    expect(wasCalledWithString1).toEqual(1);
    expect(wasCalledWithObject1).toEqual(0);
    expect(wasCalledWithString2).toEqual(1);
    expect(wasCalledWithObject2).toEqual(0);
    expect(wasCalledWithString3).toEqual(0);
    expect(wasCalledWithObject3).toEqual(0);

    eventEmitter.addEventListener("something", callback3);
    expect(wasCalledWithString1).toEqual(1);
    expect(wasCalledWithObject1).toEqual(0);
    expect(wasCalledWithString2).toEqual(1);
    expect(wasCalledWithObject2).toEqual(0);
    expect(wasCalledWithString3).toEqual(0);
    expect(wasCalledWithObject3).toEqual(0);

    (eventEmitter as any).trigger("something", "a");
    expect(wasCalledWithString1).toEqual(2);
    expect(wasCalledWithObject1).toEqual(0);
    expect(wasCalledWithString2).toEqual(2);
    expect(wasCalledWithObject2).toEqual(0);
    expect(wasCalledWithString3).toEqual(1);
    expect(wasCalledWithObject3).toEqual(0);

    (eventEmitter as any).trigger("nope", undefined);
    expect(wasCalledWithString1).toEqual(2);
    expect(wasCalledWithObject1).toEqual(0);
    expect(wasCalledWithString2).toEqual(2);
    expect(wasCalledWithObject2).toEqual(0);
    expect(wasCalledWithString3).toEqual(1);
    expect(wasCalledWithObject3).toEqual(0);

    (eventEmitter as any).trigger("nope", "a");
    expect(wasCalledWithString1).toEqual(3);
    expect(wasCalledWithObject1).toEqual(0);
    expect(wasCalledWithString2).toEqual(2);
    expect(wasCalledWithObject2).toEqual(0);
    expect(wasCalledWithString3).toEqual(2);
    expect(wasCalledWithObject3).toEqual(0);

    (eventEmitter as any).trigger("something", { a: "b" });
    expect(wasCalledWithString1).toEqual(3);
    expect(wasCalledWithObject1).toEqual(1);
    expect(wasCalledWithString2).toEqual(2);
    expect(wasCalledWithObject2).toEqual(1);
    expect(wasCalledWithString3).toEqual(2);
    expect(wasCalledWithObject3).toEqual(1);

    eventEmitter.removeEventListener("something", callback2);
    expect(wasCalledWithString1).toEqual(3);
    expect(wasCalledWithObject1).toEqual(1);
    expect(wasCalledWithString2).toEqual(2);
    expect(wasCalledWithObject2).toEqual(1);
    expect(wasCalledWithString3).toEqual(2);
    expect(wasCalledWithObject3).toEqual(1);

    (eventEmitter as any).trigger("something", { a: "b" });
    expect(wasCalledWithString1).toEqual(3);
    expect(wasCalledWithObject1).toEqual(2);
    expect(wasCalledWithString2).toEqual(2);
    expect(wasCalledWithObject2).toEqual(1);
    expect(wasCalledWithString3).toEqual(2);
    expect(wasCalledWithObject3).toEqual(2);

    (eventEmitter as any).trigger("nope", { a: "b" });
    expect(wasCalledWithString1).toEqual(3);
    expect(wasCalledWithObject1).toEqual(3);
    expect(wasCalledWithString2).toEqual(2);
    expect(wasCalledWithObject2).toEqual(1);
    expect(wasCalledWithString3).toEqual(2);
    expect(wasCalledWithObject3).toEqual(3);
    eventEmitter.removeEventListener();
  });

  it("should remove every callback for an event if no callback is provided to removeEventListener", () => {
    const eventEmitter = new EventEmitter<{
      something: undefined | "a" | { a: string };
      nope: undefined | "a" | { a: string };
    }>();
    let wasCalledWithString1 = 0;
    let wasCalledWithObject1 = 0;
    let wasCalledWithString2 = 0;
    let wasCalledWithObject2 = 0;
    let wasCalledWithString3 = 0;
    let wasCalledWithObject3 = 0;
    const callback1 = (payload: undefined | "a" | { a: string }) => {
      if (payload === "a") {
        wasCalledWithString1++;
      } else if (payload !== undefined && payload.a === "b") {
        wasCalledWithObject1++;
      }
    };
    const callback2 = (payload: undefined | "a" | { a: string }) => {
      if (payload === "a") {
        wasCalledWithString2++;
      } else if (payload !== undefined && payload.a === "b") {
        wasCalledWithObject2++;
      }
    };
    const callback3 = (payload: undefined | "a" | { a: string }) => {
      if (payload === "a") {
        wasCalledWithString3++;
      } else if (payload !== undefined && payload.a === "b") {
        wasCalledWithObject3++;
      }
    };

    eventEmitter.addEventListener("something", callback1);
    eventEmitter.addEventListener("something", callback2);
    eventEmitter.addEventListener("nope", callback1);
    eventEmitter.addEventListener("nope", callback3);
    expect(wasCalledWithString1).toEqual(0);
    expect(wasCalledWithObject1).toEqual(0);
    expect(wasCalledWithString2).toEqual(0);
    expect(wasCalledWithObject2).toEqual(0);
    expect(wasCalledWithString3).toEqual(0);
    expect(wasCalledWithObject3).toEqual(0);

    (eventEmitter as any).trigger("something", undefined);
    expect(wasCalledWithString1).toEqual(0);
    expect(wasCalledWithObject1).toEqual(0);
    expect(wasCalledWithString2).toEqual(0);
    expect(wasCalledWithObject2).toEqual(0);
    expect(wasCalledWithString3).toEqual(0);
    expect(wasCalledWithObject3).toEqual(0);

    (eventEmitter as any).trigger("something", "a");
    expect(wasCalledWithString1).toEqual(1);
    expect(wasCalledWithObject1).toEqual(0);
    expect(wasCalledWithString2).toEqual(1);
    expect(wasCalledWithObject2).toEqual(0);
    expect(wasCalledWithString3).toEqual(0);
    expect(wasCalledWithObject3).toEqual(0);

    eventEmitter.addEventListener("something", callback3);
    expect(wasCalledWithString1).toEqual(1);
    expect(wasCalledWithObject1).toEqual(0);
    expect(wasCalledWithString2).toEqual(1);
    expect(wasCalledWithObject2).toEqual(0);
    expect(wasCalledWithString3).toEqual(0);
    expect(wasCalledWithObject3).toEqual(0);

    (eventEmitter as any).trigger("something", "a");
    expect(wasCalledWithString1).toEqual(2);
    expect(wasCalledWithObject1).toEqual(0);
    expect(wasCalledWithString2).toEqual(2);
    expect(wasCalledWithObject2).toEqual(0);
    expect(wasCalledWithString3).toEqual(1);
    expect(wasCalledWithObject3).toEqual(0);

    (eventEmitter as any).trigger("nope", undefined);
    expect(wasCalledWithString1).toEqual(2);
    expect(wasCalledWithObject1).toEqual(0);
    expect(wasCalledWithString2).toEqual(2);
    expect(wasCalledWithObject2).toEqual(0);
    expect(wasCalledWithString3).toEqual(1);
    expect(wasCalledWithObject3).toEqual(0);

    (eventEmitter as any).trigger("nope", "a");
    expect(wasCalledWithString1).toEqual(3);
    expect(wasCalledWithObject1).toEqual(0);
    expect(wasCalledWithString2).toEqual(2);
    expect(wasCalledWithObject2).toEqual(0);
    expect(wasCalledWithString3).toEqual(2);
    expect(wasCalledWithObject3).toEqual(0);

    (eventEmitter as any).trigger("something", { a: "b" });
    expect(wasCalledWithString1).toEqual(3);
    expect(wasCalledWithObject1).toEqual(1);
    expect(wasCalledWithString2).toEqual(2);
    expect(wasCalledWithObject2).toEqual(1);
    expect(wasCalledWithString3).toEqual(2);
    expect(wasCalledWithObject3).toEqual(1);

    eventEmitter.removeEventListener("something");
    expect(wasCalledWithString1).toEqual(3);
    expect(wasCalledWithObject1).toEqual(1);
    expect(wasCalledWithString2).toEqual(2);
    expect(wasCalledWithObject2).toEqual(1);
    expect(wasCalledWithString3).toEqual(2);
    expect(wasCalledWithObject3).toEqual(1);

    (eventEmitter as any).trigger("something", { a: "b" });
    expect(wasCalledWithString1).toEqual(3);
    expect(wasCalledWithObject1).toEqual(1);
    expect(wasCalledWithString2).toEqual(2);
    expect(wasCalledWithObject2).toEqual(1);
    expect(wasCalledWithString3).toEqual(2);
    expect(wasCalledWithObject3).toEqual(1);

    (eventEmitter as any).trigger("nope", { a: "b" });
    expect(wasCalledWithString1).toEqual(3);
    expect(wasCalledWithObject1).toEqual(2);
    expect(wasCalledWithString2).toEqual(2);
    expect(wasCalledWithObject2).toEqual(1);
    expect(wasCalledWithString3).toEqual(2);
    expect(wasCalledWithObject3).toEqual(2);
    eventEmitter.removeEventListener();
  });

  it("should remove every callback for any event if no callback and no event is provided to removeEventListener", () => {
    const eventEmitter = new EventEmitter<{
      something: undefined | "a" | { a: string };
      nope: undefined | "a" | { a: string };
    }>();
    let wasCalledWithString1 = 0;
    let wasCalledWithObject1 = 0;
    let wasCalledWithString2 = 0;
    let wasCalledWithObject2 = 0;
    let wasCalledWithString3 = 0;
    let wasCalledWithObject3 = 0;
    const callback1 = (payload: undefined | "a" | { a: string }) => {
      if (payload === "a") {
        wasCalledWithString1++;
      } else if (payload !== undefined && payload.a === "b") {
        wasCalledWithObject1++;
      }
    };
    const callback2 = (payload: undefined | "a" | { a: string }) => {
      if (payload === "a") {
        wasCalledWithString2++;
      } else if (payload !== undefined && payload.a === "b") {
        wasCalledWithObject2++;
      }
    };
    const callback3 = (payload: undefined | "a" | { a: string }) => {
      if (payload === "a") {
        wasCalledWithString3++;
      } else if (payload !== undefined && payload.a === "b") {
        wasCalledWithObject3++;
      }
    };

    eventEmitter.addEventListener("something", callback1);
    eventEmitter.addEventListener("something", callback2);
    eventEmitter.addEventListener("nope", callback1);
    eventEmitter.addEventListener("nope", callback3);
    expect(wasCalledWithString1).toEqual(0);
    expect(wasCalledWithObject1).toEqual(0);
    expect(wasCalledWithString2).toEqual(0);
    expect(wasCalledWithObject2).toEqual(0);
    expect(wasCalledWithString3).toEqual(0);
    expect(wasCalledWithObject3).toEqual(0);

    (eventEmitter as any).trigger("something", undefined);
    expect(wasCalledWithString1).toEqual(0);
    expect(wasCalledWithObject1).toEqual(0);
    expect(wasCalledWithString2).toEqual(0);
    expect(wasCalledWithObject2).toEqual(0);
    expect(wasCalledWithString3).toEqual(0);
    expect(wasCalledWithObject3).toEqual(0);

    (eventEmitter as any).trigger("something", "a");
    expect(wasCalledWithString1).toEqual(1);
    expect(wasCalledWithObject1).toEqual(0);
    expect(wasCalledWithString2).toEqual(1);
    expect(wasCalledWithObject2).toEqual(0);
    expect(wasCalledWithString3).toEqual(0);
    expect(wasCalledWithObject3).toEqual(0);

    eventEmitter.addEventListener("something", callback3);
    expect(wasCalledWithString1).toEqual(1);
    expect(wasCalledWithObject1).toEqual(0);
    expect(wasCalledWithString2).toEqual(1);
    expect(wasCalledWithObject2).toEqual(0);
    expect(wasCalledWithString3).toEqual(0);
    expect(wasCalledWithObject3).toEqual(0);

    (eventEmitter as any).trigger("something", "a");
    expect(wasCalledWithString1).toEqual(2);
    expect(wasCalledWithObject1).toEqual(0);
    expect(wasCalledWithString2).toEqual(2);
    expect(wasCalledWithObject2).toEqual(0);
    expect(wasCalledWithString3).toEqual(1);
    expect(wasCalledWithObject3).toEqual(0);

    (eventEmitter as any).trigger("nope", undefined);
    expect(wasCalledWithString1).toEqual(2);
    expect(wasCalledWithObject1).toEqual(0);
    expect(wasCalledWithString2).toEqual(2);
    expect(wasCalledWithObject2).toEqual(0);
    expect(wasCalledWithString3).toEqual(1);
    expect(wasCalledWithObject3).toEqual(0);

    (eventEmitter as any).trigger("nope", "a");
    expect(wasCalledWithString1).toEqual(3);
    expect(wasCalledWithObject1).toEqual(0);
    expect(wasCalledWithString2).toEqual(2);
    expect(wasCalledWithObject2).toEqual(0);
    expect(wasCalledWithString3).toEqual(2);
    expect(wasCalledWithObject3).toEqual(0);

    (eventEmitter as any).trigger("something", { a: "b" });
    expect(wasCalledWithString1).toEqual(3);
    expect(wasCalledWithObject1).toEqual(1);
    expect(wasCalledWithString2).toEqual(2);
    expect(wasCalledWithObject2).toEqual(1);
    expect(wasCalledWithString3).toEqual(2);
    expect(wasCalledWithObject3).toEqual(1);

    eventEmitter.removeEventListener();
    expect(wasCalledWithString1).toEqual(3);
    expect(wasCalledWithObject1).toEqual(1);
    expect(wasCalledWithString2).toEqual(2);
    expect(wasCalledWithObject2).toEqual(1);
    expect(wasCalledWithString3).toEqual(2);
    expect(wasCalledWithObject3).toEqual(1);

    (eventEmitter as any).trigger("something", { a: "b" });
    expect(wasCalledWithString1).toEqual(3);
    expect(wasCalledWithObject1).toEqual(1);
    expect(wasCalledWithString2).toEqual(2);
    expect(wasCalledWithObject2).toEqual(1);
    expect(wasCalledWithString3).toEqual(2);
    expect(wasCalledWithObject3).toEqual(1);

    (eventEmitter as any).trigger("nope", { a: "b" });
    expect(wasCalledWithString1).toEqual(3);
    expect(wasCalledWithObject1).toEqual(1);
    expect(wasCalledWithString2).toEqual(2);
    expect(wasCalledWithObject2).toEqual(1);
    expect(wasCalledWithString3).toEqual(2);
    expect(wasCalledWithObject3).toEqual(1);
    eventEmitter.removeEventListener();
  });

  it("should allow removing event listener that do not exist", () => {
    const eventEmitter = new EventEmitter<{
      test: undefined | "a" | { a: string };
      something: undefined | "a" | { a: string };
      nope: undefined | "a" | { a: string };
    }>();
    const cb1 = function () {
      throw new Error("Should not be called");
    };
    const cb2 = function () {
      throw new Error("Should not be called");
    };
    eventEmitter.addEventListener("test", cb2);
    eventEmitter.removeEventListener("test", cb1);
    eventEmitter.removeEventListener("test", cb2);
    eventEmitter.removeEventListener("test", cb2);
    eventEmitter.removeEventListener("test");
    eventEmitter.removeEventListener("test");
    eventEmitter.removeEventListener();
    eventEmitter.removeEventListener();
  });
});
