"use strict";

const { keywordsFrom, searchQuery, safeUrl, openAlexLinks, scienceDirectLinks, linksCsv } = ArticleCore;
const storageKey = "article-links-v1";
const elements = Object.fromEntries([
  "search-form", "source", "keyword-list", "add-keyword", "api-key", "openalex-key-field", "elsevier-key", "search-button", "search-status", "results", "next-page",
  "saved-list", "saved-count", "saved-status", "export-csv"
].map((id) => [id, document.getElementById(id)]));

let saved = [];
let search = null;
let busy = false;
let storageReadable = true;

elements.source.addEventListener("change", () => {
  elements["openalex-key-field"].hidden = elements.source.value !== "openalex";
});

function currentKeywords() {
  return Array.from(elements["keyword-list"].querySelectorAll(".keyword-input"))
    .flatMap((input) => keywordsFrom(input.value));
}

elements["add-keyword"].addEventListener("click", () => {
  const row = document.createElement("div");
  row.className = "keyword-row";
  const input = document.createElement("input");
  input.type = "text";
  input.className = "keyword-input";
  input.placeholder = "Alt cuvânt sau expresie";
  input.setAttribute("aria-label", "Cuvânt sau expresie suplimentară");
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "secondary";
  remove.textContent = "Elimină";
  remove.setAttribute("aria-label", "Elimină acest cuvânt cheie");
  remove.addEventListener("click", () => {
    row.remove();
    elements["add-keyword"].focus();
  });
  row.append(input, remove);
  elements["keyword-list"].append(row);
  input.focus();
});

function showSaved() {
  elements["saved-list"].replaceChildren();
  elements["saved-count"].textContent = `${saved.length} ${saved.length === 1 ? "link" : "linkuri"}`;
  elements["export-csv"].disabled = !saved.length;
  if (!saved.length) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "Încă nu ai salvat niciun link.";
    elements["saved-list"].append(empty);
    return;
  }
  for (const item of saved) {
    elements["saved-list"].append(linkRow(item, "Elimină", () => {
      persist(saved.filter((entry) => entry.url !== item.url));
    }));
  }
}

