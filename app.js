"use strict";

const { keywordsFrom, matchesAbstract, safeUrl, matchingWorks } = ArticleCore;
const storageKey = "article-links-v1";
const elements = Object.fromEntries([
  "search-form", "keyword-list", "add-keyword", "api-key", "search-button", "search-status", "results", "next-page",
  "manual-form", "manual-title", "manual-url", "manual-abstract", "manual-status", "manual-result",
  "saved-list", "saved-count", "saved-status"
].map((id) => [id, document.getElementById(id)]));

let saved = [];
let search = null;
let busy = false;
let storageReadable = true;

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

async function fetchPage(page) {
  if (!search || busy) return;
  busy = true;
  elements["search-button"].disabled = true;
  elements["next-page"].disabled = true;
  elements["search-status"].textContent = "Se caută în OpenAlex…";
  elements.results.replaceChildren();
  try {
    const url = new URL("https://api.openalex.org/works");
    url.searchParams.set("search", search.keywords[0]);
    url.searchParams.set("per-page", "50");
    url.searchParams.set("page", String(page));
    url.searchParams.set("select", "title,doi,primary_location,abstract_inverted_index");
    const headers = {};
    if (search.apiKey) headers.Authorization = `Bearer ${search.apiKey}`;
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`OpenAlex a răspuns cu HTTP ${response.status}.`);
    const data = await response.json();
    if (!Array.isArray(data.results) || !data.meta || typeof data.meta.count !== "number") {
      throw new Error("OpenAlex a returnat un răspuns neașteptat.");
    }
    const { links, missingAbstracts, missingLinks } = matchingWorks(data.results, search.keywords);
    showMatches(elements.results, links);
    search.page = page;
    elements["search-status"].textContent = `Pagina ${page}: ${links.length} potriviri din ${data.results.length} rezultate verificate; ${missingAbstracts} fără rezumat disponibil${missingLinks ? `; ${missingLinks} fără titlu sau link valid` : ""}. OpenAlex indică ${data.meta.count} rezultate pentru prima expresie.`;
    elements["next-page"].hidden = data.results.length < 50 || page * 50 >= data.meta.count || page >= 200;
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
  search = { keywords, apiKey: elements["api-key"].value.trim(), page: 0 };
  elements["next-page"].hidden = true;
  fetchPage(1);
});

elements["next-page"].addEventListener("click", () => {
  if (search && !busy) fetchPage(search.page + 1);
});

elements["manual-form"].addEventListener("submit", (event) => {
  event.preventDefault();
  elements["manual-result"].replaceChildren();
  const keywords = currentKeywords();
  const url = safeUrl(elements["manual-url"].value);
  const title = elements["manual-title"].value.trim();
  const abstract = elements["manual-abstract"].value.trim();
  if (!keywords.length || !url || !title || !abstract) {
    elements["manual-status"].textContent = "Completează cuvintele cheie, titlul, un link HTTP(S) valid și rezumatul.";
    return;
  }
  const matches = matchesAbstract(abstract, keywords);
  elements["manual-abstract"].value = "";
  elements["manual-status"].textContent = matches ? "Rezumatul conține toate expresiile." : "Rezumatul nu conține toate expresiile.";
  if (matches) showMatches(elements["manual-result"], [{ title, url }]);
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
