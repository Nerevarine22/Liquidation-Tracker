import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, RefreshCw, X } from 'lucide-react';

const PYTH_HERMES_URL = 'https://hermes.pyth.network/v2';
const REFRESH_INTERVAL = 10000;

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
  maximumFractionDigits: 4,
});

function formatMoney(value: number) {
  return `$${money.format(value)}`;
}

function shellTile(tone: 'accent' | 'dark' = 'dark') {
  return tone === 'accent'
    ? 'rounded-[30px] border-[4px] border-black bg-[#69bbff] text-black'
    : 'rounded-[30px] border-[4px] border-[#151515] bg-black text-white';
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
    <section className={`${shellTile('dark')} p-4`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Add position</p>
          <p className="mt-1 text-2xl text-white">Builder</p>
        </div>
        <button
          onClick={onToggle}
          className="rounded-full border border-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-white/72"
        >
          {open ? 'Hide' : 'Open'}
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
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={draft.token}
                onChange={(event) => update('token', event.target.value)}
                placeholder="BTC"
                className="col-span-2 rounded-[22px] border-2 border-[#1c1c1c] bg-[#090909] px-4 py-3 text-base text-white outline-none focus:border-[#69bbff]"
              />
              <input
                type="number"
                step="any"
                value={draft.entry}
                onChange={(event) => update('entry', event.target.value)}
                placeholder="Entry"
                className="rounded-[22px] border-2 border-[#1c1c1c] bg-[#090909] px-4 py-3 text-base text-white outline-none focus:border-[#69bbff]"
              />
              <input
                type="number"
                step="any"
                value={draft.longLiq}
                onChange={(event) => update('longLiq', event.target.value)}
                placeholder="Long liq"
                className="rounded-[22px] border-2 border-[#1c1c1c] bg-[#090909] px-4 py-3 text-base text-white outline-none focus:border-[#69bbff]"
              />
              <input
                type="number"
                step="any"
                value={draft.shortLiq}
                onChange={(event) => update('shortLiq', event.target.value)}
                placeholder="Short liq"
                className="col-span-2 rounded-[22px] border-2 border-[#1c1c1c] bg-[#090909] px-4 py-3 text-base text-white outline-none focus:border-[#69bbff]"
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
      className={`${shellTile('dark')} p-4`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] uppercase tracking-[0.18em] text-white/45">{position.token}</p>
          <p className="mt-3 font-['Space_Grotesk',sans-serif] text-[46px] leading-[0.9] tracking-[-0.06em] text-white">
            {position.price > 100 ? position.price.toFixed(0) : position.price.toFixed(2)}
          </p>
        </div>
        <button
          onClick={() => onRemove(position.id)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/55"
        >
          <X size={15} />
        </button>
      </div>

      <div className="mt-4 rounded-[24px] border-2 border-[#171717] bg-[#080808] p-4">
        <div className="relative h-4 rounded-full bg-[#1a1a1a]">
          <div className="absolute inset-y-0 left-0 w-[36%] rounded-full bg-[#69bbff]" />
          <div className="absolute inset-y-0 right-0 w-[36%] rounded-full bg-[#ffb54c]" />
          <motion.div
            className="absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-black bg-white"
            initial={false}
            animate={{ left: `${marker}%` }}
            transition={{ type: 'spring', stiffness: 140, damping: 18 }}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-[20px] bg-[#101010] p-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Long liq</p>
            <p className="mt-2 text-[26px] leading-none text-white">{formatMoney(position.longLiq)}</p>
          </div>
          <div className={`rounded-[20px] p-3 ${shortCloser ? 'bg-[#2a1a07] text-[#ffd08c]' : 'bg-[#101010] text-white'}`}>
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Short liq</p>
            <p className="mt-2 text-[26px] leading-none">{formatMoney(position.shortLiq)}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-white/45">Entry {formatMoney(position.entry)}</span>
          <span className="text-white">{shortCloser ? 'Short is closer' : 'Long is closer'}</span>
        </div>
      </div>
    </motion.article>
  );
}

export default function LiquidationTrackerScreen() {
  const [positions, setPositions] = useState<Position[]>([
    { id: '1', token: 'SUI / USD', price: 0.994, entry: 1, longLiq: 0.33, shortLiq: 1.5 },
    { id: '2', token: 'BTC / USD', price: 67340, entry: 65000, longLiq: 58000, shortLiq: 71000 },
  ]);
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

  const hero = useMemo(() => positions[0] ?? null, [positions]);
  const avgRisk = positions.length
    ? positions.reduce((sum, position) => sum + nearestRisk(position), 0) / positions.length
    : 0;

  return (
    <div className="min-h-screen bg-[#efefef] px-4 py-5 text-black">
      <div className="mx-auto flex w-full max-w-[430px] flex-col gap-4 rounded-[42px] border-[8px] border-black bg-black p-4 shadow-[0_24px_80px_rgba(0,0,0,0.14)]">
        <header className="flex items-center justify-between px-1">
          <p className="text-[13px] uppercase tracking-[0.14em] text-[#d8c3a8]">Liquidation tracker</p>
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15">
            <span className={`h-2.5 w-2.5 rounded-full ${isRefreshing ? 'bg-[#69bbff]' : 'bg-[#9be04f]'}`} />
          </div>
        </header>

        <section className={`${shellTile('accent')} p-5`}>
          <div className="flex items-start justify-between gap-3">
            <p className="text-[18px]">{hero ? `${hero.token} live focus` : 'No active position'}</p>
            <button
              onClick={() => setFormOpen(true)}
              className="rounded-full border-2 border-black/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.14em]"
            >
              New
            </button>
          </div>

          <div className="mt-5">
            <p className="font-['Space_Grotesk',sans-serif] text-[92px] leading-[0.86] tracking-[-0.08em]">
              {hero ? (hero.price > 100 ? hero.price.toFixed(0) : hero.price.toFixed(2)) : '0'}
            </p>
            <p className="mt-3 text-[26px] leading-none">{hero ? hero.token : 'Add position'}</p>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-4">
          <section className={`${shellTile('dark')} p-4`}>
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">Risk</div>
            <p className="mt-5 font-['Space_Grotesk',sans-serif] text-[44px] leading-none tracking-[-0.06em] text-white">
              {avgRisk.toFixed(1)}
            </p>
            <p className="mt-2 text-[18px] text-white/72">risk %</p>
          </section>

          <section className={`${shellTile('dark')} p-4`}>
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">Refresh</div>
            <p className="mt-5 font-['Space_Grotesk',sans-serif] text-[44px] leading-none tracking-[-0.06em] text-white">
              {REFRESH_INTERVAL / 1000}
            </p>
            <p className="mt-2 text-[18px] text-white/72">seconds</p>
          </section>
        </div>

        <AddForm open={formOpen} onToggle={() => setFormOpen((current) => !current)} onAdd={addPosition} />

        <section className={`${shellTile('dark')} p-4`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Your positions</p>
              <p className="mt-1 text-2xl text-white">Watchlist</p>
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
              <div className="rounded-[24px] border-2 border-[#171717] bg-[#080808] px-5 py-10 text-center text-white/60">
                No active positions
              </div>
            )}
          </div>
        </section>

        <button
          onClick={() => setFormOpen(true)}
          className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full border-[4px] border-black bg-[#69bbff] text-black shadow-[0_14px_30px_rgba(0,0,0,0.22)]"
          aria-label="Open form"
        >
          <Plus size={24} />
        </button>
      </div>
    </div>
  );
}
