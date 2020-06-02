const assert = require("assert");
const capitalize = require("../src/capitalize");

describe("Second suite", () => {
  before(() => {
    console.log("LOG: second suite - beforeAll");
  });
  beforeEach(() => {
    console.log("LOG: second suite - beforeEach");
  });
  after(() => {
    console.log("LOG: second suite - afterAll");
  });
  afterEach(() => {
    console.log("LOG: second suite - afterEach");
  });
  it("this will fail", () => {
    assert.equal(capitalize("y"), "X");
  });

  it("this will NOW pass", () => {
    assert.equal(capitalize("x"), "X");
  });
});
