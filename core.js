(function (root) {
  "use strict";

  function keywordsFrom(text) {
    return text.split(",").map((word) => word.trim().toLocaleLowerCase()).filter(Boolean);
  }

  function matchesAbstract(abstract, keywords) {
    if (!abstract || !keywords.length) return false;
    const text = abstract.toLocaleLowerCase();
    return keywords.every((word) => text.includes(word));
  }

  function reconstructAbstract(index) {
    if (!index || typeof index !== "object" || Array.isArray(index)) return "";
    const words = [];
    for (const [word, positions] of Object.entries(index)) {
      if (!Array.isArray(positions)) continue;
      for (const position of positions) {
        if (Number.isInteger(position) && position >= 0 && position < 100000) words[position] = word;
      }
    }
    return words.join(" ").trim();
  }

  function safeUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
    } catch (error) {
      if (error instanceof TypeError) return null;
      throw error;
    }
  }

  function matchingWorks(works, keywords) {
    const links = [];
    let missingAbstracts = 0;
    let missingLinks = 0;
    for (const work of works) {
      const abstract = reconstructAbstract(work.abstract_inverted_index);
      if (!abstract) {
        missingAbstracts++;
        continue;
      }
      if (!matchesAbstract(abstract, keywords)) continue;
      const url = safeUrl(work.primary_location?.landing_page_url) || safeUrl(work.doi);
      if (!url || typeof work.title !== "string" || !work.title.trim()) {
        missingLinks++;
        continue;
      }
      links.push({ title: work.title.trim(), url });
    }
    return { links, missingAbstracts, missingLinks };
  }

  const core = { keywordsFrom, matchesAbstract, reconstructAbstract, safeUrl, matchingWorks };
  if (typeof module !== "undefined" && module.exports) module.exports = core;
  root.ArticleCore = core;
})(globalThis);
