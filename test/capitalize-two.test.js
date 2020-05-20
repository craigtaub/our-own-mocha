const assert = require("assert");
const capitalize = require("../src/capitalize");

describe("Second suite", () => {
  before(() => {
    // console.log('second suite - beforeAll')
  });
  beforeEach(() => {
    // console.log('second suite - beforeEach')
  });
  after(() => {
    // console.log('second suite - afterAll')
  });
  afterEach(() => {
    // console.log('second suite - afterEach')
  });
  it("this will fail", () => {
    assert.equal(capitalize("y"), "X");
  });

  it("this will NOW pass", () => {
    assert.equal(capitalize("x"), "X");
  });
});
