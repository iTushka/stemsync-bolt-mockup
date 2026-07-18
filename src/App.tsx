import { useState, useMemo } from 'react';
import { StockList } from './components/StockList';
import { FilterSheet } from './components/FilterSheet';
import { AddSheet } from './components/AddSheet';
import { BottomNav } from './components/BottomNav';
import { CheckoutBar } from './components/CheckoutBar';
import { SellTab } from './components/SellTab';
import { OffersTab } from './components/OffersTab';
import { BundleBuilder } from './components/BundleBuilder';
import { WhatsAppCardSheet } from './components/WhatsAppCardSheet';
import { AddCustomerSheet } from './components/AddCustomerSheet';
import { SettingsSheet } from './components/SettingsSheet';
import { QuoteCard } from './components/QuoteCard';
import { BookingsSheet } from './components/BookingsSheet';
import { mockItems } from './mockData';
import {
  emptyFilters,
  defaultSettings,
  type StockItem,
  type Filters,
  type Customer,
  type Bundle,
  type AppSettings,
  type TeamUser,
  type CartLine,
  type Booking,
} from './types';
import { applyFilters, countActiveFilters } from './filterLogic';

type Tab = 'stock' | 'sell' | 'offers';

function App() {
  const [items, setItems] = useState<StockItem[]>(mockItems);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('stock');

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [whatsAppCardOpen, setWhatsAppCardOpen] = useState(false);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);

  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [team, setTeam] = useState<TeamUser[]>([
    { id: 'owner', name: 'You', role: 'Owner' },
  ]);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [bundleBuilderOpen, setBundleBuilderOpen] = useState(false);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [quoteOpen, setQuoteOpen] = useState(false);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsOpen, setBookingsOpen] = useState(false);

  const activeCount = items.filter((i) => !i.soldOut).length;
  const activeFilterCount = countActiveFilters(filters);
  const cartCount = cart.reduce((sum, l) => sum + l.quantity, 0);
  const cartTotal = cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const showCheckoutBar = tab === 'sell' && cartCount > 0;

  const filtered = useMemo(() => {
    const searched = search
      ? items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
      : items;
    return applyFilters(searched, filters);
  }, [items, search, filters]);

  const handleSave = (draft: Omit<StockItem, 'id' | 'createdAt'>) => {
    const newItem: StockItem = {
      ...draft,
      id: Math.random().toString(36).slice(2, 9),
      createdAt: Date.now(),
    };
    setItems((prev) => [newItem, ...prev]);
  };

  const handleSaveCustomer = (customer: Omit<Customer, 'id' | 'addedAt'>) => {
    const newCustomer: Customer = {
      ...customer,
      id: Math.random().toString(36).slice(2, 9),
      addedAt: Date.now(),
    };
    setCustomers((prev) => [newCustomer, ...prev]);
  };

  const handleSaveBundle = (bundle: Omit<Bundle, 'id' | 'createdAt'>) => {
    const newBundle: Bundle = {
      ...bundle,
      id: Math.random().toString(36).slice(2, 9),
      createdAt: Date.now(),
    };
    setBundles((prev) => [newBundle, ...prev]);
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

  const handleCompleteSale = () => {
    setItems((prev) =>
      prev.map((item) => {
        const line = cart.find((l) => l.kind === 'item' && l.refId === item.id);
        if (!line) return item;
        const newQty = Math.max(0, item.quantity - line.quantity);
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
      <div className={`flex-1 overflow-y-auto ${showCheckoutBar ? 'pb-6' : 'pb-2'}`}>
        {tab === 'stock' && (
          <StockList
            items={filtered}
            activeCount={activeCount}
            activeFilterCount={activeFilterCount}
            onSearch={setSearch}
            onOpenFilters={() => setFilterOpen(true)}
            onAdd={() => setAddOpen(true)}
            onGetWhatsAppCard={() => setWhatsAppCardOpen(true)}
            onAddCustomer={() => setAddCustomerOpen(true)}
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenBookings={() => setBookingsOpen(true)}
            currencySymbol={settings.currencySymbol}
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
          />
        )}
        {tab === 'offers' && (
          <OffersTab
            bundles={bundles}
            items={items}
            currencySymbol={settings.currencySymbol}
            onCreate={() => setBundleBuilderOpen(true)}
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
      <AddSheet open={addOpen} onClose={() => setAddOpen(false)} onSave={handleSave} />
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
      />
      <BundleBuilder
        open={bundleBuilderOpen}
        onClose={() => setBundleBuilderOpen(false)}
        items={items}
        currencySymbol={settings.currencySymbol}
        onSave={handleSaveBundle}
      />
      <QuoteCard
        open={quoteOpen}
        onClose={() => setQuoteOpen(false)}
        cart={cart}
        currencySymbol={settings.currencySymbol}
        businessName={settings.businessName}
        contactInfo={settings.contactInfo}
        onComplete={handleCompleteSale}
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
    </div>
  );
}

export default App;
