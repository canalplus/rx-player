import { describe, it, expect } from "vitest";
import WeakMapMemory from "../weak_map_memory";

describe("utils - WeakMapMemory", () => {
  it("should call the given function when `get` is first called", () => {
    const obj = {};
    let wasCalledCounter = 0;
    const wwm = new WeakMapMemory((arg: unknown) => {
      expect(arg).toBe(obj);
      return ++wasCalledCounter;
    });

    expect(wwm.get(obj)).toBe(1);
    expect(wasCalledCounter).toBe(1);
  });

  it("should not call the given function when `get` has already been called on this object", () => {
    const obj = {};
    let wasCalledCounter = 0;
    const wwm = new WeakMapMemory((arg: unknown) => {
      expect(arg).toBe(obj);
      return ++wasCalledCounter;
    });

    expect(wwm.get(obj)).toBe(1);
    expect(wasCalledCounter).toBe(1);

    expect(wwm.get(obj)).toBe(1);
    expect(wasCalledCounter).toBe(1);

    expect(wwm.get(obj)).toBe(1);
    expect(wasCalledCounter).toBe(1);

    expect(wwm.get(obj)).toBe(1);
    expect(wasCalledCounter).toBe(1);

    expect(wwm.get(obj)).toBe(1);
    expect(wasCalledCounter).toBe(1);
  });

  it("should remove from WeakMapMemory when destroy is called", () => {
    const obj = {};
    let wasCalledCounter = 0;
    const wwm = new WeakMapMemory((arg: unknown) => {
      expect(arg).toBe(obj);
      return ++wasCalledCounter;
    });

    expect(wwm.get(obj)).toBe(1);
    expect(wasCalledCounter).toBe(1);

    wwm.destroy(obj);

    expect(wwm.get(obj)).toBe(2);
    expect(wasCalledCounter).toBe(2);

    expect(wwm.get(obj)).toBe(2);
    expect(wasCalledCounter).toBe(2);

    wwm.destroy(obj);

    expect(wwm.get(obj)).toBe(3);
    expect(wasCalledCounter).toBe(3);
  });

  it("should allow multiple unrelated objects at the same time", () => {
    const obj1 = {};
    const obj2 = {};
    let wasCalledCounter = 0;
    let obj1WasCalled = 0;
    let obj2WasCalled = 0;
    const wwm = new WeakMapMemory((arg: unknown) => {
      if (arg === obj1) {
        obj1WasCalled++;
      } else if (arg === obj2) {
        obj2WasCalled++;
      } else {
        throw new Error("Invalid call");
      }
      return ++wasCalledCounter;
    });

    expect(wwm.get(obj1)).toBe(1);
    expect(wasCalledCounter).toBe(1);
    expect(obj1WasCalled).toBe(1);
    expect(obj2WasCalled).toBe(0);

    expect(wwm.get(obj2)).toBe(2);
    expect(wasCalledCounter).toBe(2);
    expect(obj1WasCalled).toBe(1);
    expect(obj2WasCalled).toBe(1);

    expect(wwm.get(obj1)).toBe(1);
    expect(wasCalledCounter).toBe(2);
    expect(obj1WasCalled).toBe(1);
    expect(obj2WasCalled).toBe(1);

    expect(wwm.get(obj2)).toBe(2);
    expect(wasCalledCounter).toBe(2);
    expect(obj1WasCalled).toBe(1);
    expect(obj2WasCalled).toBe(1);

    wwm.destroy(obj1);

    expect(wwm.get(obj2)).toBe(2);
    expect(wasCalledCounter).toBe(2);
    expect(obj1WasCalled).toBe(1);
    expect(obj2WasCalled).toBe(1);

    expect(wwm.get(obj1)).toBe(3);
    expect(wasCalledCounter).toBe(3);
    expect(obj1WasCalled).toBe(2);
    expect(obj2WasCalled).toBe(1);

    expect(wwm.get(obj2)).toBe(2);
    expect(wasCalledCounter).toBe(3);
    expect(obj1WasCalled).toBe(2);
    expect(obj2WasCalled).toBe(1);
  });

  it("should not conflict with another WeakMapMemory", () => {
    const obj1 = {};
    const obj2 = {};
    let wasCalledCounter = 0;
    let obj1WasCalled = 0;
    let obj2WasCalled = 0;

    function func(arg: unknown) {
      if (arg === obj1) {
        obj1WasCalled++;
      } else if (arg === obj2) {
        obj2WasCalled++;
      } else {
        throw new Error("Invalid call");
      }
      return ++wasCalledCounter;
    }

    const wwm1 = new WeakMapMemory(func);
    const wwm2 = new WeakMapMemory(func);

    expect(wwm1.get(obj1)).toBe(1);
    expect(wasCalledCounter).toBe(1);
    expect(obj1WasCalled).toBe(1);
    expect(obj2WasCalled).toBe(0);

    expect(wwm2.get(obj1)).toBe(2);
    expect(wasCalledCounter).toBe(2);
    expect(obj1WasCalled).toBe(2);
    expect(obj2WasCalled).toBe(0);

    expect(wwm2.get(obj2)).toBe(3);
    expect(wasCalledCounter).toBe(3);
    expect(obj1WasCalled).toBe(2);
    expect(obj2WasCalled).toBe(1);

    expect(wwm2.get(obj1)).toBe(2);
    expect(wwm1.get(obj1)).toBe(1);
    expect(wwm2.get(obj2)).toBe(3);

    wwm2.destroy(obj1);
    expect(wwm1.get(obj1)).toBe(1);
    expect(wwm2.get(obj2)).toBe(3);
    expect(wwm2.get(obj1)).toBe(4);
    expect(wasCalledCounter).toBe(4);
    expect(obj1WasCalled).toBe(3);
    expect(obj2WasCalled).toBe(1);
  });
});
