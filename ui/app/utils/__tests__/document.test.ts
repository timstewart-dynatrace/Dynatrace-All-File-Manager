import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { looksLikeLaunchpad, nameFromFile } from "../document.js";

describe("looksLikeLaunchpad", () => {
  test("returns true when containerList.containers is an array", () => {
    assert.equal(looksLikeLaunchpad({ containerList: { containers: [] } }), true);
    assert.equal(looksLikeLaunchpad({ containerList: { containers: [{ id: "a" }] } }), true);
  });

  test("returns false when containerList is missing", () => {
    assert.equal(looksLikeLaunchpad({}), false);
    assert.equal(looksLikeLaunchpad({ title: "My Notebook" }), false);
  });

  test("returns false when containerList exists but containers is not an array", () => {
    assert.equal(looksLikeLaunchpad({ containerList: { containers: null } }), false);
    assert.equal(looksLikeLaunchpad({ containerList: { containers: "yes" } }), false);
    assert.equal(looksLikeLaunchpad({ containerList: {} }), false);
  });

  test("returns false when containerList is not an object", () => {
    assert.equal(looksLikeLaunchpad({ containerList: "string" }), false);
    assert.equal(looksLikeLaunchpad({ containerList: 42 }), false);
  });
});

describe("nameFromFile", () => {
  test("strips the last extension", () => {
    assert.equal(nameFromFile("notebook.json"), "notebook");
    assert.equal(nameFromFile("my-dashboard.json"), "my-dashboard");
  });

  test("handles files with multiple dots", () => {
    assert.equal(nameFromFile("my.notebook.json"), "my.notebook");
  });

  test("returns the name unchanged when there is no extension", () => {
    assert.equal(nameFromFile("README"), "README");
  });

  test("handles empty string", () => {
    assert.equal(nameFromFile(""), "");
  });
});
