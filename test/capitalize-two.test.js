const assert = require("assert");
const capitalize = require("../src/capitalize");

describe("Second suite", () => {
  it("this will fail", () => {
    assert.equal(capitalize("y"), "X");
  });

  it("this will NOW pass", () => {
    assert.equal(capitalize("x"), "X");
  });
});
