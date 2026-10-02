/* ============================================================
   CS2 UPGRADER — Прототип
   Локальные картинки из папки upgrader/
   ============================================================ */

/* ---------- БАЗА СКИНОВ ---------- */
const SKINS_DB = [
  // === ДЕШЁВЫЕ (10–50 ₽) ===
  { id: 1,  name: 'P250 | Sand Dune',      price: 15,   img: 'p250sand.png' },
  { id: 2,  name: 'MP9 | Storm',           price: 25,   img: 'mp9storm.png' },
  { id: 3,  name: 'Nova | Predator',       price: 40,   img: 'nova.png' },

  // === СРЕДНИЕ (50–300 ₽) ===
  { id: 4,  name: 'AK-47 | Redline',       price: 120,  img: 'ak47redline.png' },
  { id: 5,  name: 'M4A4 | Desolate Space', price: 200,  img: 'M4A4DesolateSpace.png' },
  { id: 6,  name: 'AWP | Atheris',         price: 280,  img: 'AWPAtheris.png' },

  // === ДОРОГИЕ (300–2000 ₽) ===
  { id: 7,  name: 'AK-47 | Asiimov',       price: 550,  img: 'AK47Asiimov.png' },
  { id: 8,  name: 'AWP | Neo-Noir',        price: 900,  img: 'AWPNeoNoir.png' },
  { id: 9,  name: 'M4A1-S | Printstream',  price: 1500, img: 'M4A1SPrintstream.png' },
  { id: 10, name: 'AWP | Dragon Lore',     price: 5000, img: 'AWPDragonLore.png' },
];

/* Заглушка на случай битой картинки */
const FALLBACK_IMG = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="60" height="45"><rect width="60" height="45" fill="%231e2c45"/><text x="50%" y="55%" fill="%237a8ba6" font-size="10" text-anchor="middle">SKIN</text></svg>';

/* ---------- СОСТОЯНИЕ ---------- */
let currentUser = null;
let inventory = [];
let selectedFrom = null;
let selectedTo = null;
let chance = 50;
let spinning = false;
let currentFilter = 'all';

/* ---------- УТИЛИТЫ ---------- */
const $ = (id) => document.getElementById(id);
const rand = (min, max) => Math.random() * (max - min) + min;
const randInt = (min, max) => Math.floor(rand(min, max + 1));

function saveUsers(users) { localStorage.setItem('upg_users', JSON.stringify(users)); }
function getUsers() { return JSON.parse(localStorage.getItem('upg_users') || '{}'); }

function saveSession(email) { localStorage.setItem('upg_session', email); }
function getSession() { return localStorage.getItem('upg_session'); }
function clearSession() { localStorage.removeItem('upg_session'); }

function saveUserData() {
  if (!currentUser) return;
  const users = getUsers();
  if (!users[currentUser.email]) return;
  users[currentUser.email].inventory = inventory;
  users[currentUser.email].balance = currentUser.balance;
  saveUsers(users);
}

/* ============================================================
   АВТОРИЗАЦИЯ
   ============================================================ */
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    tab.classList.add('active');
    $(tab.dataset.tab + 'Form').classList.add('active');
    $('loginError').textContent = '';
    $('regError').textContent = '';
  });
});

$('registerForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const email = $('regEmail').value.trim().toLowerCase();
  const p1 = $('regPassword').value;
  const p2 = $('regPassword2').value;
  const err = $('regError');
  err.style.color = '#ff4757';

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    err.textContent = 'Некорректный email';
    return;
  }
  if (p1.length < 4) {
    err.textContent = 'Пароль минимум 4 символа';
    return;
  }
  if (p1 !== p2) {
    err.textContent = 'Пароли не совпадают';
    return;
  }

  const users = getUsers();
  if (users[email]) {
    err.textContent = 'Такой аккаунт уже существует';
    return;
  }

  users[email] = {
    password: p1,
    balance: 1000,
    inventory: JSON.parse(JSON.stringify(SKINS_DB.slice(0, 3))),
  };
  saveUsers(users);
  err.style.color = '#00ff9d';
  err.textContent = 'Аккаунт создан! Входим...';
  setTimeout(() => loginUser(email), 700);
});

$('loginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const email = $('loginEmail').value.trim().toLowerCase();
  const pass = $('loginPassword').value;
  const err = $('loginError');

  const users = getUsers();
  if (!users[email]) {
    err.textContent = 'Аккаунт не найден. Зарегистрируйтесь.';
    return;
  }
  if (users[email].password !== pass) {
    err.textContent = 'Неверный пароль';
    return;
  }
  loginUser(email);
});

