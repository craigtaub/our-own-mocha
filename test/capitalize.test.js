const assert = require("assert");
const capitalize = require("../src/capitalize");

describe("First suite", () => {
  it("this will pass", () => {
    assert.equal(capitalize("x"), "X");
  });
});
