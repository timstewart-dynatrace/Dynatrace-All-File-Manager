import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { validateDocumentName, MAX_DOCUMENT_NAME_LENGTH } from "../validation.js";

describe("validateDocumentName", () => {
  test("accepts a normal name", () => {
    const result = validateDocumentName("My Notebook");
    assert.equal(result.valid, true);
    assert.equal(result.error, undefined);
  });

  test("rejects an empty string", () => {
    const result = validateDocumentName("");
    assert.equal(result.valid, false);
    assert.equal(result.error, "Name cannot be empty");
  });

  test("rejects a whitespace-only string", () => {
    const result = validateDocumentName("   ");
    assert.equal(result.valid, false);
    assert.equal(result.error, "Name cannot be empty");
  });

  test("accepts a name exactly at the max length", () => {
    const name = "a".repeat(MAX_DOCUMENT_NAME_LENGTH);
    const result = validateDocumentName(name);
    assert.equal(result.valid, true);
  });

  test("rejects a name one character over the max length", () => {
    const name = "a".repeat(MAX_DOCUMENT_NAME_LENGTH + 1);
    const result = validateDocumentName(name);
    assert.equal(result.valid, false);
    assert.match(result.error || "", /128 characters or fewer/);
  });

  test("validates against the trimmed length, not the raw length", () => {
    const padded = "  " + "a".repeat(MAX_DOCUMENT_NAME_LENGTH) + "  ";
    const result = validateDocumentName(padded);
    assert.equal(result.valid, true);
  });

  test("supports a custom max length", () => {
    const result = validateDocumentName("hello world", 5);
    assert.equal(result.valid, false);
    assert.equal(result.error, "Name must be 5 characters or fewer (got 11)");
  });
});
