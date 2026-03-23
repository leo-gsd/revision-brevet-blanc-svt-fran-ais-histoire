const STORAGE_KEY = 'revision_cards_v1';
const FILE_IDS = [1, 2, 3];
const TAB_IDS = [1, 2, 3, 4];

const FILE_LABELS = {
  1: 'Histoire-géographie',
  2: 'Français',
  3: 'SVT'
};

function prefersReducedMotion() {
  return typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function scrollToElement(el) {
  if (!el) return;
  el.scrollIntoView({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block: 'start'
  });
}

let cardsData = [];
let editingIndex = null;
let activeFile = 1;
let lastDataTab = 1;

function normalizeCard(c) {
  const fileId = FILE_IDS.includes(c.fileId) ? c.fileId : 1;
  return {
    title: c.title ?? '',
    content: c.content ?? '',
    link: c.link ?? '',
    fileId
  };
}

function migrateCards(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((c) => normalizeCard(typeof c === 'object' && c ? c : {}));
}

function isRepertoireTab() {
  return activeFile === 4;
}

function parseSearchWords(query) {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

function cardMatchesSearch(card, words) {
  if (words.length === 0) return true;
  const hay = `${card.title} ${card.content} ${card.link || ''}`.toLowerCase();
  return words.every((w) => hay.includes(w));
}

function createCardElement(cardData, globalIndex) {
  const card = document.createElement('div');
  card.className = 'card';

  const h3 = document.createElement('h3');
  h3.textContent = cardData.title;

  const p = document.createElement('p');
  p.textContent = cardData.content;

  card.appendChild(h3);
  card.appendChild(p);

  if (cardData.link) {
    const a = document.createElement('a');
    a.href = cardData.link;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = 'Voir le lien';
    card.appendChild(a);
  }

  const actions = document.createElement('div');
  actions.className = 'card-actions';

  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = 'btn-edit';
  editBtn.textContent = 'Modifier';
  editBtn.addEventListener('click', () => startEdit(globalIndex));

  const delBtn = document.createElement('button');
  delBtn.type = 'button';
  delBtn.className = 'btn-delete';
  delBtn.textContent = 'Supprimer';
  delBtn.addEventListener('click', () => deleteCard(globalIndex));

  actions.appendChild(editBtn);
  actions.appendChild(delBtn);
  card.appendChild(actions);

  return card;
}

function excerpt(text, maxLen) {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1)}…`;
}

function createCatalogItem(cardData, globalIndex) {
  const item = document.createElement('article');
  item.className = 'catalog-item';

  const head = document.createElement('div');
  head.className = 'catalog-item-head';

  const titleEl = document.createElement('h3');
  titleEl.className = 'catalog-item-title';
  titleEl.textContent = cardData.title;

  const badge = document.createElement('span');
  badge.className = 'file-badge';
  badge.textContent = FILE_LABELS[cardData.fileId] || `Fichier ${cardData.fileId}`;

  head.appendChild(titleEl);
  head.appendChild(badge);

  const body = document.createElement('p');
  body.className = 'catalog-item-body';
  body.textContent = excerpt(cardData.content, 200);

  item.appendChild(head);
  item.appendChild(body);

  if (cardData.link) {
    const linkRow = document.createElement('p');
    linkRow.className = 'catalog-item-link';
    const a = document.createElement('a');
    a.href = cardData.link;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = cardData.link;
    linkRow.appendChild(a);
    item.appendChild(linkRow);
  }

  const actions = document.createElement('div');
  actions.className = 'catalog-item-actions';

  const goBtn = document.createElement('button');
  goBtn.type = 'button';
  goBtn.className = 'btn-catalog';
  goBtn.textContent = 'Voir la matière';
  goBtn.addEventListener('click', () => goToRevisionFile(cardData.fileId));

  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = 'btn-edit';
  editBtn.textContent = 'Modifier';
  editBtn.addEventListener('click', () => startEdit(globalIndex));

  const delBtn = document.createElement('button');
  delBtn.type = 'button';
  delBtn.className = 'btn-delete';
  delBtn.textContent = 'Supprimer';
  delBtn.addEventListener('click', () => deleteCard(globalIndex));

  actions.appendChild(goBtn);
  actions.appendChild(editBtn);
  actions.appendChild(delBtn);
  item.appendChild(actions);

  return item;
}

function renderCatalog() {
  const list = document.getElementById('catalog-list');
  const hint = document.getElementById('catalog-hint');
  const input = document.getElementById('nav-search');
  if (!list || !hint || !input) return;

  const words = parseSearchWords(input.value);
  list.innerHTML = '';

  const matches = [];
  cardsData.forEach((card, globalIndex) => {
    if (cardMatchesSearch(card, words)) matches.push({ card, globalIndex });
  });

  if (cardsData.length === 0) {
    hint.textContent = 'Aucune fiche pour le moment.';
  } else if (matches.length === 0) {
    hint.textContent = 'Aucun résultat pour cette recherche.';
  } else if (words.length === 0) {
    hint.textContent = `${matches.length} fiche(s) au total. Saisissez des mots-clés pour affiner la liste.`;
  } else {
    hint.textContent = `${matches.length} fiche(s) correspondent à votre recherche.`;
  }

  matches.forEach(({ card, globalIndex }) => {
    list.appendChild(createCatalogItem(card, globalIndex));
  });

  updateTabsCount();
}

function goToRevisionFile(fileId) {
  setActiveFile(fileId);
  const cardsEl = document.getElementById('cards');
  scrollToElement(cardsEl);
}

function setFormMode(isEditing) {
  const submitBtn = document.getElementById('submit-btn');
  const cancelBtn = document.getElementById('cancel-edit-btn');
  const sectionTitle = document.querySelector('.input-section h2');
  submitBtn.textContent = isEditing ? 'Enregistrer' : 'Ajouter';
  cancelBtn.hidden = !isEditing;
  sectionTitle.textContent = isEditing ? 'Modifier la fiche' : 'Ajouter une fiche';
}

function getFileSelectValue() {
  const v = parseInt(document.getElementById('file-select').value, 10);
  return FILE_IDS.includes(v) ? v : 1;
}

function setFileSelectValue(fileId) {
  const id = FILE_IDS.includes(fileId) ? fileId : 1;
  document.getElementById('file-select').value = String(id);
}

function startEdit(globalIndex) {
  editingIndex = globalIndex;
  const c = cardsData[globalIndex];
  document.getElementById('title').value = c.title;
  document.getElementById('content').value = c.content;
  document.getElementById('link').value = c.link || '';
  setFileSelectValue(c.fileId);
  setFormMode(true);
  scrollToElement(document.querySelector('.input-section'));
}

function cancelEdit() {
  editingIndex = null;
  document.getElementById('title').value = '';
  document.getElementById('content').value = '';
  document.getElementById('link').value = '';
  setFileSelectValue(isRepertoireTab() ? lastDataTab : activeFile <= 3 ? activeFile : lastDataTab);
  setFormMode(false);
}

function deleteCard(globalIndex) {
  if (!confirm('Souhaitez-vous vraiment supprimer cette fiche ?')) return;
  if (editingIndex === globalIndex) {
    cancelEdit();
  } else if (editingIndex !== null && editingIndex > globalIndex) {
    editingIndex -= 1;
  }
  cardsData.splice(globalIndex, 1);
  saveCards();
  renderCards();
  if (isRepertoireTab()) renderCatalog();
}

function saveCards() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cardsData));
}

function updateTabsCount() {
  FILE_IDS.forEach((id) => {
    const n = cardsData.filter((c) => c.fileId === id).length;
    const el = document.querySelector(`[data-file-tab="${id}"] .tab-count`);
    if (el) el.textContent = `(${n})`;
  });
  const total = cardsData.length;
  const el4 = document.querySelector('[data-file-tab="4"] .tab-count');
  if (el4) el4.textContent = `(${total})`;
}

function updateMainPanels() {
  const rep = document.getElementById('repertoire-view');
  const cardsSec = document.getElementById('cards');
  if (!rep || !cardsSec) return;
  if (isRepertoireTab()) {
    rep.hidden = false;
    cardsSec.hidden = true;
  } else {
    rep.hidden = true;
    cardsSec.hidden = false;
  }
}

function setActiveFile(fileId) {
  if (!TAB_IDS.includes(fileId)) return;
  activeFile = fileId;
  if (fileId <= 3) lastDataTab = fileId;

  document.querySelectorAll('.file-tab').forEach((btn) => {
    btn.classList.toggle('active', parseInt(btn.dataset.fileTab, 10) === fileId);
  });

  if (editingIndex !== null) cancelEdit();

  if (fileId <= 3) {
    setFileSelectValue(fileId);
  }

  updateMainPanels();

  if (isRepertoireTab()) {
    renderCatalog();
  } else {
    renderCards();
  }
}

function renderCards() {
  const container = document.getElementById('cards');
  container.innerHTML = '';

  if (isRepertoireTab()) {
    updateTabsCount();
    return;
  }

  cardsData.forEach((cardData, globalIndex) => {
    if (cardData.fileId !== activeFile) return;
    container.appendChild(createCardElement(cardData, globalIndex));
  });

  updateTabsCount();
}

function loadCards() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    cardsData = migrateCards(parsed);
    saveCards();
  } catch {
    cardsData = [];
  }

  setActiveFile(activeFile);
}

function saveCard() {
  const titleInput = document.getElementById('title');
  const contentInput = document.getElementById('content');
  const linkInput = document.getElementById('link');

  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  const link = linkInput.value.trim();
  const fileId = getFileSelectValue();

  if (!title || !content) {
    alert('Indiquez au moins le titre et le texte.');
    return;
  }

  const entry = { title, content, link: link || '', fileId };

  if (editingIndex !== null) {
    cardsData[editingIndex] = entry;
    editingIndex = null;
    setFormMode(false);
  } else {
    cardsData.push(entry);
  }

  saveCards();
  titleInput.value = '';
  contentInput.value = '';
  linkInput.value = '';

  if (isRepertoireTab()) {
    setFileSelectValue(entry.fileId);
    renderCatalog();
    return;
  }

  setFileSelectValue(activeFile);

  if (entry.fileId !== activeFile) {
    setActiveFile(entry.fileId);
  } else {
    renderCards();
  }
}

function initNavSearch() {
  const navSearch = document.getElementById('nav-search');
  if (!navSearch) return;
  navSearch.addEventListener('input', renderCatalog);
  navSearch.addEventListener('search', renderCatalog);
}

function init() {
  document.querySelectorAll('.file-tab').forEach((btn) => {
    btn.addEventListener('click', () => setActiveFile(parseInt(btn.dataset.fileTab, 10)));
  });
  initNavSearch();
  loadCards();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
