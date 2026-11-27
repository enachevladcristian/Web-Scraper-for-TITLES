"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { keywordsFrom, searchQuery, safeUrl, openAlexLinks, scienceDirectLinks, linksCsv } = require("./core.js");

test("CSV preserves Unicode, quotes and line breaks and protects spreadsheet formulas", () => {
  const csv = linksCsv([
    { title: 'Știință, "test"\nlinie', url: "https://example.com/a,b" },
    { title: "  =1+1", url: "https://example.com/2" }
  ]);
  assert.equal(csv, '\uFEFFTitlu,URL\r\n"Știință, ""test""\nlinie","https://example.com/a,b"\r\n"\'  =1+1","https://example.com/2"\r\n');
});

test("combines all keywords as quoted search phrases", () => {
  const keywords = keywordsFrom(" Climate Change, biodiversity, ");
  assert.equal(searchQuery(keywords), '"climate change" AND "biodiversity"');
  assert.equal(searchQuery([]), null);
  assert.equal(searchQuery(['bad"query']), null);
  assert.equal(searchQuery(["bad\\query"]), null);
});

test("ScienceDirect links do not depend on DOI or abstracts and reject unsafe links", () => {
  assert.deepEqual(scienceDirectLinks([
    { title: "Match", uri: "https://www.sciencedirect.com/science/article/pii/1" },
    { title: "Unsafe", uri: "https://sciencedirect.com.evil.example/article" },
    { title: "No link" }
  ]), {
    links: [{ title: "Match", url: "https://www.sciencedirect.com/science/article/pii/1" }],
    missingLinks: 2
  });
});

test("OpenAlex links use public landing pages or DOIs without abstracts", () => {
  assert.deepEqual(openAlexLinks([
    { title: "Match", doi: "https://doi.org/10.1/test" },
    { title: "No safe link", doi: "javascript:alert(1)" }
  ]), {
    links: [{ title: "Match", url: "https://doi.org/10.1/test" }],
    missingLinks: 1
  });
  assert.equal(safeUrl("javascript:alert(1)"), null);
});