elements["export-csv"].addEventListener("click", () => {
  if (!saved.length) return;
  const blob = new Blob([linksCsv(saved)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "articole.csv";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

function persist(items) {
  if (!storageReadable) {
    elements["saved-status"].textContent = "Lista locală nu poate fi modificată deoarece datele existente nu au putut fi citite.";
    return;
  }
  try {
    localStorage.setItem(storageKey, JSON.stringify(items));
    saved = items;
    elements["saved-status"].textContent = "";
    showSaved();
  } catch (error) {
    elements["saved-status"].textContent = "Lista nu a putut fi salvată în browser. Verifică setările de stocare.";
  }
}

function saveLink(item) {
  if (saved.some((entry) => entry.url === item.url)) {
    elements["saved-status"].textContent = "Acest link este deja în listă.";
    return;
  }
  persist([...saved, item]);
  if (saved.some((entry) => entry.url === item.url)) {
    elements["saved-status"].textContent = "Link salvat local.";
  }
}

function linkRow(item, buttonText, action) {
  const row = document.createElement("li");
  const link = document.createElement("a");
  link.href = item.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = item.title;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "small-button";
  button.textContent = buttonText;
  button.addEventListener("click", action);
  row.append(link, button);
  return row;
}

function showMatches(container, links) {
  container.replaceChildren();
  for (const item of links) container.append(linkRow(item, "Salvează", () => saveLink(item)));
}

async function openAlexRequest(url) {
  const headers = {};
  if (search.apiKey) headers.Authorization = `Bearer ${search.apiKey}`;
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`OpenAlex a răspuns cu HTTP ${response.status}`);
  const data = await response.json();
  if (!Array.isArray(data.results) || !data.meta || typeof data.meta.count !== "number") {
    throw new Error("OpenAlex a returnat un răspuns neașteptat");
  }
  return data;
}

async function openAlexPage(page) {
  const url = new URL("https://api.openalex.org/works");
  url.searchParams.set("search", search.query);
  url.searchParams.set("per-page", "50");
  url.searchParams.set("page", String(page));
  url.searchParams.set("select", "title,doi,primary_location");
  const data = await openAlexRequest(url);
  return { ...openAlexLinks(data.results), checked: data.results.length,
    count: data.meta.count, more: data.results.length === 50 && page * 50 < data.meta.count && page < 200 };
}

async function scienceDirectPage(page) {
  const response = await fetch("https://api.elsevier.com/content/search/sciencedirect", {
    method: "PUT",
    headers: { "Content-Type": "application/json", "Accept": "application/json", "X-ELS-APIKey": search.elsevierKey },
    body: JSON.stringify({ qs: search.query, display: { offset: (page - 1) * 50, show: 50 } })
  });
  if (!response.ok) throw new Error(`ScienceDirect a răspuns cu HTTP ${response.status}; verifică accesul API și limita cheii`);
  const data = await response.json();
  if (!Array.isArray(data.results) || typeof data.resultsFound !== "number" ||
      data.results.some((item) => !item || typeof item !== "object")) {
    throw new Error("ScienceDirect a returnat un răspuns neașteptat");
  }
  return { ...scienceDirectLinks(data.results), checked: data.results.length,
    count: data.resultsFound, more: data.results.length === 50 && page * 50 < data.resultsFound && page * 50 <= 6000 };
}

async function fetchPage(page) {
  if (!search || busy) return;
  busy = true;
  elements["search-button"].disabled = true;
  elements["next-page"].disabled = true;
  elements["search-status"].textContent = search.source === "sciencedirect" ? "Se caută în ScienceDirect…" : "Se caută în OpenAlex…";
  elements.results.replaceChildren();
  try {
    const { links, missingLinks, checked, count, more } = search.source === "sciencedirect"
      ? await scienceDirectPage(page) : await openAlexPage(page);
    showMatches(elements.results, links);
    search.page = page;
    const sourceName = search.source === "sciencedirect" ? "ScienceDirect" : "OpenAlex";
    elements["search-status"].textContent = `Pagina ${page}: ${links.length} linkuri din ${checked} rezultate${missingLinks ? `; ${missingLinks} fără titlu sau link valid` : ""}. ${sourceName} indică ${count} rezultate pentru căutare.`;
    elements["next-page"].hidden = !more;
  } catch (error) {
    elements["search-status"].textContent = `Căutarea nu a reușit: ${error.message}. Verifică conexiunea, limitele sau cheia API; încearcă din nou.`;
    elements["next-page"].hidden = search.page === 0;
  } finally {
    busy = false;
    elements["search-button"].disabled = false;
    elements["next-page"].disabled = false;
  }
}

elements["search-form"].addEventListener("submit", (event) => {
  event.preventDefault();
  if (busy) return;
  const keywords = currentKeywords();
  if (!keywords.length) {
    elements["search-status"].textContent = "Introdu cel puțin un cuvânt sau o expresie.";
    return;
  }
  const source = elements.source.value;
  const query = searchQuery(keywords);
  if (!query) {
    elements["search-status"].textContent = "Cuvintele cheie nu pot conține ghilimele sau caracterul backslash.";
    return;
  }
  const elsevierKey = elements["elsevier-key"].value.trim();
  if (source === "sciencedirect" && !elsevierKey) {
    elements["search-status"].textContent = "Introdu o cheie Elsevier cu acces la ScienceDirect Search API.";
    return;
  }
  if (source === "sciencedirect" && query.length > 250) {
    elements["search-status"].textContent = "Căutarea combinată poate avea cel mult 250 de caractere pentru ScienceDirect.";
    return;
  }
  search = { source, query, apiKey: elements["api-key"].value.trim(), elsevierKey, page: 0 };
  elements["next-page"].hidden = true;
  fetchPage(1);
});

elements["next-page"].addEventListener("click", () => {
  if (search && !busy) fetchPage(search.page + 1);
});

try {
  const stored = JSON.parse(localStorage.getItem(storageKey) || "[]");
  if (!Array.isArray(stored) || stored.some((item) => !item || typeof item.title !== "string" || !safeUrl(item.url))) {
    throw new Error("invalid saved data");
  }
  saved = stored.map((item) => ({ title: item.title, url: safeUrl(item.url) }));
} catch (error) {
  storageReadable = false;
  elements["saved-status"].textContent = "Lista locală nu a putut fi citită. Verifică datele și setările browserului înainte de a salva linkuri noi.";
}
showSaved();
