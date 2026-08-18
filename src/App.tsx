import { useState, useMemo } from 'react';
import { usePersistentState } from './usePersistentState';
import { DEFAULT_CURRENCY, PILOT_SLUG } from './config';
import { DEMO_SEEDS } from './demoSeeds';
import { DemoDataBanner } from './components/DemoDataBanner';
import { StockList } from './components/StockList';
import { FilterSheet } from './components/FilterSheet';
import { AddSheet } from './components/AddSheet';
import { BottomNav } from './components/BottomNav';
import { CheckoutBar } from './components/CheckoutBar';
import { SellTab } from './components/SellTab';
import { OffersTab } from './components/OffersTab';
import { BundleBuilder } from './components/BundleBuilder';
import { AgingActionSheet } from './components/AgingActionSheet';
import { WhatsAppCardSheet } from './components/WhatsAppCardSheet';
import { AddCustomerSheet } from './components/AddCustomerSheet';
import { SettingsSheet } from './components/SettingsSheet';
import { QuoteCard } from './components/QuoteCard';
import { SalesHistorySheet } from './components/SalesHistorySheet';
import { BookingsSheet } from './components/BookingsSheet';
import { CustomerDebtsSheet } from './components/CustomerDebtsSheet';
import { BusinessHealthSheet } from './components/BusinessHealthSheet';
import { CustomersSheet } from './components/CustomersSheet';
import { FirstRunIntro } from './components/FirstRunIntro';
import {
  emptyFilters,
  defaultSettings,
  CURRENT_STOCK_SENTINEL,
  type StockItem,
  type StockPeriod,
  type Filters,
  type Customer,
  type CustomerDebt,
  type Bundle,
  type AppSettings,
  type TeamUser,
  type CartLine,
  type Booking,
  type Sale,
  type AdSpendEntry,
  type OwedEntry,
  type FixedCostEntry,
} from './types';
import { applyFilters, countActiveFilters } from './filterLogic';

type Tab = 'stock' | 'sell' | 'offers';

const demoSeed = DEMO_SEEDS[PILOT_SLUG];

