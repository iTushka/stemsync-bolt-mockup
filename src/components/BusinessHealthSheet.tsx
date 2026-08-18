import { useMemo, useState } from 'react';
import { ArrowLeft, TrendingUp, Megaphone, Wallet, Scale, Plus, Trash2, Check, Sparkles, CalendarClock, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { Sheet } from './Sheet';
import { AiBadge } from './AiBadge';
import type { AdSpendEntry, Customer, FixedCostEntry, OwedEntry, Sale, StockItem } from '../types';
import { computeEarnings } from '../earnings';
import {
  computeROI,
  computeRunRate,
  computeAggregateMargin,
  computeChannelRoas,
  computeWorkingCapitalLite,
  computeClassicBreakEven,
} from '../businessHealth';
import { FIXED_COST_SUGGESTIONS_BY_TENANT } from '../categoryFieldMap';
import { TENANT } from '../config';

const WINDOW_DAYS = 7;

// Same phrasing as CustomerDebtsSheet's local daysUntil() — kept as its own
// small copy here rather than a shared util, matching how each sheet in
// this codebase already owns its own tiny date-label helper.
function daysUntilLabel(ts: number): string {
  const days = Math.round((ts - Date.now()) / 86400000);
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'today';
  return `in ${days}d`;
}

interface BusinessHealthSheetProps {
  open: boolean;
  onClose: () => void;
  items: StockItem[];
  sales: Sale[];
  customers: Customer[];
  adSpend: AdSpendEntry[];
  owed: OwedEntry[];
  fixedCosts: FixedCostEntry[];
  currencySymbol: string;
  onLogAdSpend: (entry: Omit<AdSpendEntry, 'id' | 'loggedAt'>) => void;
  onAddOwed: (entry: Omit<OwedEntry, 'id' | 'createdAt' | 'settledAt'>) => void;
  onSettleOwed: (id: string) => void;
  onAddFixedCost: (entry: Omit<FixedCostEntry, 'id' | 'createdAt'>) => void;
  onRemoveFixedCost: (id: string) => void;
}

type View = 'overview' | 'logAdSpend' | 'owedList' | 'addOwed' | 'fixedCosts' | 'upcoming';

interface UpcomingEntry {
  id: string;
  direction: 'in' | 'out';
  who: string;
  amount: number;
  date: number;
}

/**
 * tuvara-visuell-lonsamhet-analys.md — "Upcoming" combines unpaid বাকি
 * (money coming in, only the ones with a follow-up date set) and unpaid
 * owed (money going out, only the ones with a due date set) into one
 * chronological list. Deliberately a simple sorted list, not a month-grid
 * calendar — this is the same shape CustomerDebtsSheet's own list already
 * uses, just merged across both directions. Entries with no date are
 * excluded entirely here (they already have a home in "What you owe" /
 * Customer বাকি), since a date-less entry has nothing to sort into.
 */
function buildUpcomingEntries(customers: Customer[], owed: OwedEntry[]): UpcomingEntry[] {
  const incoming: UpcomingEntry[] = customers.flatMap((c) =>
    c.debts
      .filter((d) => !d.settledAt && d.followUpDate)
      .map((d) => ({ id: d.id, direction: 'in' as const, who: c.name, amount: d.amount, date: d.followUpDate! }))
  );
  const outgoing: UpcomingEntry[] = owed
    .filter((o) => !o.settledAt && o.dueDate)
    .map((o) => ({ id: o.id, direction: 'out' as const, who: o.who, amount: o.amount, date: o.dueDate! }));
  return [...incoming, ...outgoing].sort((a, b) => a.date - b.date);
}

/**
 * "Business health" (tuvara-nyckeltal-analys.md) — the single collected
 * surface the seven finance-formula slides get translated into, rather
 * than seven more scattered insight chips. Everything here is either
 * derived from data already logged (ROI, pace, aggregate margin), or from
 * one of three small new logs that mirror the বাকি pattern (ad spend,
 * what-you-owe, fixed costs) — see businessHealth.ts for every formula and
 * its honest limits.
 */
export function BusinessHealthSheet({
  open,
  onClose,
  items,
  sales,
  customers,
  adSpend,
  owed,
  fixedCosts,
  currencySymbol,
  onLogAdSpend,
  onAddOwed,
  onSettleOwed,
  onAddFixedCost,
  onRemoveFixedCost,
}: BusinessHealthSheetProps) {
  const [view, setView] = useState<View>('overview');

  const roi = useMemo(() => computeROI(sales, items, WINDOW_DAYS), [sales, items]);
  const runRate = useMemo(() => computeRunRate(sales, items, WINDOW_DAYS), [sales, items]);
  const aggregateMargin = useMemo(() => computeAggregateMargin(sales, items, WINDOW_DAYS), [sales, items]);
  const channelRoas = useMemo(() => computeChannelRoas(sales, adSpend, WINDOW_DAYS), [sales, adSpend]);
  const workingCapital = useMemo(() => computeWorkingCapitalLite(items, customers, owed), [items, customers, owed]);
  const classicBreakEven = useMemo(() => computeClassicBreakEven(fixedCosts, items), [fixedCosts, items]);
  const stockBreakEven = useMemo(() => computeEarnings(sales, items, WINDOW_DAYS).breakEvenUnits, [sales, items]);

  const unpaidOwed = owed.filter((o) => !o.settledAt);
  const upcoming = useMemo(() => buildUpcomingEntries(customers, owed), [customers, owed]);

  const handleClose = () => {
    setView('overview');
    onClose();
  };

  return (
    <Sheet open={open} onClose={handleClose} maxHeight="94vh">
      <div className="flex items-center gap-2 px-5 py-2 shrink-0">
        {view !== 'overview' && (
          <button
            onClick={() => setView(view === 'addOwed' ? 'owedList' : 'overview')}
            aria-label="Back"
            className="w-8 h-8 -ml-1.5 rounded-full flex items-center justify-center text-stone-500 hover:bg-stone-100 transition"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <h2 className="text-lg font-bold text-stone-900">
          {view === 'overview' && 'Business health'}
          {view === 'logAdSpend' && 'Log a boosted post'}
          {(view === 'owedList' || view === 'addOwed') && 'What you owe'}
          {view === 'fixedCosts' && 'Fixed costs'}
          {view === 'upcoming' && 'Upcoming'}
        </h2>
      </div>

      {view === 'overview' && (
        <div className="flex-1 overflow-y-auto px-5 pb-6 no-scrollbar space-y-4">
          <p className="text-xs text-stone-400 leading-snug">
            A quick read on how your business is doing, in plain language — last {WINDOW_DAYS} days
            unless noted.
          </p>

          {/* ROI + aggregate margin */}
          <Section icon={TrendingUp} title="How you're doing">
            <StatRow
              label="Return on what you spent"
              value={roi.roiPct === null ? 'Not enough data yet' : `${roi.roiPct}%`}
              hint={
                roi.roiPct === null
                  ? 'Log a sale with a known cost to see this.'
                  : `For every ${currencySymbol}100 you spent on stock, you got back ${currencySymbol}${(100 + roi.roiPct).toFixed(0)}.`
              }
            />
            <StatRow
              label="Overall margin"
              value={aggregateMargin === undefined ? 'Not enough sales yet' : `${aggregateMargin}%`}
              hint="How much of each sale is profit, on average."
            />
          </Section>

          {/* Upcoming — combined বাকি (in) + owed (out) with a date set */}
          <Section icon={CalendarClock} title="Upcoming">
            {upcoming.length === 0 ? (
              <EmptyHint text="Set a date on a বাকি or something you owe to see it here." />
            ) : (
              <>
                {upcoming.slice(0, 3).map((u) => (
                  <div key={`${u.direction}-${u.id}`} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {u.direction === 'in' ? (
                        <ArrowDownCircle size={14} className="text-emerald-500 shrink-0" />
                      ) : (
                        <ArrowUpCircle size={14} className="text-amber-500 shrink-0" />
                      )}
                      <span className="text-sm text-stone-600 truncate">{u.who}</span>
                    </div>
                    <span className="text-xs text-stone-400 shrink-0">
                      {u.amount} {currencySymbol} · {daysUntilLabel(u.date)}
                    </span>
                  </div>
                ))}
                <button
                  onClick={() => setView('upcoming')}
                  className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-accent-600 hover:text-accent-700"
                >
                  {upcoming.length > 3 ? `See all ${upcoming.length}` : 'See details'}
                </button>
              </>
            )}
          </Section>

          {/* Revenue run rate */}
          <Section icon={TrendingUp} title="Your pace">
            {runRate ? (
              <StatRow
                label={`At this pace`}
                value={`≈ ${currencySymbol}${runRate.monthlyPace.toFixed(0)} / month`}
                hint={`Based on ${currencySymbol}${runRate.periodRevenue.toFixed(0)} over the last ${WINDOW_DAYS} days — a rough extrapolation, not a promise.`}
              />
            ) : (
              <EmptyHint text="Log a few more sales to see your pace." />
            )}
          </Section>

          {/* ROAS-lite */}
          <Section icon={Megaphone} title="Ads">
            {channelRoas.length === 0 ? (
              <>
                <EmptyHint text="Log a boosted post to see whether it's paying off." />
                <button
                  onClick={() => setView('logAdSpend')}
                  className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-accent-600 hover:text-accent-700"
                >
                  <Plus size={16} /> Log a boosted post
                </button>
              </>
            ) : (
              <>
                {channelRoas.map((c) => (
                  <StatRow
                    key={c.channelName}
                    label={c.channelName}
                    value={c.roas === null ? 'No matching sales yet' : `${c.roas}× back`}
                    hint={`${currencySymbol}${c.spend.toFixed(0)} spent, ${currencySymbol}${c.revenue.toFixed(0)} in sales via ${c.channelName} — a rough correlation, not exact ad tracking.`}
                  />
                ))}
                <button
                  onClick={() => setView('logAdSpend')}
                  className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-accent-600 hover:text-accent-700"
                >
                  <Plus size={16} /> Log another
                </button>
              </>
            )}
          </Section>

          {/* Working capital lite */}
          <Section icon={Wallet} title="Cash">
            <StatRow
              label="What you'd have if everything settled today"
              value={`${currencySymbol}${workingCapital.net.toFixed(0)}`}
              hint={`${currencySymbol}${workingCapital.assets.toFixed(0)} in stock + owed to you, minus ${currencySymbol}${workingCapital.liabilities.toFixed(0)} you owe. Stock isn't cash in hand until it sells.`}
            />
            <button
              onClick={() => setView('owedList')}
              className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-accent-600 hover:text-accent-700"
            >
              <Plus size={16} /> {unpaidOwed.length > 0 ? `${unpaidOwed.length} logged — manage` : 'Log what you owe'}
            </button>
          </Section>

          {/* Break-even — two distinct concepts, kept clearly separate */}
          <Section icon={Scale} title="Break-even">
            {stockBreakEven !== null && (
              <StatRow
                label="To recover what's tied up in stock"
                value={`≈ ${stockBreakEven} sales`}
                hint="How many sales, at your average price, to get back the money sitting in stock right now."
              />
            )}
            {classicBreakEven ? (
              <StatRow
                label="To cover your fixed costs"
                value={
                  classicBreakEven.unitsPerWeek === null
                    ? 'Not enough margin data yet'
                    : `≈ ${classicBreakEven.unitsPerWeek} sales / week`
                }
                hint={`Based on ${currencySymbol}${classicBreakEven.weeklyFixedCosts.toFixed(0)}/week in fixed costs you logged.`}
              />
            ) : (
              <EmptyHint text="Log your fixed costs (rent, phone, delivery...) to see how many sales a week covers them." />
            )}
            <button
              onClick={() => setView('fixedCosts')}
              className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-accent-600 hover:text-accent-700"
            >
              <Plus size={16} /> {fixedCosts.length > 0 ? 'Manage fixed costs' : 'Add a fixed cost'}
            </button>
          </Section>
        </div>
      )}

      {view === 'logAdSpend' && (
        <LogAdSpendView items={items} currencySymbol={currencySymbol} onSave={(entry) => { onLogAdSpend(entry); setView('overview'); }} />
      )}

      {view === 'owedList' && (
        <OwedListView
          owed={owed}
          currencySymbol={currencySymbol}
          onAdd={() => setView('addOwed')}
          onSettle={onSettleOwed}
        />
      )}

      {view === 'addOwed' && (
        <AddOwedView onSave={(entry) => { onAddOwed(entry); setView('owedList'); }} />
      )}

      {view === 'fixedCosts' && (
        <FixedCostsView
          fixedCosts={fixedCosts}
          currencySymbol={currencySymbol}
          onAdd={onAddFixedCost}
          onRemove={onRemoveFixedCost}
        />
      )}

      {view === 'upcoming' && <UpcomingView entries={upcoming} currencySymbol={currencySymbol} />}
    </Sheet>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof TrendingUp; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <div className="flex items-center gap-1.5 mb-2.5">
        <Icon size={15} className="text-accent-500" />
        <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">{title}</h3>
      </div>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function StatRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm text-stone-600">{label}</span>
        <span className="text-sm font-bold text-stone-900 shrink-0">{value}</span>
      </div>
      {hint && <p className="mt-0.5 text-[11px] text-stone-400 leading-snug">{hint}</p>}
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <p className="text-xs text-stone-400 leading-snug">{text}</p>;
}

function LogAdSpendView({
  items,
  currencySymbol,
  onSave,
}: {
  items: StockItem[];
  currencySymbol: string;
  onSave: (entry: Omit<AdSpendEntry, 'id' | 'loggedAt'>) => void;
}) {
  const [channelName, setChannelName] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const channelSuggestions = useMemo(() => {
    const names = new Set<string>();
    items.forEach((i) => i.channels.forEach((c) => names.add(c.name)));
    return Array.from(names);
  }, [items]);

  const value = parseFloat(amount);
  const canSave = channelName.trim().length > 0 && !isNaN(value) && value > 0;

  return (
    <>
      <div className="flex-1 overflow-y-auto px-5 pb-4 no-scrollbar space-y-4">
        <p className="text-xs text-stone-400 leading-snug">
          Not tied to a specific sale — Tuvara can't track which sale came from an ad. This just
          lines up how much you spent on a channel against how much came in through it.
        </p>
        <label className="block">
          <span className="block text-xs font-medium text-stone-500 mb-1">Channel</span>
          <input
            list="business-health-channels"
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
            placeholder="e.g. Instagram"
            className="input"
            autoFocus
          />
          <datalist id="business-health-channels">
            {channelSuggestions.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-stone-500 mb-1">Amount spent ({currencySymbol})</span>
          <input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="input"
          />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-stone-500 mb-1">Note (optional)</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Boosted the new saree post"
            className="input"
          />
        </label>
      </div>
      <div className="shrink-0 px-5 pt-3 pb-5 safe-bottom border-t border-stone-100 bg-cream-50">
        <button
          onClick={() =>
            onSave({
              channelName: channelName.trim(),
              amount: Math.round(value * 100) / 100,
              note: note.trim() || undefined,
            })
          }
          disabled={!canSave}
          className="w-full h-12 rounded-full bg-accent-500 text-white font-semibold text-sm shadow-fab hover:bg-accent-600 active:scale-[0.98] transition disabled:opacity-40 disabled:shadow-none"
        >
          Save
        </button>
      </div>
    </>
  );
}

function OwedListView({
  owed,
  currencySymbol,
  onAdd,
  onSettle,
}: {
  owed: OwedEntry[];
  currencySymbol: string;
  onAdd: () => void;
  onSettle: (id: string) => void;
}) {
  // Same sort as CustomerDebtsSheet's unpaid list: nearest due date first,
  // undated entries sink to the bottom rather than being lost among them.
  const unpaid = [...owed]
    .filter((o) => !o.settledAt)
    .sort((a, b) => {
      if (a.dueDate && b.dueDate) return a.dueDate - b.dueDate;
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return b.createdAt - a.createdAt;
    });
  return (
    <>
      <div className="flex-1 overflow-y-auto px-5 pb-4 no-scrollbar">
        {unpaid.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Wallet size={36} className="text-stone-300 mb-3" />
            <p className="text-stone-500 text-sm max-w-[240px]">
              Nothing logged — add something when you owe a supplier, a helper, or anyone else.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {unpaid.map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-3.5 py-3"
              >
                <div>
                  <div className="text-sm font-semibold text-stone-800">{o.who}</div>
                  <div className="text-xs text-stone-400">
                    {o.note ? `${o.note} · ` : ''}
                    {o.dueDate ? daysUntilLabel(o.dueDate) : 'no date set'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-stone-900">
                    {o.amount} {currencySymbol}
                  </span>
                  <button
                    onClick={() => onSettle(o.id)}
                    aria-label="Mark as paid"
                    className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:bg-emerald-50 hover:text-emerald-600 transition"
                  >
                    <Check size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="shrink-0 px-5 pt-3 pb-5 safe-bottom border-t border-stone-100 bg-cream-50">
        <button
          onClick={onAdd}
          className="w-full h-12 rounded-full bg-accent-500 text-white font-semibold text-sm shadow-fab flex items-center justify-center gap-1.5 hover:bg-accent-600 active:scale-[0.98] transition"
        >
          <Plus size={17} /> Log what you owe
        </button>
      </div>
    </>
  );
}

function AddOwedView({ onSave }: { onSave: (entry: Omit<OwedEntry, 'id' | 'createdAt' | 'settledAt'>) => void }) {
  const [who, setWho] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [dueDate, setDueDate] = useState('');

  const value = parseFloat(amount);
  const canSave = who.trim().length > 0 && !isNaN(value) && value > 0;

  return (
    <>
      <div className="flex-1 overflow-y-auto px-5 pb-4 no-scrollbar space-y-4">
        <label className="block">
          <span className="block text-xs font-medium text-stone-500 mb-1">Who</span>
          <input
            value={who}
            onChange={(e) => setWho(e.target.value)}
            placeholder="e.g. Fabric supplier"
            className="input"
            autoFocus
          />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-stone-500 mb-1">Amount owed</span>
          <input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="input"
          />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-stone-500 mb-1">Note (optional)</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Half payment for fabric order"
            className="input"
          />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-stone-500 mb-1">
            When you plan to pay (optional)
          </span>
          <input
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="input"
          />
          <p className="mt-1 text-[11px] text-stone-400 leading-snug">
            Shows up in "Upcoming" on the overview — no reminder is sent, this is just for you.
          </p>
        </label>
      </div>
      <div className="shrink-0 px-5 pt-3 pb-5 safe-bottom border-t border-stone-100 bg-cream-50">
        <button
          onClick={() =>
            onSave({
              who: who.trim(),
              amount: Math.round(value * 100) / 100,
              note: note.trim() || undefined,
              dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
            })
          }
          disabled={!canSave}
          className="w-full h-12 rounded-full bg-accent-500 text-white font-semibold text-sm shadow-fab hover:bg-accent-600 active:scale-[0.98] transition disabled:opacity-40 disabled:shadow-none"
        >
          Save
        </button>
      </div>
    </>
  );
}

function UpcomingView({ entries, currencySymbol }: { entries: UpcomingEntry[]; currencySymbol: string }) {
  return (
    <div className="flex-1 overflow-y-auto px-5 pb-6 no-scrollbar space-y-3">
      <p className="text-xs text-stone-400 leading-snug">
        Money coming in from বাকি and money going out from what you owe — only entries with a date
        set show up here.
      </p>
      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CalendarClock size={36} className="text-stone-300 mb-3" />
          <p className="text-stone-500 text-sm max-w-[240px]">
            Nothing dated yet — set a follow-up date on a বাকি or a "when you plan to pay" date on
            something you owe.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {entries.map((u) => (
            <div
              key={`${u.direction}-${u.id}`}
              className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-3.5 py-3"
            >
              <div className="flex items-center gap-2 min-w-0">
                {u.direction === 'in' ? (
                  <ArrowDownCircle size={16} className="text-emerald-500 shrink-0" />
                ) : (
                  <ArrowUpCircle size={16} className="text-amber-500 shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-stone-800 truncate">{u.who}</div>
                  <div className="text-xs text-stone-400">
                    {u.direction === 'in' ? 'Owes you' : 'You owe'} · {daysUntilLabel(u.date)}
                  </div>
                </div>
              </div>
              <span className="text-sm font-bold text-stone-900 shrink-0">
                {u.amount} {currencySymbol}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FixedCostsView({
  fixedCosts,
  currencySymbol,
  onAdd,
  onRemove,
}: {
  fixedCosts: FixedCostEntry[];
  currencySymbol: string;
  onAdd: (entry: Omit<FixedCostEntry, 'id' | 'createdAt'>) => void;
  onRemove: (id: string) => void;
}) {
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [cadence, setCadence] = useState<'week' | 'month'>('month');

  const suggestions = FIXED_COST_SUGGESTIONS_BY_TENANT[TENANT];
  const value = parseFloat(amount);
  const canAdd = label.trim().length > 0 && !isNaN(value) && value > 0;

  const handleAdd = () => {
    if (!canAdd) return;
    onAdd({ label: label.trim(), amount: Math.round(value * 100) / 100, cadence });
    setLabel('');
    setAmount('');
  };

  return (
    <div className="flex-1 overflow-y-auto px-5 pb-6 no-scrollbar space-y-4">
      {fixedCosts.length > 0 && (
        <div className="space-y-1.5">
          {fixedCosts.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-3.5 py-3"
            >
              <div>
                <div className="text-sm font-semibold text-stone-800">{c.label}</div>
                <div className="text-xs text-stone-400">per {c.cadence}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-stone-900">
                  {c.amount} {currencySymbol}
                </span>
                <button
                  onClick={() => onRemove(c.id)}
                  aria-label="Remove fixed cost"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:bg-stone-100 hover:text-red-500 transition"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3">
        <AiBadge text="Common costs for businesses like yours — tap one to start, you fill in your own amount. Tuvara can't see your real costs, so it never guesses a number." />
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => setLabel(s)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition active:scale-95 ${
                label === s ? 'bg-accent-500 text-white' : 'bg-cream-100 text-stone-600 hover:bg-cream-200'
              }`}
            >
              <Sparkles size={10} className="inline mr-1 -mt-0.5" />
              {s}
            </button>
          ))}
        </div>
        <label className="block">
          <span className="block text-xs font-medium text-stone-500 mb-1">Cost</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Market stall rent"
            className="input"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs font-medium text-stone-500 mb-1">Amount ({currencySymbol})</span>
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="input"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-stone-500 mb-1">Per</span>
            <select value={cadence} onChange={(e) => setCadence(e.target.value as 'week' | 'month')} className="input">
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>
          </label>
        </div>
        <button
          onClick={handleAdd}
          disabled={!canAdd}
          className="w-full h-11 rounded-full bg-accent-500 text-white font-semibold text-sm disabled:opacity-40 active:scale-[0.98] transition"
        >
          Add fixed cost
        </button>
      </div>
    </div>
  );
}
