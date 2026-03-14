import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, RefreshCw, X } from 'lucide-react';

const PYTH_HERMES_URL = 'https://hermes.pyth.network/v2';
const REFRESH_INTERVAL = 10000;
const POSITIONS_STORAGE_KEY = 'liq-tracker.positions';

type Position = {
  id: string;
  token: string;
  price: number;
  entry: number;
  longLiq: number;
  shortLiq: number;
};

type Draft = {
  token: string;
  entry: string;
  longLiq: string;
  shortLiq: string;
};

const money = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 6,
});

function formatMoney(value: number) {
  return `$${money.format(value)}`;
}

function formatDisplayPrice(value: number) {
  return value > 100 ? value.toFixed(2) : value.toFixed(4);
}

function shellTile(tone: 'accent' | 'dark' = 'dark') {
  return tone === 'accent'
    ? 'rounded-[26px] border border-black bg-[#f2f2f2] text-black'
    : 'rounded-[26px] border border-[#181818] bg-black text-white';
}

function nearestRisk(position: Position) {
  const nearest = Math.min(
    Math.abs(position.price - position.longLiq),
    Math.abs(position.price - position.shortLiq),
  );

  return position.price ? (nearest / position.price) * 100 : 0;
}

function AddForm({
  open,
  onToggle,
  onAdd,
}: {
  open: boolean;
  onToggle: () => void;
  onAdd: (draft: Draft) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Draft>({
    token: '',
    entry: '',
    longLiq: '',
    shortLiq: '',
  });

  const update = (field: keyof Draft, value: string) => {
    setDraft((current) => ({
      ...current,
      [field]: field === 'token' ? value.toUpperCase() : value,
    }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onAdd(draft);
    setDraft({ token: '', entry: '', longLiq: '', shortLiq: '' });
  };

  return (
    <section
      className={
        open
          ? 'w-full rounded-[26px] bg-black px-[2px] py-4 text-white'
          : 'w-full py-1 text-white'
      }
    >
      <div className={`flex w-full items-center ${open ? 'justify-between gap-3' : 'justify-end'}`}>
        {open && (
          <div>
            <p className="text-2xl text-white/84">Builder</p>
          </div>
        )}
        <button
          onClick={onToggle}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/72"
          aria-label={open ? 'Collapse builder' : 'Expand builder'}
        >
          <ChevronDown size={18} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.form
            onSubmit={submit}
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-[6px]">
              <input
                type="text"
                value={draft.token}
                onChange={(event) => update('token', event.target.value)}
                placeholder="BTC"
                className="col-span-2 rounded-[22px] border border-[#242424] bg-black px-4 py-3 text-base text-white outline-none focus:border-[#69bbff]"
              />
              <input
                type="number"
                step="any"
                value={draft.entry}
                onChange={(event) => update('entry', event.target.value)}
                placeholder="Entry"
                className="rounded-[22px] border border-[#242424] bg-black px-4 py-3 text-base text-white outline-none focus:border-[#69bbff]"
              />
              <input
                type="number"
                step="any"
                value={draft.longLiq}
                onChange={(event) => update('longLiq', event.target.value)}
                placeholder="Long liq"
                className="rounded-[22px] border border-[#242424] bg-black px-4 py-3 text-base text-white outline-none focus:border-[#74c468]"
              />
              <input
                type="number"
                step="any"
                value={draft.shortLiq}
                onChange={(event) => update('shortLiq', event.target.value)}
                placeholder="Short liq"
                className="col-span-2 rounded-[22px] border border-[#242424] bg-black px-4 py-3 text-base text-white outline-none focus:border-[#ff5a4a]"
              />
            </div>

            <button
              type="submit"
              className="mt-4 flex h-12 w-full items-center justify-center rounded-[22px] bg-[#f3f3f3] text-sm font-semibold uppercase tracking-[0.14em] text-black"
            >
              Add position
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </section>
  );
}

function PositionCard({
  position,
  onRemove,
}: {
  position: Position;
  onRemove: (id: string) => void;
}) {
  const distLong = Math.abs(position.price - position.longLiq);
  const distShort = Math.abs(position.price - position.shortLiq);
  const shortCloser = distShort < distLong;
  const lower = Math.min(position.longLiq, position.shortLiq);
  const upper = Math.max(position.longLiq, position.shortLiq);
  const range = upper - lower || 1;
  const marker = Math.min(Math.max(((position.price - lower) / range) * 100, 4), 96);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="rounded-[26px] bg-black px-[2px] py-4 text-white"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] uppercase tracking-[0.18em] text-white/45">{position.token}</p>
          <p className="mt-2 font-['Space_Grotesk',sans-serif] text-[46px] leading-[0.9] tracking-[-0.06em] text-[#d2d2d2]">
            {formatDisplayPrice(position.price)}
          </p>
          <p className="mt-2 text-sm text-white/42">Entry {formatMoney(position.entry)}</p>
        </div>
        <button
          onClick={() => onRemove(position.id)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/55"
        >
          <X size={15} />
        </button>
      </div>

      <div className="mt-3 p-0">
        <div className="relative h-4 rounded-full bg-[#1a1a1a]">
          <div className="absolute inset-y-0 left-0 w-[36%] rounded-full bg-[#69c16f]" />
          <div className="absolute inset-y-0 right-0 w-[36%] rounded-full bg-[#ff5a4a]" />
          <motion.div
            className="absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-[2px] border-black bg-white"
            initial={false}
            animate={{ left: `${marker}%` }}
            transition={{ type: 'spring', stiffness: 140, damping: 18 }}
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-[6px]">
          <div className="rounded-[20px] bg-[#0d140e] p-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Long liq</p>
            <p className="mt-2 text-[26px] leading-none text-[#89dc8b]">{formatMoney(position.longLiq)}</p>
          </div>
          <div
            className={`rounded-[20px] p-3 ${
              shortCloser
                ? 'bg-[#1b0e0c] text-[#ff9489]'
                : 'bg-[#140d0c] text-[#ff9489]'
            }`}
          >
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Short liq</p>
            <p className="mt-2 text-[26px] leading-none">{formatMoney(position.shortLiq)}</p>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export default function LiquidationTrackerScreen() {
  const [positions, setPositions] = useState<Position[]>(() => {
    if (typeof window === 'undefined') {
      return [];
    }

    try {
      const stored = window.localStorage.getItem(POSITIONS_STORAGE_KEY);
      return stored ? (JSON.parse(stored) as Position[]) : [];
    } catch {
      return [];
    }
  });
  const [feedIds] = useState(new Map<string, string>());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [formOpen, setFormOpen] = useState(true);

  const apiFetchPrice = async (ticker: string) => {
    try {
      let feedId = feedIds.get(ticker);

      if (!feedId) {
        const feedResponse = await fetch(`${PYTH_HERMES_URL}/price_feeds?query=${ticker}&asset_type=crypto`);
        const feedData = await feedResponse.json();
        const feed =
          feedData.find(
            (item: any) =>
              item.attributes.symbol.toUpperCase() === `${ticker}/USD` ||
              item.attributes.base.toUpperCase() === ticker,
          ) || feedData[0];

        if (feed) {
          feedIds.set(ticker, feed.id);
          feedId = feed.id;
        }
      }

      if (!feedId) return null;

      const priceResponse = await fetch(`${PYTH_HERMES_URL}/updates/price/latest?ids[]=${feedId}`);
      const priceData = await priceResponse.json();
      const parsed = priceData.parsed?.[0]?.price;

      if (!parsed) return null;

      return parseFloat(parsed.price) * Math.pow(10, parsed.expo);
    } catch {
      return null;
    }
  };

  useEffect(() => {
    try {
      window.localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify(positions));
    } catch {
      // Ignore storage write failures and keep the UI functional.
    }
  }, [positions]);

  useEffect(() => {
    const interval = setInterval(async () => {
      setIsRefreshing(true);

      const updated = await Promise.all(
        positions.map(async (position) => {
          const ticker = position.token.split(' / ')[0];
          const livePrice = await apiFetchPrice(ticker);
          return livePrice ? { ...position, price: livePrice } : position;
        }),
      );

      setPositions(updated);
      window.setTimeout(() => setIsRefreshing(false), 500);
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [positions]);

  const addPosition = async (draft: Draft) => {
    if (!draft.token || !draft.entry) return;

    const livePrice = (await apiFetchPrice(draft.token)) ?? parseFloat(draft.entry);
    const next: Position = {
      id: Date.now().toString(),
      token: `${draft.token} / USD`,
      price: livePrice,
      entry: parseFloat(draft.entry),
      longLiq: parseFloat(draft.longLiq) || 0,
      shortLiq: parseFloat(draft.shortLiq) || 0,
    };

    setPositions((current) => [next, ...current]);
  };

  return (
    <div className="min-h-screen bg-[#efefef] text-black">
      <div className="flex min-h-screen w-full flex-col gap-[4px] bg-black px-[1px] py-[8px]">
        <AddForm open={formOpen} onToggle={() => setFormOpen((current) => !current)} onAdd={addPosition} />

        <section className="rounded-[26px] bg-black px-[2px] py-4 text-white">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="mt-1 text-2xl text-white/84">Watchlist</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-white/58">
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-[#69bbff]' : ''} />
              {positions.length}
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <AnimatePresence mode="popLayout">
              {positions.map((position) => (
                <PositionCard
                  key={position.id}
                  position={position}
                  onRemove={(id) => setPositions((current) => current.filter((item) => item.id !== id))}
                />
              ))}
            </AnimatePresence>

            {positions.length === 0 && (
              <div className="rounded-[22px] bg-[#080808] px-5 py-10 text-center text-white/60">
                No active positions
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
