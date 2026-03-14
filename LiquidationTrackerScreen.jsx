import React, { useState, useEffect, useCallback } from 'react';

const PYTH_HERMES_URL = 'https://hermes.pyth.network/v2';

const LiquidationTrackerScreen = () => {
  const [positions, setPositions] = useState([]);
  const [ticker, setTicker] = useState('');
  const [entryPrice, setEntryPrice] = useState('');
  const [longLiqPrice, setLongLiqPrice] = useState('');
  const [shortLiqPrice, setShortLiqPrice] = useState('');
  const [feedIdCache] = useState(new Map());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const getFeedId = async (ticker) => {
    const symbol = ticker.toUpperCase();
    if (feedIdCache.has(symbol)) return feedIdCache.get(symbol);
    try {
      const response = await fetch(`${PYTH_HERMES_URL}/price_feeds?query=${symbol}&asset_type=crypto`);
      const data = await response.json();
      const feed = data.find(f => 
        f.attributes.symbol.toUpperCase() === `${symbol}/USD` || 
        f.attributes.base.toUpperCase() === symbol
      ) || data[0];
      if (feed) {
        feedIdCache.set(symbol, feed.id);
        return feed.id;
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  const fetchTokenPrice = async (ticker) => {
    const feedId = await getFeedId(ticker);
    if (!feedId) return null;
    try {
      const response = await fetch(`${PYTH_HERMES_URL}/updates/price/latest?ids[]=${feedId}`);
      const data = await response.json();
      if (data.parsed && data.parsed.length > 0) {
        const priceData = data.parsed[0].price;
        return parseFloat(priceData.price) * Math.pow(10, priceData.expo);
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  const refreshPrices = useCallback(async () => {
    setIsRefreshing(true);
    const updatedPositions = await Promise.all(
      positions.map(async (pos) => {
        const newPrice = await fetchTokenPrice(pos.ticker);
        return newPrice ? { ...pos, currentPrice: newPrice } : pos;
      })
    );
    setPositions(updatedPositions);
    setTimeout(() => setIsRefreshing(false), 500);
  }, [positions, fetchTokenPrice]);

  useEffect(() => {
    const interval = setInterval(refreshPrices, 10000);
    return () => clearInterval(interval);
  }, [refreshPrices]);

  const addPosition = async (e) => {
    e.preventDefault();
    if (!ticker || !entryPrice) return;
    
    const currentPrice = await fetchTokenPrice(ticker) || parseFloat(entryPrice);
    
    const newPos = {
      id: Date.now(),
      ticker: ticker.toUpperCase(),
      entry: parseFloat(entryPrice),
      longLiq: parseFloat(longLiqPrice),
      shortLiq: parseFloat(shortLiqPrice),
      currentPrice
    };
    
    setPositions([newPos, ...positions]);
    setTicker('');
    setEntryPrice('');
    setLongLiqPrice('');
    setShortLiqPrice('');
  };

  const removePosition = (id) => {
    setPositions(positions.filter(p => p.id !== id));
  };

  const calculateDistance = (current, liq, isShort) => {
    const diff = isShort ? liq - current : current - liq;
    const percent = (diff / current) * 100;
    return percent;
  };

  const getDistanceColor = (percent) => {
    if (percent > 20) return 'text-green-400';
    if (percent > 10) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="min-h-screen bg-[#0b0b0c] text-neutral-100 flex justify-center font-['Inter',_system-ui]">
      <div className="w-full max-w-[380px] px-5 py-6 space-y-6">
        
        {/* SECTION 1: HEADER */}
        <header className="h-[48px] flex items-center justify-between">
          <span className="text-[13px] tracking-wide text-neutral-400 font-medium">LIQUIDATION TRACKER</span>
          <div className="w-7 h-7 rounded-full border border-neutral-700 flex items-center justify-center">
            <div className={`w-1.5 h-1.5 rounded-full ${isRefreshing ? 'bg-blue-500 animate-pulse' : 'bg-lime-400'}`} />
          </div>
        </header>

        {/* SECTION 2: ADD POSITION CARD */}
        <section className="bg-[#151517] border border-[#222225] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wide text-neutral-500 font-medium">ADD POSITION</span>
            <svg className="w-3.5 h-3.5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          <form onSubmit={addPosition} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wide text-neutral-600 font-bold ml-1">TOKEN TICKER</label>
                <input
                  type="text"
                  placeholder="BTC"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value)}
                  className="w-full h-[44px] bg-[#1c1c1f] border border-[#2a2a2e] rounded-xl px-3 text-[14px] text-neutral-200 placeholder-neutral-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wide text-neutral-600 font-bold ml-1">ENTRY PRICE</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(e.target.value)}
                  className="w-full h-[44px] bg-[#1c1c1f] border border-[#2a2a2e] rounded-xl px-3 text-[14px] text-neutral-200 placeholder-neutral-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wide text-neutral-600 font-bold ml-1">LONG LIQ PRICE</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={longLiqPrice}
                  onChange={(e) => setLongLiqPrice(e.target.value)}
                  className="w-full h-[44px] bg-[#1c1c1f] border border-[#2a2a2e] rounded-xl px-3 text-[14px] text-neutral-200 placeholder-neutral-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wide text-neutral-600 font-bold ml-1">SHORT LIQ PRICE</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={shortLiqPrice}
                  onChange={(e) => setShortLiqPrice(e.target.value)}
                  className="w-full h-[44px] bg-[#1c1c1f] border border-[#2a2a2e] rounded-xl px-3 text-[14px] text-neutral-200 placeholder-neutral-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-[44px] bg-[#e6e7ea] text-black font-semibold rounded-xl text-[13px] tracking-wide active:scale-[0.98] transition-all"
            >
              Add Position
            </button>
          </form>
        </section>

        {/* SECTION 3: YOUR POSITIONS CARD */}
        <section className="bg-[#151517] border border-[#222225] rounded-2xl p-5 space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wide text-neutral-500 font-medium">YOUR POSITIONS</span>
            <span className="text-[11px] uppercase tracking-wide text-neutral-500 font-medium">{positions.length} active</span>
          </div>

          <div className="space-y-4">
            {positions.map((pos) => {
              const diffLong = Math.abs(pos.currentPrice - pos.longLiq);
              const diffShort = Math.abs(pos.currentPrice - pos.shortLiq);
              const isShortCloser = diffShort < diffLong;
              
              // Calculate relative position of price between long and short liq for the visual bar
              const range = pos.shortLiq - pos.longLiq;
              const relativePos = range > 0 ? ((pos.currentPrice - pos.longLiq) / range) * 100 : 50;
              const clampedPos = Math.min(Math.max(relativePos, 5), 95);

              return (
                <div key={pos.id} className="bg-[#18181b] border border-[#26262a] rounded-xl p-4 space-y-4 relative group">
                  <button 
                    onClick={() => removePosition(pos.id)}
                    className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center text-neutral-600 hover:text-red-400 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  {/* TOP ROW */}
                  <div className="flex justify-between items-center">
                    <span className="text-[18px] font-semibold">{pos.ticker}/USD</span>
                    <span className="text-[16px] font-medium text-neutral-300">
                      ${pos.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 })}
                    </span>
                  </div>

                  {/* VISUAL LIQUIDATION ZONE */}
                  <div className="space-y-2">
                    <div className="relative w-full h-[10px] bg-[#2a2a2e] rounded-full overflow-hidden flex">
                      <div className="h-full bg-lime-400/30 w-[30%]" />
                      <div className="h-full bg-neutral-800 w-[40%]" />
                      <div className="h-full bg-red-500/30 w-[30%]" />
                      
                      {/* Current Price Marker */}
                      <div 
                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-2 border-black shadow-lg transition-all duration-700"
                        style={{ left: `${clampedPos}%` }}
                      />
                    </div>
                  </div>

                  {/* LIQUIDATION VALUES */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#1c1c1f] rounded-lg p-3 space-y-1">
                      <span className="text-[10px] uppercase tracking-wide text-neutral-500">LONG LIQ</span>
                      <div className="text-[20px] font-semibold tracking-tight text-neutral-100">
                        ${pos.longLiq.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className={`rounded-lg p-3 space-y-1 border transition-all ${isShortCloser ? 'bg-[#2a1616] border-red-500/40' : 'bg-[#1c1c1f] border-transparent'}`}>
                      <span className="text-[10px] uppercase tracking-wide text-neutral-500">
                        SHORT LIQ {isShortCloser ? '– CLOSEST' : ''}
                      </span>
                      <div className="text-[20px] font-semibold tracking-tight text-neutral-100">
                        ${pos.shortLiq.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  {/* ENTRY METADATA */}
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-[11px] text-neutral-500 uppercase tracking-widest">ENTRY: ${pos.entry.toLocaleString()}</span>
                    <span className={`text-[11px] ${isShortCloser ? 'text-neutral-300 font-medium' : 'text-neutral-500'}`}>
                      {isShortCloser ? 'SHORT IS CLOSER' : 'LONG IS CLOSER'}
                    </span>
                  </div>
                </div>
              );
            })}
            
            {positions.length === 0 && (
              <div className="py-8 text-center text-[11px] text-neutral-600 uppercase tracking-widest">
                No active positions
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default LiquidationTrackerScreen;
