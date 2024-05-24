import { convertRequest } from "../src/convert";

describe("convert", () => {
  it("should pass", () => {
    expect(
      convertRequest({
        source: "foo",
        outputFormat: "python",
      }),
    ).toEqual("converted request");
  });
});
