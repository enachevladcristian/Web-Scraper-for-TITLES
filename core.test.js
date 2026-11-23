"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { keywordsFrom, matchesAbstract, reconstructAbstract, safeUrl, matchingWorks } = require("./core.js");

test("keywords require all literal phrases, ignoring case", () => {
  const keywords = keywordsFrom(" Climate Change, biodiversity, ");
  assert.deepEqual(keywords, ["climate change", "biodiversity"]);
  assert.equal(matchesAbstract("BIODIVERSITY and climate change", keywords), true);
  assert.equal(matchesAbstract("Climate change alone", keywords), false);
  assert.equal(matchesAbstract("anything", []), false);
});

test("reconstructs the abstract in position order", () => {
  assert.equal(reconstructAbstract({ change: [1], climate: [0, 3], affects: [2] }), "climate change affects climate");
  assert.equal(reconstructAbstract(null), "");
});

test("returns only matching links and counts missing data", () => {
  const works = [
    { title: "Match", doi: "https://doi.org/10.1/test", abstract_inverted_index: { climate: [0], change: [1] } },
    { title: "Other", doi: "https://example.com/other", abstract_inverted_index: { unrelated: [0] } },
    { title: "No abstract", doi: "https://example.com/no", abstract_inverted_index: null },
    { title: "No safe link", doi: "javascript:alert(1)", abstract_inverted_index: { climate: [0], change: [1] } }
  ];
  assert.deepEqual(matchingWorks(works, ["climate change"]), {
    links: [{ title: "Match", url: "https://doi.org/10.1/test" }],
    missingAbstracts: 1,
    missingLinks: 1
  });
  assert.equal(safeUrl("javascript:alert(1)"), null);
});
