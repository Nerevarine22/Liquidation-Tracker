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
    const longLiq = entry * (1 - (1 / leverage) * 1); // Спрощена формула
    const shortLiq = entry * (1 + (1 / leverage) * 1);

    const newPosition = {
        id: Date.now(),
        ticker,
        entry,
        leverage,
        size,
        margin,
        longLiq,
        shortLiq,
        currentPrice: entry, // Для ініціалізації
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
        if (countBadge) countBadge.textContent = '0 активних';
        return;
    }

    if (countBadge) countBadge.textContent = `${positions.length} активних`;
    positionsList.innerHTML = '';

    positions.forEach(pos => {
        const card = document.createElement('div');
        card.className = 'position-card p-6 animate-fade-in mb-4 bg-dark-800 border-dark-600 rounded-2xl';
        
        card.innerHTML = `
            <div class="flex justify-between items-start mb-6">
                <div class="flex items-center gap-3">
                    <span class="text-xl font-heading font-extrabold text-white tracking-tight">${pos.ticker}/USD</span>
                    <span class="bg-dark-600 px-2 py-1 rounded text-xs text-gray-400">${pos.leverage}x</span>
                </div>
                <button onclick="deletePosition(${pos.id})" class="text-gray-500 hover:text-white transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>

            <div class="space-y-4">
                <!-- LONG SIDE -->
                <div class="flex justify-between items-center bg-dark-700/50 p-4 rounded-xl border border-accent-success/10">
                    <div>
                        <p class="text-[10px] text-gray-500 uppercase tracking-widest mb-1">LONG LIQUIDATION</p>
                        <p class="text-lg font-bold text-white">$${pos.longLiq.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                    </div>
                </div>

                <!-- SHORT SIDE -->
                <div class="flex justify-between items-center bg-dark-700/50 p-4 rounded-xl border border-accent-danger/10">
                    <div>
                        <p class="text-[10px] text-gray-500 uppercase tracking-widest mb-1">SHORT LIQUIDATION</p>
                        <p class="text-lg font-bold text-white">$${pos.shortLiq.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                    </div>
                </div>
            </div>
            
            <div class="mt-6 pt-4 border-t border-dark-600 flex justify-between text-[10px] uppercase text-gray-500">
                <span>Entry: $${pos.entry.toLocaleString()}</span>
                <span>Deposit: $${pos.margin.toLocaleString()}</span>
            </div>
        `;
        positionsList.appendChild(card);
    });
}

// Події
form.addEventListener('submit', addPosition);

// Глобальний доступ для кнопок видалення
window.deletePosition = deletePosition;
