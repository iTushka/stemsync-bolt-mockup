import { useState } from 'react';
import { ArrowLeft, Plus, Wallet, CalendarPlus, MessageCircle, Check } from 'lucide-react';
import { Sheet } from './Sheet';
import { downloadDebtFollowUp } from '../ics';
import { buildDebtReminderLink, previewDebtReminderMessage } from '../debtReminders';
import type { Customer, CustomerDebt } from '../types';

interface CustomerDebtsSheetProps {
  open: boolean;
  onClose: () => void;
  customers: Customer[];
  currencySymbol: string;
  onAddDebt: (
    customerId: string,
    debt: Omit<CustomerDebt, 'id' | 'createdAt' | 'reminderCount' | 'settledAt'>
  ) => void;
  onSettleDebt: (customerId: string, debtId: string) => void;
  onReminderSent: (customerId: string, debtId: string) => void;
  onUpdateCustomerPhone: (customerId: string, phone: string) => void;
}

type View = 'list' | 'new' | { customerId: string; debtId: string };

function daysUntil(ts: number): string {
  const days = Math.round((ts - Date.now()) / 86400000);
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'today';
  return `in ${days}d`;
}

export function CustomerDebtsSheet({
  open,
  onClose,
  customers,
  currencySymbol,
  onAddDebt,
  onSettleDebt,
  onReminderSent,
  onUpdateCustomerPhone,
}: CustomerDebtsSheetProps) {
  const [view, setView] = useState<View>('list');
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

  const resetForm = () => {
    setCustomerId('');
    setAmount('');
    setNote('');
    setFollowUpDate('');
  };

  const handleClose = () => {
    setView('list');
    resetForm();
    onClose();
  };

  // Every unpaid debt across every customer, flattened and sorted so the
  // ones with the nearest follow-up date surface first — undated ones
  // (no reminder set) sink to the bottom rather than being lost among them.
  const unpaid = customers
    .flatMap((c) => c.debts.filter((d) => !d.settledAt).map((d) => ({ customer: c, debt: d })))
    .sort((a, b) => {
      if (a.debt.followUpDate && b.debt.followUpDate) return a.debt.followUpDate - b.debt.followUpDate;
      if (a.debt.followUpDate) return -1;
      if (b.debt.followUpDate) return 1;
      return b.debt.createdAt - a.debt.createdAt;
    });

  const handleSaveDebt = () => {
    const value = parseFloat(amount);
    if (!customerId || isNaN(value) || value <= 0) return;
    onAddDebt(customerId, {
      amount: Math.round(value * 100) / 100,
      note: note.trim() || undefined,
      followUpDate: followUpDate ? new Date(followUpDate).getTime() : undefined,
    });
    resetForm();
    setView('list');
  };

  return (
    <Sheet open={open} onClose={handleClose} maxHeight="94vh">
      <div className="flex items-center gap-2 px-5 py-2 shrink-0">
        {view !== 'list' && (
          <button
            onClick={() => setView('list')}
            aria-label="Back"
            className="w-8 h-8 -ml-1.5 rounded-full flex items-center justify-center text-stone-500 hover:bg-stone-100 transition"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <h2 className="text-lg font-bold text-stone-900">
          {view === 'list' ? 'Customer বাকি' : view === 'new' ? 'New বাকি' : 'বাকি details'}
        </h2>
      </div>

      {view === 'list' && (
        <div className="flex-1 overflow-y-auto px-5 pb-4 no-scrollbar">
          {unpaid.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Wallet size={36} className="text-stone-300 mb-3" />
              <p className="text-stone-500 text-sm max-w-[240px]">
                No outstanding বাকি — log one when a customer owes you money.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {unpaid.map(({ customer, debt }) => (
                <button
                  key={debt.id}
                  onClick={() => setView({ customerId: customer.id, debtId: debt.id })}
                  className="w-full text-left flex items-center justify-between rounded-xl border border-stone-200 bg-white px-3.5 py-3 hover:border-accent-300 transition"
                >
                  <div>
                    <div className="text-sm font-semibold text-stone-800">{customer.name}</div>
                    <div className="text-xs text-stone-400">
                      {debt.note ? `${debt.note} · ` : ''}
                      {debt.followUpDate ? daysUntil(debt.followUpDate) : 'no reminder set'}
                    </div>
                  </div>
                  <span className="text-sm font-bold text-stone-900">
                    {debt.amount} {currencySymbol}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {view === 'new' && (
        <div className="flex-1 overflow-y-auto px-5 pb-4 no-scrollbar space-y-4">
          {customers.length === 0 ? (
            <p className="text-sm text-stone-500">
              No customers yet — add one first (QR menu → Add a customer), then come back here.
            </p>
          ) : (
            <>
              <label className="block">
                <span className="block text-xs font-medium text-stone-500 mb-1">Customer</span>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="input"
                >
                  <option value="">Select a customer…</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-stone-500 mb-1">
                  Amount owed ({currencySymbol})
                </span>
                <input
                  type="number"
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
                  placeholder="e.g. Half payment for order"
                  className="input"
                />
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-stone-500 mb-1">
                  Follow-up reminder (optional)
                </span>
                <input
                  type="datetime-local"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="input"
                />
              </label>
            </>
          )}
        </div>
      )}

      {typeof view === 'object' && (
        <DebtDetail
          customer={customers.find((c) => c.id === view.customerId)}
          debtId={view.debtId}
          currencySymbol={currencySymbol}
          onSettleDebt={onSettleDebt}
          onReminderSent={onReminderSent}
          onUpdateCustomerPhone={onUpdateCustomerPhone}
          onDone={() => setView('list')}
        />
      )}

      <div className="shrink-0 px-5 pt-3 pb-5 safe-bottom border-t border-stone-100 bg-cream-50">
        {view === 'list' && (
          <button
            onClick={() => setView('new')}
            className="w-full h-12 rounded-full bg-accent-500 text-white font-semibold text-sm shadow-fab flex items-center justify-center gap-1.5 hover:bg-accent-600 active:scale-[0.98] transition"
          >
            <Plus size={17} /> New বাকি
          </button>
        )}
        {view === 'new' && customers.length > 0 && (
          <button
            onClick={handleSaveDebt}
            disabled={!customerId || !amount || Number(amount) <= 0}
            className="w-full h-12 rounded-full bg-accent-500 text-white font-semibold text-sm shadow-fab hover:bg-accent-600 active:scale-[0.98] transition disabled:opacity-40 disabled:shadow-none"
          >
            Save বাকি
          </button>
        )}
      </div>
    </Sheet>
  );
}

function DebtDetail({
  customer,
  debtId,
  currencySymbol,
  onSettleDebt,
  onReminderSent,
  onUpdateCustomerPhone,
  onDone,
}: {
  customer: Customer | undefined;
  debtId: string;
  currencySymbol: string;
  onSettleDebt: (customerId: string, debtId: string) => void;
  onReminderSent: (customerId: string, debtId: string) => void;
  onUpdateCustomerPhone: (customerId: string, phone: string) => void;
  onDone: () => void;
}) {
  const [phoneInput, setPhoneInput] = useState('');

  const debt = customer?.debts.find((d) => d.id === debtId);
  if (!customer || !debt) {
    return (
      <div className="flex-1 overflow-y-auto px-5 pb-4 no-scrollbar">
        <p className="text-sm text-stone-500">This বাকি entry could not be found.</p>
      </div>
    );
  }

  const reminderLink = buildDebtReminderLink(customer, debt, currencySymbol);
  const preview = previewDebtReminderMessage(customer, debt, currencySymbol);

  return (
    <div className="flex-1 overflow-y-auto px-5 pb-4 no-scrollbar">
      <div className="rounded-2xl border border-stone-200 bg-white p-4">
        <div className="text-xs font-medium text-stone-400 mb-1">{customer.name}</div>
        <div className="text-2xl font-bold text-stone-900">
          {debt.amount} {currencySymbol}
        </div>
        {debt.note && <div className="mt-1 text-sm text-stone-500">{debt.note}</div>}
        {debt.settledAt && (
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold px-2 py-0.5">
            <Check size={12} /> Paid
          </div>
        )}
      </div>

      {!debt.settledAt && (
        <button
          onClick={() => onSettleDebt(customer.id, debt.id)}
          className="mt-3 w-full h-11 rounded-full border border-stone-200 bg-white text-sm font-semibold text-stone-700 hover:border-accent-300 transition"
        >
          Mark as paid
        </button>
      )}

      {debt.followUpDate && (
        <button
          onClick={() => downloadDebtFollowUp(customer, debt, currencySymbol)}
          className="mt-3 w-full h-11 rounded-full border border-stone-200 bg-white text-sm font-semibold text-stone-700 flex items-center justify-center gap-1.5 hover:border-accent-300 transition"
        >
          <CalendarPlus size={16} /> Add to calendar
        </button>
      )}

      {!debt.settledAt && (
        <div className="mt-5">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
            WhatsApp reminder ({debt.reminderCount === 0 ? '1st' : debt.reminderCount === 1 ? '2nd' : '3rd+'} message)
          </div>
          <div className="rounded-xl bg-cream-100 border border-stone-200 px-3 py-2.5 text-sm text-stone-700 whitespace-pre-wrap">
            {preview}
          </div>
          <p className="mt-1.5 text-[11px] text-amber-600 leading-snug">
            Bangla wording not yet reviewed by a native speaker — check with Ru/Tumpa before sending to a real customer.
          </p>

          {!customer.phone && (
            <div className="mt-2.5 flex gap-2">
              <input
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="Add WhatsApp number"
                className="input flex-1"
              />
              <button
                onClick={() => onUpdateCustomerPhone(customer.id, phoneInput)}
                disabled={!phoneInput.trim()}
                className="h-11 px-4 rounded-full bg-stone-800 text-white text-sm font-semibold disabled:opacity-40"
              >
                Save
              </button>
            </div>
          )}

          {reminderLink && (
            <a
              href={reminderLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onReminderSent(customer.id, debt.id)}
              className="mt-2.5 w-full h-12 rounded-full bg-emerald-500 text-white font-semibold text-sm shadow-fab flex items-center justify-center gap-1.5 hover:bg-emerald-600 active:scale-[0.98] transition"
            >
              <MessageCircle size={17} /> Open WhatsApp with this message
            </a>
          )}
        </div>
      )}

      {debt.settledAt && (
        <button
          onClick={onDone}
          className="mt-6 w-full h-11 rounded-full border border-stone-200 bg-white text-sm font-semibold text-stone-700"
        >
          Back to list
        </button>
      )}
    </div>
  );
}
