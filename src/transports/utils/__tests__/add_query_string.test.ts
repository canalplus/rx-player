import { describe, it, expect } from "vitest";
import addQueryString from "../add_query_string";

describe("addQueryString", () => {
  it("should do nothing if no query string is wanted", () => {
    expect(addQueryString("https://www.example.com", [])).toEqual(
      "https://www.example.com",
    );
  });
  it("should add query string to a simple URL", () => {
    expect(
      addQueryString("https://www.example.com", [
        ["first", "val"],
        ["second", null],
        ["third", "something"],
      ]),
    ).toEqual("https://www.example.com?first=val&second&third=something");
  });

  it("should add query string before present fragment", () => {
    expect(
      addQueryString("https://www.example.com#toto", [
        ["first", "val"],
        ["second", null],
        ["third", "something"],
      ]),
    ).toEqual("https://www.example.com?first=val&second&third=something#toto");
    expect(
      addQueryString("https://www.example.com#t?oto", [
        ["first", "val"],
        ["second", null],
        ["third", "something"],
      ]),
    ).toEqual("https://www.example.com?first=val&second&third=something#t?oto");
    expect(
      addQueryString("https://www.example.com#?toto", [
        ["first", "val"],
        ["second", null],
        ["third", "something"],
      ]),
    ).toEqual("https://www.example.com?first=val&second&third=something#?toto");
  });

  it("should have special handling if only the ? character is already present in query string", () => {
    expect(
      addQueryString("https://www.example.com?#?toto", [
        ["first", "val"],
        ["second", null],
        ["third", "something"],
      ]),
    ).toEqual("https://www.example.com?first=val&second&third=something#?toto");
    expect(
      addQueryString("https://www.example.com?", [
        ["first", "val"],
        ["second", null],
        ["third", "something"],
      ]),
    ).toEqual("https://www.example.com?first=val&second&third=something");
    expect(
      addQueryString("https://www.example.com?#", [
        ["first", "val"],
        ["second", null],
        ["third", "something"],
      ]),
    ).toEqual("https://www.example.com?first=val&second&third=something#");
    expect(
      addQueryString("https://www.example.com?#??????", [
        ["first", "val"],
        ["second", null],
        ["third", "something"],
      ]),
    ).toEqual("https://www.example.com?first=val&second&third=something#??????");
  });

  it("should combine with already-present query string", () => {
    expect(
      addQueryString("https://www.example.com?before=5", [
        ["first", "val"],
        ["second", null],
        ["third", "something"],
      ]),
    ).toEqual("https://www.example.com?before=5&first=val&second&third=something");
    expect(
      addQueryString("https://www.example.com?someBool", [
        ["first", "val"],
        ["second", null],
        ["third", "something"],
      ]),
    ).toEqual("https://www.example.com?someBool&first=val&second&third=something");
    expect(
      addQueryString("https://www.example.com?a", [
        ["first", "val"],
        ["second", null],
        ["third", "something"],
      ]),
    ).toEqual("https://www.example.com?a&first=val&second&third=something");
  });

  it("should combine with already-present query string and fragment", () => {
    expect(
      addQueryString("https://www.example.com?before=5#test", [
        ["first", "val"],
        ["second", null],
        ["third", "something"],
      ]),
    ).toEqual("https://www.example.com?before=5&first=val&second&third=something#test");
  });
});
