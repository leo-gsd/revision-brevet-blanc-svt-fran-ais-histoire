const STORAGE_KEY = 'revision_cards_v1';
let cardsData = [];

function createCardElement({ title, content, link }) {
  const card = document.createElement('div');
  card.className = 'card';

  const h3 = document.createElement('h3');
  h3.textContent = title;

  const p = document.createElement('p');
  p.textContent = content;

  card.appendChild(h3);
  card.appendChild(p);

  if (link) {
    const a = document.createElement('a');
    a.href = link;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = 'Voir le lien';
    card.appendChild(a);
  }

  return card;
}

function saveCards() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cardsData));
}

function renderCards() {
  const container = document.getElementById('cards');
  container.innerHTML = '';

  for (const cardData of cardsData) {
    container.appendChild(createCardElement(cardData));
  }
}

function loadCards() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cardsData = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(cardsData)) cardsData = [];
  } catch {
    cardsData = [];
  }

  renderCards();
}

// Fonction globale appelée par onclick="addCard()"
function addCard() {
  const titleInput = document.getElementById('title');
  const contentInput = document.getElementById('content');
  const linkInput = document.getElementById('link');

  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  const link = linkInput.value.trim();

  if (!title || !content) {
    alert('Remplis au moins le titre et le texte !');
    return;
  }

  cardsData.push({
    title,
    content,
    link: link || ''
  });

  saveCards();

  // Ajout immédiat à l'écran (sans re-render tout)
  document.getElementById('cards').appendChild(createCardElement(cardsData[cardsData.length - 1]));

  // reset
  titleInput.value = '';
  contentInput.value = '';
  linkInput.value = '';
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadCards);
} else {
  loadCards();
}
  