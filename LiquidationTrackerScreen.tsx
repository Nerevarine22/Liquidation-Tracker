import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, AlertTriangle, RefreshCw, Settings, ChevronRight } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Utility for class merging */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- CONSTANTS ---
const PYTH_HERMES_URL = 'https://hermes.pyth.network/v2';
const REFRESH_INTERVAL = 10000;

// --- TYPES ---
interface Position {
  id: string;
  token: string;
  price: number;
  entry: number;
  longLiq: number;
  shortLiq: number;
}

// --- COMPONENTS ---

/** Liquidation Visualization Bar */
const LiquidationBar = ({ current, long, short }: { current: number; long: number; short: number }) => {
  const range = short - long;
  const rawPos = range > 0 ? ((current - long) / range) * 100 : 50;
  const position = Math.min(Math.max(rawPos, 5), 95);

  return (
    <div className="relative w-full h-2 bg-[#1F2330] rounded-full mt-4 overflow-visible">
      {/* Risk Segments (visual indicator) */}
      <div className="absolute inset-0 flex">
        <div className="h-full w-[30%] bg-[#EF4444]/10 rounded-l-full" />
        <div className="h-full w-[40%] bg-[#4ADE80]/5" />
        <div className="h-full w-[30%] bg-[#EF4444]/10 rounded-r-full" />
      </div>
      
      {/* Current Price Dot */}
      <motion.div 
        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-2 border-[#12131A] shadow-xl z-10"
        initial={false}
        animate={{ left: `${position}%` }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
      />
    </div>
  );
};

/** Position Card Interface */
const PositionCard = ({ pos, onRemove }: { pos: Position; onRemove: (id: string) => void }) => {
  const diffLong = Math.abs(pos.price - pos.longLiq);
  const diffShort = Math.abs(pos.price - pos.shortLiq);
  const isShortCloser = diffShort < diffLong;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      className="bg-[#12131A] border border-[#1F2330] rounded-2xl p-4 space-y-3 relative group"
    >
      <button 
        onClick={() => onRemove(pos.id)}
        className="absolute top-2 right-2 p-1 text-[#8A8FA3] opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X size={14} />
      </button>

      <div className="flex justify-between items-baseline">
        <span className="text-[16px] font-semibold text-white tracking-tight">{pos.token}</span>
        <span className="text-[18px] font-bold text-white">
          ${pos.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
        </span>
      </div>

      <div className="text-[13px] text-[#8A8FA3] flex items-center gap-1">
        Entry <span className="text-white">${pos.entry.toLocaleString()}</span>
      </div>

      <LiquidationBar current={pos.price} long={pos.longLiq} short={pos.shortLiq} />

      <div className="flex justify-between pt-1">
        <div>
          <p className="text-[11px] text-[#8A8FA3] uppercase tracking-wider mb-0.5">Long Liq</p>
          <p className="text-[15px] font-semibold">${pos.longLiq.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-[#8A8FA3] uppercase tracking-wider mb-0.5">Short Liq</p>
          <p className={cn("text-[15px] font-semibold", isShortCloser ? "text-[#EF4444]" : "")}>
            ${pos.shortLiq.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {isShortCloser && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-1.5 text-[#F59E0B] text-[12px] pt-1"
        >
          <AlertTriangle size={12} />
          <span>Short closer</span>
        </motion.div>
      )}
    </motion.div>
  );
};

/** Bottom Sheet Form */
const AddPositionSheet = ({ isOpen, onClose, onAdd }: { isOpen: boolean; onClose: () => void; onAdd: (p: any) => void }) => {
  const [formData, setFormData] = useState({ token: '', entry: '', longLiq: '', shortLiq: '' });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
          <motion.div 
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[375px] bg-[#12131A] rounded-t-[32px] p-8 pb-10 z-50 border-t border-[#1F2330]"
          >
            <div className="w-12 h-1 bg-[#1F2330] rounded-full mx-auto mb-8" />
            <h2 className="text-xl font-bold mb-6">Add Position</h2>
            <div className="space-y-4">
              <input
                placeholder="Token (BTC, SUI...)"
                className="w-full bg-[#0B0B0F] border border-[#1F2330] rounded-xl h-14 px-4 text-white focus:border-[#6366F1] outline-none transition-all placeholder:text-[#5F677A]"
                value={formData.token} onChange={e => setFormData({...formData, token: e.target.value.toUpperCase()})}
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number" step="any" placeholder="Entry"
                  className="w-full bg-[#0B0B0F] border border-[#1F2330] rounded-xl h-14 px-4 text-white focus:border-[#6366F1] outline-none transition-all"
                  value={formData.entry} onChange={e => setFormData({...formData, entry: e.target.value})}
                />
                <input
                  type="number" step="any" placeholder="Long Liq"
                  className="w-full bg-[#0B0B0F] border border-[#1F2330] rounded-xl h-14 px-4 text-white focus:border-[#6366F1] outline-none transition-all"
                  value={formData.longLiq} onChange={e => setFormData({...formData, longLiq: e.target.value})}
                />
              </div>
              <input
                type="number" step="any" placeholder="Short Liq"
                className="w-full bg-[#0B0B0F] border border-[#1F2330] rounded-xl h-14 px-4 text-white focus:border-[#6366F1] outline-none transition-all"
                value={formData.shortLiq} onChange={e => setFormData({...formData, shortLiq: e.target.value})}
              />
              <button 
                onClick={() => { onAdd(formData); onClose(); setFormData({token:'', entry:'', longLiq:'', shortLiq:''}); }}
                className="w-full h-14 bg-[#6366F1] text-white font-bold rounded-xl active:scale-[0.98] transition-all"
              >
                Add Position
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// --- MAIN SCREEN ---
const LiquidationTrackerScreen = () => {
  const [positions, setPositions] = useState<Position[]>([
    { id: '1', token: 'SUI / USD', price: 0.99, entry: 0.98, longLiq: 0.22, shortLiq: 1.22 },
    { id: '2', token: 'BTC / USD', price: 67340, entry: 65000, longLiq: 58000, shortLiq: 71000 }
  ]);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [feedIds] = useState(new Map<string, string>());

  const portfolioValue = useMemo(() => {
    // In a real app we'd track size, here we'll just sum entries for visual appeal
    return positions.reduce((acc, p) => acc + (p.entry * 0.15), 12430);
  }, [positions]);

  const apiFetchPrice = async (ticker: string) => {
    try {
      let fId = feedIds.get(ticker);
      if (!fId) {
        const res = await fetch(`${PYTH_HERMES_URL}/price_feeds?query=${ticker}&asset_type=crypto`);
        const data = await res.json();
        const feed = data.find((f: any) => 
          f.attributes.symbol.toUpperCase() === `${ticker}/USD` || 
          f.attributes.base.toUpperCase() === ticker
        ) || data[0];
        if (feed) { feedIds.set(ticker, feed.id); fId = feed.id; }
      }
      if (fId) {
        const res = await fetch(`${PYTH_HERMES_URL}/updates/price/latest?ids[]=${fId}`);
        const data = await res.json();
        const p = data.parsed[0].price;
        return parseFloat(p.price) * Math.pow(10, p.expo);
      }
    } catch {}
    return null;
  };

  const refreshAll = useCallback(async () => {
    setIsRefreshing(true);
    const updated = await Promise.all(positions.map(async p => {
      const live = await apiFetchPrice(p.token.split(' / ')[0]);
      return live ? { ...p, price: live } : p;
    }));
    setPositions(updated);
    setTimeout(() => setIsRefreshing(false), 800);
  }, [positions]);

  useEffect(() => {
    const i = setInterval(refreshAll, REFRESH_INTERVAL);
    return () => clearInterval(i);
  }, [refreshAll]);

  const handleAdd = async (data: any) => {
    const live = await apiFetchPrice(data.token) || parseFloat(data.entry);
    const newPos: Position = {
      id: Date.now().toString(),
      token: `${data.token} / USD`,
      price: live,
      entry: parseFloat(data.entry),
      longLiq: parseFloat(data.longLiq),
      shortLiq: parseFloat(data.shortLiq)
    };
    setPositions([newPos, ...positions]);
  };

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white flex justify-center selection:bg-[#6366F1]/40">
      <div className="w-full max-w-[375px] px-4 py-8 relative">
        
        {/* HEADER */}
        <header className="mb-8 space-y-4">
          <div className="flex justify-between items-center">
            <h1 className="text-[20px] font-semibold text-white">Liquidation Tracker</h1>
            <button 
              onClick={refreshAll}
              className={cn("p-2 transition-transform", isRefreshing && "animate-spin")}
            >
              <RefreshCw size={20} className="text-[#8A8FA3]" />
            </button>
          </div>
          <div>
            <p className="text-[12px] text-[#8A8FA3] font-medium tracking-wide uppercase">Portfolio value</p>
            <motion.div 
              key={positions.length}
              initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}
              className="text-[32px] font-bold"
            >
              ${portfolioValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </motion.div>
          </div>
        </header>

        {/* POSITIONS LIST */}
        <div className="space-y-3 pb-24">
          <AnimatePresence mode="popLayout">
            {positions.map(pos => (
              <PositionCard 
                key={pos.id} 
                pos={pos} 
                onRemove={(id) => setPositions(positions.filter(p => p.id !== id))} 
              />
            ))}
          </AnimatePresence>

          {positions.length === 0 && (
            <div className="pt-20 text-center space-y-3">
              <p className="text-xl font-bold opacity-40">No positions yet</p>
              <p className="text-[#8A8FA3] text-sm">Track your liquidation risk</p>
              <button 
                onClick={() => setIsSheetOpen(true)}
                className="px-6 py-3 bg-[#6366F1] rounded-full text-sm font-bold"
              >
                Add Position
              </button>
            </div>
          )}
        </div>

        {/* FLOATING ACTION BUTTON */}
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsSheetOpen(true)}
          className="fixed bottom-8 right-1/2 translate-x-[150px] w-14 h-14 bg-[#6366F1] rounded-full shadow-[0_8px_24px_rgba(99,102,241,0.4)] flex items-center justify-center z-30"
        >
          <Plus size={28} />
        </motion.button>

        <AddPositionSheet 
          isOpen={isSheetOpen} 
          onClose={() => setIsSheetOpen(false)} 
          onAdd={handleAdd} 
        />
      </div>
    </div>
  );
};

export default LiquidationTrackerScreen;
