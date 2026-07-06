import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { escapeCSVField, recordsToCSV } from "../csv.js";

describe("escapeCSVField", () => {
  test("returns plain values unchanged", () => {
    assert.equal(escapeCSVField("hello"), "hello");
    assert.equal(escapeCSVField("123"), "123");
    assert.equal(escapeCSVField(""), "");
  });

  test("wraps values containing commas in double quotes", () => {
    assert.equal(escapeCSVField("hello, world"), '"hello, world"');
  });

  test("wraps values containing double quotes and escapes them", () => {
    assert.equal(escapeCSVField('say "hi"'), '"say ""hi"""');
  });

  test("wraps values containing newlines in double quotes", () => {
    assert.equal(escapeCSVField("line1\nline2"), '"line1\nline2"');
  });

  test("handles a value with both comma and quote", () => {
    assert.equal(escapeCSVField('a, "b"'), '"a, ""b"""');
  });
});

describe("recordsToCSV", () => {
  test("returns empty string for empty array", () => {
    assert.equal(recordsToCSV([]), "");
  });

  test("produces correct header and data rows", () => {
    const records = [
      { name: "Alice", age: 30 },
      { name: "Bob", age: 25 },
    ];
    const lines = recordsToCSV(records).trimEnd().split("\n");
    assert.equal(lines[0], "name,age");
    assert.equal(lines[1], "Alice,30");
    assert.equal(lines[2], "Bob,25");
  });

  test("escapes fields containing commas", () => {
    const records = [{ city: "London, UK", pop: 9000000 }];
    const lines = recordsToCSV(records).trimEnd().split("\n");
    assert.equal(lines[1], '"London, UK",9000000');
  });

  test("handles null and undefined values as empty string", () => {
    const records = [{ a: null, b: undefined, c: "ok" }] as unknown as Record<string, unknown>[];
    const lines = recordsToCSV(records).trimEnd().split("\n");
    assert.equal(lines[1], ",,ok");
  });

  test("JSON-stringifies object values", () => {
    const records = [{ meta: { x: 1 } }];
    const lines = recordsToCSV(records).trimEnd().split("\n");
    assert.equal(lines[1], '"{""x"":1}"');
  });

  test("ends with a trailing newline", () => {
    const result = recordsToCSV([{ v: "a" }]);
    assert.match(result, /\n$/);
  });
});
