/**
 * Liquidation Tracker - Logic
 */

// Центральний стан
let positions = [];
let currentSide = 'LONG';

// DOM Елементи
const form = document.getElementById('position-form');
const tickerInput = document.getElementById('ticker-input');
const entryInput = document.getElementById('entry-input');
const leverageInput = document.getElementById('leverage-input');
const sizeInput = document.getElementById('size-input');
const marginInput = document.getElementById('margin-input');
const positionsList = document.getElementById('positions-list');
const countBadge = document.getElementById('position-count');

// Pyth Integration
const PYTH_HERMES_URL = 'https://hermes.pyth.network/v2';
const feedIdCache = new Map();

/**
 * Знаходить Feed ID для тікера через пошук Pyth
 */
async function getFeedId(ticker) {
    if (feedIdCache.has(ticker)) return feedIdCache.get(ticker);

    try {
        const response = await fetch(`${PYTH_HERMES_URL}/price_feeds?query=${ticker}&asset_type=crypto`);
        const data = await response.json();
        
        // Шукаємо найбільш точний збіг (напр. Crypto.BTC/USD)
        const feed = data.find(f => 
            f.attributes.symbol.toUpperCase() === `${ticker}/USD` || 
            f.attributes.base.toUpperCase() === ticker
        ) || data[0];

        if (feed) {
            feedIdCache.set(ticker, feed.id);
            return feed.id;
        }
        return null;
    } catch (error) {
        console.error('Pyth Feed Search error:', error);
        return null;
    }
}

/**
 * Отримання ціни токена через Pyth Network Oracle
 */
async function fetchTokenPrice(ticker) {
    const feedId = await getFeedId(ticker);
    if (!feedId) return null;

    try {
        const response = await fetch(`${PYTH_HERMES_URL}/updates/price/latest?ids[]=${feedId}`);
        const data = await response.json();
        
        if (data.parsed && data.parsed.length > 0) {
            const priceData = data.parsed[0].price;
            const price = parseFloat(priceData.price) * Math.pow(10, priceData.expo);
            return price;
        }
        return null;
    } catch (error) {
        console.error('Pyth Price Fetch error:', error);
        return null;
    }
}

/**
 * Додавання нової позиції
 */
async function addPosition(e) {
    e.preventDefault();

    const ticker = tickerInput.value.trim().toUpperCase();
    const entry = parseFloat(entryInput.value);
    const leverage = parseFloat(leverageInput.value);
    const size = parseFloat(sizeInput.value);
    const margin = parseFloat(marginInput.value);

    // Розрахунок ліквідації для обох сторін
    const longLiq = entry * (1 - (1 / leverage));
    const shortLiq = entry * (1 + (1 / leverage));

    let currentPrice = entry;
    const fetchedPrice = await fetchTokenPrice(ticker);
    if (fetchedPrice) currentPrice = fetchedPrice;

    const newPosition = {
        id: Date.now(),
        ticker,
        entry,
        leverage,
        size,
        margin,
        longLiq,
        shortLiq,
        currentPrice,
        timestamp: new Date()
    };

    positions.push(newPosition);
    updateUI();
    form.reset();
}

/**
 * Видалення позиції
 */
function deletePosition(id) {
    positions = positions.filter(p => p.id !== id);
    updateUI();
}

/**
 * Оновлення інтерфейсу
 */
function updateUI() {
    if (positions.length === 0) {
        positionsList.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-mono-600 py-20">
                <svg class="w-12 h-12 mb-3 opacity-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
                <p class="text-[10px] uppercase tracking-widest font-bold">No active positions yet</p>
            </div>
        `;
        if (countBadge) countBadge.textContent = '0 active';
        return;
    }

    if (countBadge) countBadge.textContent = `${positions.length} active`;
    positionsList.innerHTML = '';

    positions.forEach(pos => {
        const card = document.createElement('div');
        card.className = 'position-card p-5 animate-fade-in bg-mono-800 rounded-md shadow-lg';
        
        card.innerHTML = `
            <div class="flex justify-between items-start mb-5">
                <div class="flex items-center gap-2">
                    <span class="text-base font-heading font-extrabold text-white tracking-widest uppercase">${pos.ticker}/USD</span>
                    <span class="bg-mono-700 px-2 py-0.5 rounded-sm text-[9px] text-mono-400 font-bold uppercase tracking-tighter">${pos.leverage}x</span>
                </div>
                <div class="flex flex-col items-end">
                    <button onclick="deletePosition(${pos.id})" class="text-mono-500 hover:text-white transition-colors mb-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                    <span class="text-[10px] font-bold text-mono-100">$${pos.currentPrice.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
            </div>

            <div class="space-y-3">
                <!-- LONG SIDE -->
                <div class="flex justify-between items-center bg-mono-700/50 p-4 rounded-md">
                    <div>
                        <p class="text-[9px] text-mono-500 uppercase tracking-[0.2em] font-bold mb-1">Long Liquidation</p>
                        <p class="text-lg font-bold text-mono-100">$${pos.longLiq.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                    </div>
                </div>

                <!-- SHORT SIDE -->
                <div class="flex justify-between items-center bg-mono-700/50 p-4 rounded-md">
                    <div>
                        <p class="text-[9px] text-mono-500 uppercase tracking-[0.2em] font-bold mb-1">Short Liquidation</p>
                        <p class="text-lg font-bold text-mono-100">$${pos.shortLiq.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                    </div>
                </div>
            </div>
            
            <div class="mt-5 pt-4 border-t border-mono-700/50 flex justify-between text-[9px] uppercase tracking-widest text-mono-500 font-bold">
                <span>Entry: $${pos.entry.toLocaleString()}</span>
                <span>Deposit: $${pos.margin.toLocaleString()}</span>
            </div>
        `;
        positionsList.appendChild(card);
    });
}

// Refresh Ring Logic
const refreshRing = document.getElementById('refresh-ring');
const REFRESH_INTERVAL = 10000; // 10 seconds
let timeLeft = REFRESH_INTERVAL;

async function refreshAllPrices() {
    for (let pos of positions) {
        const newPrice = await fetchTokenPrice(pos.ticker);
        if (newPrice) pos.currentPrice = newPrice;
    }
    updateUI();
}

function updateRefreshRing() {
    const dashArray = 62.83; // 2 * PI * r (r=10)
    const offset = (timeLeft / REFRESH_INTERVAL) * dashArray;
    refreshRing.style.strokeDashoffset = dashArray - offset;
    
    timeLeft -= 100;
    if (timeLeft < 0) {
        timeLeft = REFRESH_INTERVAL;
        refreshAllPrices();
    }
}

setInterval(updateRefreshRing, 100);

// Collapse Form Logic
const toggleFormBtn = document.getElementById('toggle-form-btn');
const formContainer = document.getElementById('form-container');
const toggleIcon = document.getElementById('toggle-icon');

toggleFormBtn.addEventListener('click', () => {
    const isHidden = formContainer.classList.contains('hidden');
    if (isHidden) {
        formContainer.classList.remove('hidden');
        toggleIcon.classList.remove('-rotate-180');
    } else {
        formContainer.classList.add('hidden');
        toggleIcon.classList.add('-rotate-180');
    }
});

// Події
form.addEventListener('submit', addPosition);

// Глобальний доступ для кнопок видалення
window.deletePosition = deletePosition;