function App() {
  // Shown once per browser/device (persisted the same way as everything
  // else, namespaced per pilot) — see FirstRunIntro.tsx / P1.6. Resets
  // along with the rest of a demo tenant's data via "Reset to demo data"
  // in Settings, so a fresh sales-demo walkthrough shows it again too.
  const [seenIntro, setSeenIntro] = usePersistentState('seenIntro', false);

  const [items, setItems] = usePersistentState<StockItem[]>('items', demoSeed?.items ?? []);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [tab, setTab] = useState<Tab>('stock');

  // Stock periods — see tuvara-perioder-analys.md. Newest first (same
  // prepend convention as items/customers/bundles below), so periods[0] is
  // always "current" for tagging newly added items. periodFilter is
  // deliberately plain (session-only) state, not persisted — same as
  // search/filters above; it resets to "All periods" on reload rather than
  // silently hiding stock a seller forgot they'd filtered to.
  const [periods, setPeriods] = usePersistentState<StockPeriod[]>('periods', []);
  const [periodFilter, setPeriodFilter] = useState<string | undefined>(undefined);

  const [customers, setCustomers] = usePersistentState<Customer[]>('customers', []);
  const [whatsAppCardOpen, setWhatsAppCardOpen] = useState(false);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [debtsOpen, setDebtsOpen] = useState(false);

  const [settings, setSettings] = usePersistentState<AppSettings>('settings', {
    ...defaultSettings,
    currencySymbol: DEFAULT_CURRENCY,
    exchangeRates: demoSeed?.exchangeRates ?? {},
  });
  const [team, setTeam] = usePersistentState<TeamUser[]>('team', [
    { id: 'owner', name: 'You', role: 'Owner' },
  ]);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [bundles, setBundles] = usePersistentState<Bundle[]>('bundles', []);
  const [bundleBuilderOpen, setBundleBuilderOpen] = useState(false);
  const [bundlePreselectId, setBundlePreselectId] = useState<string | undefined>(undefined);
  const [editingBundle, setEditingBundle] = useState<Bundle | null>(null);

  const [agingItem, setAgingItem] = useState<StockItem | null>(null);

  const [cart, setCart] = usePersistentState<CartLine[]>('cart', []);
  const [quoteOpen, setQuoteOpen] = useState(false);

  const [bookings, setBookings] = usePersistentState<Booking[]>('bookings', []);
  const [bookingsOpen, setBookingsOpen] = useState(false);
  const [sales, setSales] = usePersistentState<Sale[]>('sales', demoSeed?.sales ?? []);
  const [salesHistoryOpen, setSalesHistoryOpen] = useState(false);

  // "Business health" (tuvara-nyckeltal-analys.md) — three small, flat logs
  // mirroring the বাকি pattern, plus the sheet that surfaces them alongside
  // everything already derivable from items/sales. See businessHealth.ts.
  const [adSpend, setAdSpend] = usePersistentState<AdSpendEntry[]>('adSpend', []);
  const [owed, setOwed] = usePersistentState<OwedEntry[]>('owed', []);
  const [fixedCosts, setFixedCosts] = usePersistentState<FixedCostEntry[]>('fixedCosts', []);
  const [businessHealthOpen, setBusinessHealthOpen] = useState(false);
  const [customersSheetOpen, setCustomersSheetOpen] = useState(false);

  const cartChannelOptions = useMemo(() => {
    const names = new Set<string>();
    for (const line of cart) {
      if (line.kind !== 'item') continue;
      const item = items.find((i) => i.id === line.refId);
      item?.channels.forEach((c) => names.add(c.name));
    }
    return Array.from(names);
  }, [cart, items]);

  const activeCount = items.filter((i) => !i.soldOut).length;
  const activeFilterCount = countActiveFilters(filters);
  const cartCount = cart.reduce((sum, l) => sum + l.quantity, 0);
  const cartTotal = cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const showCheckoutBar = tab === 'sell' && cartCount > 0;

  const filtered = useMemo(() => {
    const searched = search
      ? items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
      : items;
    const periodMatched = periodFilter ? searched.filter((i) => i.periodId === periodFilter) : searched;
    return applyFilters(periodMatched, filters);
  }, [items, search, filters, periodFilter]);

  const handleSave = (draft: Omit<StockItem, 'id' | 'createdAt'>) => {
    // New stock lands in whichever period is current (periods[0], newest
    // first) once a seller has actually started using them — see
    // tuvara-perioder-analys.md. Before that (periods.length === 0, the
    // default for everyone), periodId stays undefined exactly as it
    // always has.
    const newItem: StockItem = {
      ...draft,
      id: Math.random().toString(36).slice(2, 9),
      createdAt: Date.now(),
      periodId: draft.periodId ?? periods[0]?.id,
    };
    setItems((prev) => [newItem, ...prev]);
  };

  // "Start new period, optionally copy from ..." — see
  // tuvara-perioder-analys.md's additive model: creates a *new* period and,
  // if requested, brand-new StockItem copies (new ids, quantity/aging
  // reset to a clean slate) tagged with it. Never touches or re-tags any
  // existing item — old periods' stock, bundles and sales stay exactly as
  // they were, since Bundle.itemIds/Sale.lines[].itemId already point at
  // those ids and must keep working.
  const handleStartPeriod = (name: string, copyFromPeriodId?: string) => {
    const newPeriod: StockPeriod = {
      id: Math.random().toString(36).slice(2, 9),
      name: name.trim() || 'Untitled period',
      startedAt: Date.now(),
    };
    setPeriods((prev) => [newPeriod, ...prev]);

    if (copyFromPeriodId) {
      const sourceItems =
        copyFromPeriodId === CURRENT_STOCK_SENTINEL
          ? items.filter((i) => !i.periodId)
          : items.filter((i) => i.periodId === copyFromPeriodId);
      const copies: StockItem[] = sourceItems.map((i) => ({
        ...i,
        id: Math.random().toString(36).slice(2, 9),
        quantity: 0,
        soldOut: false,
        aging: false,
        agingAction: undefined,
        agingActionNote: undefined,
        createdAt: Date.now(),
        periodId: newPeriod.id,
      }));
      setItems((prev) => [...copies, ...prev]);
    }
  };

  const handleUpdateItem = (updated: StockItem) => {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const closeAddSheet = () => {
    setAddOpen(false);
    setEditingItem(null);
  };

  const handleSaveCustomer = (customer: Omit<Customer, 'id' | 'addedAt'>) => {
    const newCustomer: Customer = {
      ...customer,
      id: Math.random().toString(36).slice(2, 9),
      addedAt: Date.now(),
    };
    setCustomers((prev) => [newCustomer, ...prev]);
  };

  const handleAddDebt = (
    customerId: string,
    debt: Omit<CustomerDebt, 'id' | 'createdAt' | 'reminderCount' | 'settledAt'>
  ) => {
    const newDebt: CustomerDebt = {
      ...debt,
      id: Math.random().toString(36).slice(2, 9),
      createdAt: Date.now(),
      reminderCount: 0,
      settledAt: null,
    };
    setCustomers((prev) =>
      prev.map((c) => (c.id === customerId ? { ...c, debts: [newDebt, ...c.debts] } : c))
    );
  };

  const handleSettleDebt = (customerId: string, debtId: string) => {
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === customerId
          ? {
              ...c,
              debts: c.debts.map((d) => (d.id === debtId ? { ...d, settledAt: Date.now() } : d)),
            }
          : c
      )
    );
  };

  const handleReminderSent = (customerId: string, debtId: string) => {
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === customerId
          ? {
              ...c,
              debts: c.debts.map((d) =>
                d.id === debtId ? { ...d, reminderCount: d.reminderCount + 1 } : d
              ),
            }
          : c
      )
    );
  };

  const handleUpdateCustomerPhone = (customerId: string, phone: string) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === customerId ? { ...c, phone: phone.trim() || undefined } : c))
    );
  };

  const handleLogAdSpend = (entry: Omit<AdSpendEntry, 'id' | 'loggedAt'>) => {
    const newEntry: AdSpendEntry = {
      ...entry,
      id: Math.random().toString(36).slice(2, 9),
      loggedAt: Date.now(),
    };
    setAdSpend((prev) => [newEntry, ...prev]);
  };

  const handleAddOwed = (entry: Omit<OwedEntry, 'id' | 'createdAt' | 'settledAt'>) => {
    const newEntry: OwedEntry = {
      ...entry,
      id: Math.random().toString(36).slice(2, 9),
      createdAt: Date.now(),
      settledAt: null,
    };
    setOwed((prev) => [newEntry, ...prev]);
  };

  const handleSettleOwed = (id: string) => {
    setOwed((prev) => prev.map((o) => (o.id === id ? { ...o, settledAt: Date.now() } : o)));
  };

  const handleAddFixedCost = (entry: Omit<FixedCostEntry, 'id' | 'createdAt'>) => {
    const newEntry: FixedCostEntry = {
      ...entry,
      id: Math.random().toString(36).slice(2, 9),
      createdAt: Date.now(),
    };
    setFixedCosts((prev) => [newEntry, ...prev]);
  };

  const handleRemoveFixedCost = (id: string) => {
    setFixedCosts((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSaveBundle = (bundle: Omit<Bundle, 'id' | 'createdAt'>) => {
    const newBundle: Bundle = {
      ...bundle,
      id: Math.random().toString(36).slice(2, 9),
      createdAt: Date.now(),
    };
    setBundles((prev) => [newBundle, ...prev]);
  };

  // P1 — see tuvara-offers-analys.md: previously there was no way at all
  // to edit or remove a bundle once created (`setBundles` was only ever
  // called to add one). Same update/delete/close pattern already used for
  // stock items (handleUpdateItem/handleDeleteItem/closeAddSheet).
  const handleUpdateBundle = (updated: Bundle) => {
    setBundles((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  };

  const handleDeleteBundle = (id: string) => {
    setBundles((prev) => prev.filter((b) => b.id !== id));
  };

  const closeBundleBuilder = () => {
    setBundleBuilderOpen(false);
    setBundlePreselectId(undefined);
    setEditingBundle(null);
  };

  const handleAgingMarkdown = (item: StockItem, newPrice: number) => {
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, salePrice: newPrice, agingAction: 'markdown' } : i))
    );
  };

  const handleAgingBundle = (item: StockItem) => {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, agingAction: 'bundle' } : i)));
    setBundlePreselectId(item.id);
    setBundleBuilderOpen(true);
  };

  const handleAgingDonate = (item: StockItem, note: string) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? { ...i, quantity: 0, soldOut: true, agingAction: 'donate', agingActionNote: note || undefined }
          : i
      )
    );
  };

  const handleAgingOther = (item: StockItem, note: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, agingAction: 'other', agingActionNote: note } : i))
    );
  };

  const handleAddToCart = (
    kind: 'item' | 'bundle',
    refId: string,
    name: string,
    unitPrice: number
  ) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.kind === kind && l.refId === refId);
      if (existing) {
        return prev.map((l) =>
          l === existing ? { ...l, quantity: l.quantity + 1 } : l
        );
      }
      return [
        ...prev,
        { id: Math.random().toString(36).slice(2, 9), kind, refId, name, quantity: 1, unitPrice },
      ];
    });
  };

  // Bug fix — tuvara-quote-card-analys.md: there was previously no way to
  // correct a mis-added item or wrong quantity from the Quote card at all.
  // quantity <= 0 removes the line, mirroring the common cart-stepper
  // pattern rather than requiring a separate zero-quantity state.
  const handleUpdateCartQuantity = (lineId: string, quantity: number) => {
    setCart((prev) => {
      if (quantity <= 0) return prev.filter((l) => l.id !== lineId);
      return prev.map((l) => (l.id === lineId ? { ...l, quantity } : l));
    });
  };

  const handleRemoveCartLine = (lineId: string) => {
    setCart((prev) => prev.filter((l) => l.id !== lineId));
  };

  // B4 (tuvara-bifogade-filer-analys.md) — only ever called from the
  // seller's own explicit tap on the bulk-price suggestion banner in
  // QuoteCard.tsx, never applied on its own.
  const handleApplyBulkPrice = (lineId: string, unitPrice: number) => {
    setCart((prev) => prev.map((l) => (l.id === lineId ? { ...l, unitPrice } : l)));
  };

  // Powers the Quote card's "Undo" toast after a removal — re-inserts the
  // exact removed line (same id/quantity) rather than re-deriving it from
  // scratch. See tuvara-quote-card-analys.md P2 "undo".
  const handleRestoreLine = (line: CartLine) => {
    setCart((prev) => (prev.some((l) => l.id === line.id) ? prev : [...prev, line]));
  };

  const handleCompleteSale = (channelName?: string, customerId?: string) => {
    const total = cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
    const newSale: Sale = {
      id: Math.random().toString(36).slice(2, 9),
      date: Date.now(),
      lines: cart.map((l) => ({
        itemId: l.refId,
        name: l.name,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
      })),
      total,
      channelName: channelName?.trim() || undefined,
      customerId,
    };
    setSales((prev) => [newSale, ...prev]);

    // Bug fix — see tuvara-offers-analys.md P0 item 1. This used to only
    // match cart lines with kind === 'item' against the stock list, so
    // selling a bundle (kind === 'bundle', refId = the bundle's own id,
    // never a StockItem id) never touched the stock of the items it's
    // actually made of — the stock list silently drifted from reality
    // after every bundle sale. Tally consumption per underlying item
    // first (direct purchases + every bundle line that includes it),
    // then apply it once, so an item bought both directly and via a
    // bundle in the same cart is still decremented correctly.
    const consumedByItemId = new Map<string, number>();
    for (const line of cart) {
      if (line.kind === 'item') {
        consumedByItemId.set(line.refId, (consumedByItemId.get(line.refId) ?? 0) + line.quantity);
      } else {
        const bundle = bundles.find((b) => b.id === line.refId);
        bundle?.itemIds.forEach((itemId) => {
          consumedByItemId.set(itemId, (consumedByItemId.get(itemId) ?? 0) + line.quantity);
        });
      }
    }
    setItems((prev) =>
      prev.map((item) => {
        const consumed = consumedByItemId.get(item.id);
        if (!consumed) return item;
        const newQty = Math.max(0, item.quantity - consumed);
        return { ...item, quantity: newQty, soldOut: newQty === 0 };
      })
    );
    setCart([]);
    setQuoteOpen(false);
  };

  const handleAddBooking = (booking: Omit<Booking, 'id' | 'createdAt' | 'status'>) => {
    const newBooking: Booking = {
      ...booking,
      id: Math.random().toString(36).slice(2, 9),
      createdAt: Date.now(),
      status: 'upcoming',
    };
    setBookings((prev) => [newBooking, ...prev]);
  };

  const handleStartVisit = (booking: Booking) => {
    const item = items.find((i) => i.id === booking.itemId);
    if (item) {
      setCart((prev) => {
        const existing = prev.find((l) => l.kind === 'item' && l.refId === item.id);
        if (existing) return prev;
        return [
          ...prev,
          {
            id: Math.random().toString(36).slice(2, 9),
            kind: 'item' as const,
            refId: item.id,
            name: item.name,
            quantity: 1,
            unitPrice: item.salePrice,
          },
        ];
      });
    }
    setBookings((prev) =>
      prev.map((b) => (b.id === booking.id ? { ...b, status: 'completed' } : b))
    );
    setTab('sell');
  };

  return (
    <div className="max-w-[640px] mx-auto min-h-screen bg-cream-50 relative flex flex-col">
      <FirstRunIntro open={!seenIntro} onDismiss={() => setSeenIntro(true)} />
      <DemoDataBanner />
      <div className={`flex-1 overflow-y-auto ${showCheckoutBar ? 'pb-6' : 'pb-2'}`}>
        {tab === 'stock' && (
          <StockList
            items={filtered}
            allItems={items}
            sales={sales}
            team={team}
            activeCount={activeCount}
            activeFilterCount={activeFilterCount}
            onSearch={setSearch}
            onOpenFilters={() => setFilterOpen(true)}
            onFocusFilter={setFilters}
            onAdd={() => setAddOpen(true)}
            onEditItem={(item) => setEditingItem(item)}
            onGetWhatsAppCard={() => setWhatsAppCardOpen(true)}
            onAddCustomer={() => setAddCustomerOpen(true)}
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenBookings={() => setBookingsOpen(true)}
            onOpenDebts={() => setDebtsOpen(true)}
            onOpenBusinessHealth={() => setBusinessHealthOpen(true)}
            onOpenCustomers={() => setCustomersSheetOpen(true)}
            onOpenAging={(item) => setAgingItem(item)}
            currencySymbol={settings.currencySymbol}
            exchangeRates={settings.exchangeRates ?? {}}
            periods={periods}
            periodFilter={periodFilter}
            onPeriodFilterChange={setPeriodFilter}
          />
        )}
        {tab === 'sell' && (
          <SellTab
            items={items}
            bundles={bundles}
            currencySymbol={settings.currencySymbol}
            cart={cart}
            onAdd={handleAddToCart}
            customers={customers}
            onGetWhatsAppCard={() => setWhatsAppCardOpen(true)}
            onAddCustomer={() => setAddCustomerOpen(true)}
            onOpenSettings={() => setSettingsOpen(true)}
            moreMenuItems={[{ label: 'Recent sales', onClick: () => setSalesHistoryOpen(true) }]}
          />
        )}
        {tab === 'offers' && (
          <OffersTab
            bundles={bundles}
            items={items}
            currencySymbol={settings.currencySymbol}
            onCreate={() => setBundleBuilderOpen(true)}
            onEditBundle={(bundle) => setEditingBundle(bundle)}
            onGetWhatsAppCard={() => setWhatsAppCardOpen(true)}
            onAddCustomer={() => setAddCustomerOpen(true)}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        )}
      </div>

      <div className="sticky bottom-0 left-0 right-0 z-30">
        {showCheckoutBar ? (
          <CheckoutBar
            count={cartCount}
            total={cartTotal}
            currencySymbol={settings.currencySymbol}
            onCheckout={() => setQuoteOpen(true)}
          />
        ) : null}
        <BottomNav active={tab} onChange={setTab} cartCount={cartCount} />
      </div>

      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        items={items}
        onApply={setFilters}
      />
      <AddSheet
        open={addOpen || editingItem !== null}
        onClose={closeAddSheet}
        onSave={handleSave}
        editItem={editingItem}
        onUpdate={handleUpdateItem}
        onDelete={handleDeleteItem}
        simulateFreePlan={settings.simulateFreePlan}
        currencySymbol={settings.currencySymbol}
        exchangeRates={settings.exchangeRates}
        items={items}
        sales={sales}
        markupPresets={settings.markupPresets}
        seasonPresets={settings.seasonPresets}
      />
      <WhatsAppCardSheet open={whatsAppCardOpen} onClose={() => setWhatsAppCardOpen(false)} />
      <AddCustomerSheet
        open={addCustomerOpen}
        onClose={() => setAddCustomerOpen(false)}
        onSave={handleSaveCustomer}
      />
      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onChange={setSettings}
        team={team}
        onTeamChange={setTeam}
        items={items}
        periods={periods}
        onStartPeriod={handleStartPeriod}
      />
      <BundleBuilder
        open={bundleBuilderOpen || editingBundle !== null}
        onClose={closeBundleBuilder}
        items={items}
        currencySymbol={settings.currencySymbol}
        onSave={handleSaveBundle}
        preselectedItemId={bundlePreselectId}
        editBundle={editingBundle}
        onUpdate={handleUpdateBundle}
        onDelete={handleDeleteBundle}
      />
      <AgingActionSheet
        open={agingItem !== null}
        item={agingItem}
        currencySymbol={settings.currencySymbol}
        onClose={() => setAgingItem(null)}
        onMarkdown={handleAgingMarkdown}
        onBundle={handleAgingBundle}
        onDonate={handleAgingDonate}
        onOther={handleAgingOther}
      />
      <QuoteCard
        open={quoteOpen}
        onClose={() => setQuoteOpen(false)}
        cart={cart}
        currencySymbol={settings.currencySymbol}
        businessName={settings.businessName}
        contactInfo={settings.contactInfo}
        logoUrl={settings.logoUrl}
        website={settings.website}
        socialLinks={settings.socialLinks}
        printFormat={settings.printFormat}
        channelOptions={cartChannelOptions}
        items={items}
        bundles={bundles}
        customers={customers}
        onComplete={handleCompleteSale}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveLine={handleRemoveCartLine}
        onRestoreLine={handleRestoreLine}
        onApplyBulkPrice={handleApplyBulkPrice}
      />
      <SalesHistorySheet
        open={salesHistoryOpen}
        onClose={() => setSalesHistoryOpen(false)}
        sales={sales}
        customers={customers}
        currencySymbol={settings.currencySymbol}
      />
      <BookingsSheet
        open={bookingsOpen}
        onClose={() => setBookingsOpen(false)}
        bookings={bookings}
        items={items}
        currencySymbol={settings.currencySymbol}
        onAddBooking={handleAddBooking}
        onStartVisit={handleStartVisit}
      />
      <CustomerDebtsSheet
        open={debtsOpen}
        onClose={() => setDebtsOpen(false)}
        customers={customers}
        currencySymbol={settings.currencySymbol}
        onAddDebt={handleAddDebt}
        onSettleDebt={handleSettleDebt}
        onReminderSent={handleReminderSent}
        onUpdateCustomerPhone={handleUpdateCustomerPhone}
      />
      <BusinessHealthSheet
        open={businessHealthOpen}
        onClose={() => setBusinessHealthOpen(false)}
        items={items}
        sales={sales}
        customers={customers}
        adSpend={adSpend}
        owed={owed}
        fixedCosts={fixedCosts}
        currencySymbol={settings.currencySymbol}
        onLogAdSpend={handleLogAdSpend}
        onAddOwed={handleAddOwed}
        onSettleOwed={handleSettleOwed}
        onAddFixedCost={handleAddFixedCost}
        onRemoveFixedCost={handleRemoveFixedCost}
      />
      <CustomersSheet
        open={customersSheetOpen}
        onClose={() => setCustomersSheetOpen(false)}
        customers={customers}
        sales={sales}
      />
    </div>
  );
}

export default App;
