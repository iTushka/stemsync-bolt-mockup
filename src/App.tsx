import { useState, useMemo } from 'react';
import { StockList } from './components/StockList';
import { FilterSheet } from './components/FilterSheet';
import { AddSheet } from './components/AddSheet';
import { BottomNav } from './components/BottomNav';
import { CheckoutBar } from './components/CheckoutBar';
import { SellPlaceholder } from './components/SellPlaceholder';
import { mockItems } from './mockData';
import { emptyFilters, type StockItem, type Filters } from './types';
import { applyFilters, countActiveFilters } from './filterLogic';

const MOCK_ITEM_PRICE = 45;

function App() {
  const [items, setItems] = useState<StockItem[]>(mockItems);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [tab, setTab] = useState<'stock' | 'sell'>('stock');
  const [mockCartCount, setMockCartCount] = useState(0);

  const activeCount = items.filter((i) => !i.soldOut).length;
  const activeFilterCount = countActiveFilters(filters);
  const showCheckoutBar = tab === 'sell' && mockCartCount > 0;

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

  return (
    <div className="max-w-[640px] mx-auto min-h-screen bg-cream-50 relative flex flex-col">
      {/* Scrollable content area — bottom padding grows when the checkout bar is also showing,
          mirroring the real app's pb-28 / pb-48 pattern so we can feel the actual collision risk. */}
      <div className={`flex-1 overflow-y-auto ${showCheckoutBar ? 'pb-6' : 'pb-2'}`}>
        {tab === 'stock' ? (
          <StockList
            items={filtered}
            activeCount={activeCount}
            activeFilterCount={activeFilterCount}
            onSearch={setSearch}
            onOpenFilters={() => setFilterOpen(true)}
            onAdd={() => setAddOpen(true)}
          />
        ) : (
          <SellPlaceholder
            cartCount={mockCartCount}
            onAddMock={() => setMockCartCount((c) => c + 1)}
            onClear={() => setMockCartCount(0)}
          />
        )}
      </div>

      {/* Fixed bottom region: checkout bar (only on Sell, only with mock items) stacked
          directly above the nav — this is the exact stack we're testing for D. */}
      <div className="sticky bottom-0 left-0 right-0 z-30">
        {showCheckoutBar ? (
          <CheckoutBar count={mockCartCount} total={mockCartCount * MOCK_ITEM_PRICE} />
        ) : null}
        <BottomNav active={tab} onChange={setTab} cartCount={mockCartCount} />
      </div>

      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        items={items}
        onApply={setFilters}
      />
      <AddSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}

export default App;
