const assert = require("assert");
const capitalize = require("../src/capitalize");

describe("First suite", () => {
  before(() => {
    console.log('first suite - beforeAll')
  })
  beforeEach(() => {
    console.log('first suite - beforeEach')
  });
  after(() => {
    console.log('first suite - afterAll')
  })
  afterEach(() => {
    console.log('first suite - afterEach')
  });
  it("this will pass", () => {
    assert.equal(capitalize("x"), "X");
  });
});
