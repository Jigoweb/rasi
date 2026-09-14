import { parseFaqContent } from "./FaqEditor";

describe("parseFaqContent", () => {
  it("reads JSON faq items", () => {
    expect(parseFaqContent(JSON.stringify([{ question: "Q", answer: "A" }]))).toEqual([
      { question: "Q", answer: "A" },
    ]);
  });

  it("wraps leftover HTML as a single item", () => {
    expect(parseFaqContent("<p>testo</p>")).toEqual([{ question: "Domanda", answer: "<p>testo</p>" }]);
  });
});
