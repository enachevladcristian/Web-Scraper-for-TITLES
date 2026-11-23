"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ArticleCore = require("./core.js");

function app(fetch) {
  class Element {
    constructor() {
      this.value = "";
      this.textContent = "";
      this.children = [];
      this.listeners = {};
      this.hidden = false;
    }
    addEventListener(name, callback) { this.listeners[name] = callback; }
    setAttribute() {}
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    querySelectorAll() { return this.children; }
    focus() {}
  }
  const elements = new Map();
  const document = {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, new Element());
      return elements.get(id);
    },
    createElement() { return new Element(); }
  };
  const storage = new Map();
  const localStorage = {
    getItem: (key) => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, value)
  };
  const context = { ArticleCore, document, localStorage, URL, fetch };
  vm.runInNewContext(fs.readFileSync("app.js", "utf8"), context);
  const get = (id) => document.getElementById(id);
  get("keyword-list").children = [{ value: "climate, biodiversity" }];
  get("source").value = "sciencedirect";
  get("elsevier-key").value = "test-key";
  return { get, storage, submit: () => get("search-form").listeners.submit({ preventDefault() {} }) };
}

test("ScienceDirect search returns links without fetching abstracts", async () => {
  const calls = [];
  const instance = app(async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).includes("api.elsevier.com")) return {
      ok: true, json: async () => ({ resultsFound: 2, results: [
        { title: "Match", doi: "10.1016/abc", uri: "https://www.sciencedirect.com/science/article/pii/test" },
        { title: "No DOI", uri: "https://www.sciencedirect.com/science/article/pii/missing" }
      ] })
    };
    throw new Error("Unexpected request");
  });
  instance.submit();
  await new Promise(setImmediate);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.method, "PUT");
  assert.equal(calls[0].options.headers["X-ELS-APIKey"], "test-key");
  assert.equal(JSON.parse(calls[0].options.body).qs, '"climate" AND "biodiversity"');
  assert.match(instance.get("search-status").textContent, /2 linkuri din 2/);
  const row = instance.get("results").children[0];
  assert.equal(row.children[0].href, "https://www.sciencedirect.com/science/article/pii/test");
  row.children[1].listeners.click();
  const saved = JSON.parse(instance.storage.get("article-links-v1"));
  assert.deepEqual(saved, [{ title: "Match", url: "https://www.sciencedirect.com/science/article/pii/test" }]);
});

test("OpenAlex search requests only link metadata", async () => {
  const calls = [];
  const instance = app(async (url) => {
    calls.push(String(url));
    return { ok: true, json: async () => ({ meta: { count: 1 }, results: [
      { title: "OpenAlex", doi: "https://doi.org/10.1/example" }
    ] }) };
  });
  instance.get("source").value = "openalex";
  instance.submit();
  await new Promise(setImmediate);
  const url = new URL(calls[0]);
  assert.equal(url.searchParams.get("search"), '"climate" AND "biodiversity"');
  assert.equal(url.searchParams.get("select"), "title,doi,primary_location");
  assert.match(instance.get("search-status").textContent, /1 linkuri din 1/);
});

test("ScienceDirect authentication errors are shown without trying another source", async () => {
  let requests = 0;
  const instance = app(async () => { requests++; return { ok: false, status: 403 }; });
  instance.submit();
  await new Promise(setImmediate);
  assert.equal(requests, 1);
  assert.match(instance.get("search-status").textContent, /ScienceDirect a răspuns cu HTTP 403/);
});