function loginUser(email) {
  const users = getUsers();
  currentUser = { email, balance: users[email].balance };
  inventory = users[email].inventory || [];
  saveSession(email);
  showApp();
}

$('logoutBtn').addEventListener('click', () => {
  clearSession();
  currentUser = null;
  location.reload();
});

window.addEventListener('load', () => {
  const session = getSession();
  if (session) {
    const users = getUsers();
    if (users[session]) {
      loginUser(session);
      return;
    }
  }
  $('authScreen').classList.remove('hidden');
});

/* ============================================================
   ОСНОВНОЙ ИНТЕРФЕЙС
   ============================================================ */
function showApp() {
  $('authScreen').classList.add('hidden');
  $('app').classList.remove('hidden');
  $('userEmailDisplay').textContent = currentUser.email;
  updateBalance();
  renderInventory();
  renderMarket();
  updateSpinButton();
  updateMultiplier();
}

function updateBalance() {
  $('balanceValue').textContent = currentUser.balance.toFixed(0);
  saveUserData();
}

/* ---------- ИНВЕНТАРЬ ---------- */
function renderInventory() {
  const el = $('inventory');
  el.innerHTML = '';
  if (inventory.length === 0) {
    el.innerHTML = '<p style="color:#45536b;font-size:13px;text-align:center;padding:20px">Инвентарь пуст</p>';
    return;
  }
  inventory.forEach(skin => {
    const div = document.createElement('div');
    div.className = 'inv-item' + (selectedFrom === skin.id ? ' selected' : '');
    div.innerHTML = `
      <img src="${skin.img}" alt="${skin.name}" onerror="this.onerror=null;this.src='${FALLBACK_IMG}'"/>
      <div class="info">
        <div class="name">${skin.name}</div>
        <div class="price">${skin.price} ₽</div>
      </div>
    `;
    div.addEventListener('click', () => selectFrom(skin.id));
    el.appendChild(div);
  });
}

function selectFrom(id) {
  if (spinning) return;
  selectedFrom = id;
  const skin = inventory.find(s => s.id === id);
  if (!skin) return;
  $('fromSlot').innerHTML = `<img src="${skin.img}" alt="${skin.name}" onerror="this.onerror=null;this.src='${FALLBACK_IMG}'"/>`;
  $('fromPrice').textContent = skin.price + ' ₽';
  $('fromSlot').parentElement.classList.add('filled');
  renderInventory();
  updateSpinButton();
}

/* ---------- МАРКЕТ ---------- */
function renderMarket() {
  const el = $('market');
  el.innerHTML = '';
  let list = SKINS_DB.slice();
  if (currentFilter === 'cheap') list = list.filter(s => s.price < 100);
  if (currentFilter === 'mid') list = list.filter(s => s.price >= 100 && s.price < 500);
  if (currentFilter === 'expensive') list = list.filter(s => s.price >= 500);

  list.forEach(skin => {
    const div = document.createElement('div');
    div.className = 'market-item' + (selectedTo === skin.id ? ' selected' : '');
    div.innerHTML = `
      <img src="${skin.img}" alt="${skin.name}" onerror="this.onerror=null;this.src='${FALLBACK_IMG}'"/>
      <div class="info">
        <div class="name">${skin.name}</div>
        <div class="price">${skin.price} ₽</div>
      </div>
    `;
    div.addEventListener('click', () => selectTo(skin.id));
    el.appendChild(div);
  });
}

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderMarket();
  });
});

function selectTo(id) {
  if (spinning) return;
  selectedTo = id;
  const skin = SKINS_DB.find(s => s.id === id);
  if (!skin) return;
  $('toSlot').innerHTML = `<img src="${skin.img}" alt="${skin.name}" onerror="this.onerror=null;this.src='${FALLBACK_IMG}'"/>`;
  $('toPrice').textContent = skin.price + ' ₽';
  $('toSlot').parentElement.classList.add('filled');
  renderMarket();
  updateSpinButton();
}

/* ---------- ШАНС И МНОЖИТЕЛЬ ---------- */
$('chanceSlider').addEventListener('input', (e) => {
  chance = parseInt(e.target.value);
  $('chanceLabel').textContent = chance + '%';
  updateMultiplier();
});

function updateMultiplier() {
  const mult = (100 / chance).toFixed(2);
  $('multiplierValue').textContent = 'x' + mult;
}

/* ---------- КНОПКА SPIN ---------- */
function updateSpinButton() {
  const btn = $('spinBtn');
  const ready = selectedFrom && selectedTo && !spinning;
  btn.disabled = !ready;
  if (!spinning) {
    if (!selectedFrom) btn.textContent = 'ВЫБЕРИТЕ СВОЙ СКИН';
    else if (!selectedTo) btn.textContent = 'ВЫБЕРИТЕ ЦЕЛЬ';
    else btn.textContent = 'НАЧАТЬ АПГРЕЙД';
  }
}

