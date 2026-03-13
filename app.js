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
const sideLongBtn = document.getElementById('side-long');
const sideShortBtn = document.getElementById('side-short');
const positionsList = document.getElementById('positions-list');
const countBadge = document.getElementById('position-count');
const loader = document.getElementById('loader');

/**
 * Отримання ціни токена через DEX Screener API
 * @param {string} ticker - Тікер токена
 * @returns {Promise<number|null>} - Ціна в USD або null
 */
async function fetchTokenPrice(ticker) {
    try {
        const response = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${ticker}`);
        const data = await response.json();

        if (!data.pairs || data.pairs.length === 0) {
            console.error('Пари не знайдено для:', ticker);
            return null;
        }

        // Знаходимо пару з найбільшою ліквідністю
        const bestPair = data.pairs.reduce((prev, current) => {
            const prevLiq = prev.liquidity?.usd || 0;
            const currLiq = current.liquidity?.usd || 0;
            return (currLiq > prevLiq) ? current : prev;
        });

        console.log(`Найкраща пара для ${ticker}: ${bestPair.baseToken.symbol}/${bestPair.quoteToken.symbol} на ${bestPair.dexId}`);
        return parseFloat(bestPair.priceUsd);
    } catch (error) {
        console.error('Помилка отримання ціни:', error);
        return null;
    }
}

/**
 * Розрахунок ціни ліквідації
 */
function calculateLiquidation(entry, leverage, side) {
    if (side === 'LONG') {
        return entry * (1 - (1 / leverage) * 0.95); // 0.95 - запас безпеки
    } else {
        return entry * (1 + (1 / leverage) * 0.95);
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

    showLoader(true);
    
    const currentPrice = await fetchTokenPrice(ticker);
    
    showLoader(false);

    if (currentPrice === null) {
        alert('Не вдалося знайти ціну для цього тікера. Перевірте назву.');
        return;
    }

    const liqPrice = calculateLiquidation(entry, leverage, currentSide);

    const newPosition = {
        id: Date.now(),
        ticker,
        entry,
        leverage,
        side: currentSide,
        currentPrice,
        liqPrice,
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
            <div class="flex flex-col items-center justify-center h-full text-gray-500 py-20">
                <svg class="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
                <p>Поки немає активних позицій</p>
            </div>
        `;
        countBadge.textContent = '0 активних';
        return;
    }

    countBadge.textContent = `${positions.length} активних`;
    positionsList.innerHTML = '';

    positions.forEach(pos => {
        const pnl = pos.side === 'LONG' 
            ? ((pos.currentPrice - pos.entry) / pos.entry) * 100 * pos.leverage
            : ((pos.entry - pos.currentPrice) / pos.entry) * 100 * pos.leverage;

        const isProfit = pnl >= 0;
        
        const card = document.createElement('div');
        card.className = 'position-card p-6 animate-fade-in';
        card.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div class="flex items-center gap-3">
                    <div class="bg-dark-600 p-2 rounded-lg">
                        <span class="font-bold text-accent-primary">${pos.ticker}</span>
                    </div>
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold ${pos.side === 'LONG' ? 'bg-accent-success/20 text-accent-success' : 'bg-accent-danger/20 text-accent-danger'} uppercase">
                        ${pos.side} ${pos.leverage}x
                    </span>
                </div>
                <button onclick="deletePosition(${pos.id})" class="text-gray-500 hover:text-white transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                    <p class="text-[10px] text-gray-500 uppercase">Ціна входу</p>
                    <p class="font-medium">$${pos.entry.toLocaleString()}</p>
                </div>
                <div>
                    <p class="text-[10px] text-gray-500 uppercase">Поточна ціна</p>
                    <p class="font-medium">$${pos.currentPrice.toLocaleString()}</p>
                </div>
                <div>
                    <p class="text-[10px] text-gray-500 uppercase">Ліквідація</p>
                    <p class="font-medium text-accent-danger">$${pos.liqPrice.toLocaleString()}</p>
                </div>
                <div class="text-right">
                    <p class="text-[10px] text-gray-500 uppercase">ROE %</p>
                    <p class="font-bold ${isProfit ? 'text-accent-success' : 'text-accent-danger'}">
                        ${isProfit ? '+' : ''}${pnl.toFixed(2)}%
                    </p>
                </div>
            </div>
            
            <div class="risk-bar">
                <div class="risk-level bg-accent-primary" style="width: ${Math.min(Math.max(100 - Math.abs(pnl)/5, 10), 100)}%"></div>
            </div>
        `;
        positionsList.appendChild(card);
    });
}

/**
 * Перемикання Long/Short
 */
function setSide(side) {
    currentSide = side;
    if (side === 'LONG') {
        sideLongBtn.className = 'flex-1 py-3 rounded-xl bg-accent-success/20 text-accent-success border border-accent-success/50 font-semibold active-side';
        sideShortBtn.className = 'flex-1 py-3 rounded-xl bg-dark-700 text-gray-400 border border-dark-600 font-semibold';
    } else {
        sideShortBtn.className = 'flex-1 py-3 rounded-xl bg-accent-danger/20 text-accent-danger border border-accent-danger/50 font-semibold active-side';
        sideLongBtn.className = 'flex-1 py-3 rounded-xl bg-dark-700 text-gray-400 border border-dark-600 font-semibold';
    }
}

function showLoader(show) {
    loader.classList.toggle('hidden', !show);
}

// Події
form.addEventListener('submit', addPosition);
sideLongBtn.addEventListener('click', () => setSide('LONG'));
sideShortBtn.addEventListener('click', () => setSide('SHORT'));

// Глобальний доступ для кнопок видалення (в Vanilla JS через onclick)
window.deletePosition = deletePosition;
