(function (root) {
  "use strict";

  function keywordsFrom(text) {
    return text.split(",").map((word) => word.trim().toLocaleLowerCase()).filter(Boolean);
  }

  function searchQuery(keywords) {
    if (!keywords.length || keywords.some((word) => /["\\]/.test(word))) return null;
    return keywords.map((word) => `"${word}"`).join(" AND ");
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

  function linksCsv(items) {
    function cell(value) {
      const safe = /^[\s\u0000-\u001f]*[=+\-@]/.test(value) ? `'${value}` : value;
      return `"${safe.replace(/"/g, '""')}"`;
    }
    return "\uFEFF" + [
      "Titlu,URL",
      ...items.map((item) => `${cell(item.title)},${cell(item.url)}`)
    ].join("\r\n") + "\r\n";
  }

  function openAlexLinks(works) {
    const links = [];
    let missingLinks = 0;
    for (const work of works) {
      const url = safeUrl(work.primary_location?.landing_page_url) || safeUrl(work.doi);
      if (!url || typeof work.title !== "string" || !work.title.trim()) {
        missingLinks++;
        continue;
      }
      links.push({ title: work.title.trim(), url });
    }
    return { links, missingLinks };
  }

  function scienceDirectLinks(results) {
    const links = [];
    let missingLinks = 0;
    for (const result of results) {
      const url = safeUrl(result.uri);
      const host = url ? new URL(url).hostname.toLowerCase() : "";
      if (!url || new URL(url).protocol !== "https:" ||
          (host !== "sciencedirect.com" && !host.endsWith(".sciencedirect.com")) ||
          typeof result.title !== "string" || !result.title.trim()) {
        missingLinks++;
        continue;
      }
      links.push({ title: result.title.trim(), url });
    }
    return { links, missingLinks };
  }

  const core = { keywordsFrom, searchQuery, safeUrl, openAlexLinks, scienceDirectLinks, linksCsv };
  if (typeof module !== "undefined" && module.exports) module.exports = core;
  root.ArticleCore = core;
})(globalThis);