/* ============================================================
   РУЛЕТКА — ИСПРАВЛЕННАЯ ЛОГИКА
   ============================================================ */

const ITEM_WIDTH = 80;         // ширина одного элемента (совпадает с CSS)
const TOTAL_ITEMS = 60;        // всего элементов в ленте
const WIN_INDEX = 52;          // индекс выигрышного элемента

$('spinBtn').addEventListener('click', startUpgrade);

function startUpgrade() {
  if (spinning || !selectedFrom || !selectedTo) return;

  const fromSkin = inventory.find(s => s.id === selectedFrom);
  const toSkin = SKINS_DB.find(s => s.id === selectedTo);
  if (!fromSkin || !toSkin) return;

  if (toSkin.price <= fromSkin.price) {
    showResult('Целевой скин должен быть дороже!', 'lose');
    return;
  }

  spinning = true;
  $('result').textContent = '';
  $('result').className = 'result';
  $('spinBtn').disabled = true;
  $('spinBtn').textContent = 'КРУТИМ...';

  const win = Math.random() * 100 < chance;

  buildRoulette(win, toSkin, fromSkin);
  animateRoulette(win, () => {
    spinning = false;

    if (win) {
      inventory = inventory.filter(s => s.id !== selectedFrom);
      inventory.push({ ...toSkin, id: Date.now() });
      showResult(`🎉 ВЫИГРЫШ! ${toSkin.name}`, 'win');
    } else {
      inventory = inventory.filter(s => s.id !== selectedFrom);
      showResult(`💀 Проигрыш... ${fromSkin.name} потерян`, 'lose');
    }

    selectedFrom = null;
    selectedTo = null;
    $('fromSlot').innerHTML = '<span class="empty">Выберите скин</span>';
    $('fromPrice').textContent = '0 ₽';
    $('toSlot').innerHTML = '<span class="empty">Выберите цель</span>';
    $('toPrice').textContent = '0 ₽';
    $('fromSlot').parentElement.classList.remove('filled');
    $('toSlot').parentElement.classList.remove('filled');

    renderInventory();
    renderMarket();
    updateSpinButton();
    saveUserData();
  });
}

/* Строим ленту рулетки */
function buildRoulette(win, toSkin, fromSkin) {
  const track = $('rouletteTrack');
  track.innerHTML = '';
  // Мгновенно сбрасываем позицию БЕЗ transition
  track.style.transition = 'none';
  track.style.transform = 'translateX(0)';

  for (let i = 0; i < TOTAL_ITEMS; i++) {
    const item = document.createElement('div');
    item.className = 'roulette-item';

    let skin;
    if (i === WIN_INDEX) {
      skin = win ? toSkin : fromSkin;
      item.classList.add(win ? 'win' : 'lose');
    } else {
      skin = SKINS_DB[randInt(0, SKINS_DB.length - 1)];
    }

    item.innerHTML = `
      <img src="${skin.img}" alt="${skin.name}" onerror="this.onerror=null;this.src='${FALLBACK_IMG}'"/>
      <span>${skin.price}₽</span>
    `;
    track.appendChild(item);
  }

  // Форсируем reflow, чтобы браузер применил translateX(0)
  void track.offsetWidth;
}

/* Анимация прокрутки — БЕЗ выхода за пределы */
function animateRoulette(win, onComplete) {
  const wrapper = document.querySelector('.roulette-wrapper');
  const track = $('rouletteTrack');

  const wrapperWidth = wrapper.clientWidth;
  // Позиция центра контейнера
  const centerX = wrapperWidth / 2;

  // Куда нужно сдвинуть ленту, чтобы WIN_INDEX оказался под указателем
  // Каждый элемент имеет ширину ITEM_WIDTH, его центр = i*ITEM_WIDTH + ITEM_WIDTH/2
  const targetItemCenter = WIN_INDEX * ITEM_WIDTH + ITEM_WIDTH / 2;
  // Сдвиг = центр контейнера - центр элемента
  const baseOffset = centerX - targetItemCenter;

  // Небольшой случайный сдвиг ±25px, чтобы попадание выглядело естественно
  const jitter = rand(-25, 25);
  const finalX = baseOffset + jitter;

  // Применяем transition и сдвигаем
  track.style.transition = 'transform 4.2s cubic-bezier(0.12, 0.85, 0.2, 1)';
  track.style.transform = `translateX(${finalX}px)`;

  setTimeout(onComplete, 4300);
}

function showResult(text, type) {
  const el = $('result');
  el.textContent = text;
  el.className = 'result ' + type;
}