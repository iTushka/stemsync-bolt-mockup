import { useState, useEffect } from 'react';
import { X, Sparkles, Lightbulb } from 'lucide-react';
import { Sheet } from './Sheet';
import { AiBadge } from './AiBadge';
import type { BusinessProfile } from '../types';
import {
  CUSTOMER_TYPE_OPTIONS,
  CHALLENGE_OPTIONS,
  CHALLENGE_TIPS,
  interpretChallengeFromNote,
  type ChallengeOption,
} from '../businessProfile';

interface BusinessProfileSheetProps {
  open: boolean;
  onClose: () => void;
  profile: BusinessProfile | null;
  onSave: (profile: BusinessProfile) => void;
}

/**
 * "About your business" — a combination of alternative A (private,
 * free-text notes) and alternative B (a short structured profile) from
 * docs/tuvara-ai-berattelse-onboarding-analys.md, per Tushar's answer to
 * that analysis's open questions. Entirely optional, entirely on-device
 * (same usePersistentState pattern as everything else, nothing sent
 * anywhere), and deliberately small: one free-text note plus two preset
 * pickers, not a form to complete before using the app.
 *
 * The "very limited AI interpretation" (Tushar's answer 3) only ever
 * offers a single suggested challenge preset from businessProfile.ts's
 * keyword matcher — shown behind <AiBadge/>, never applied automatically,
 * and only computed from text the seller already typed for themselves.
 */
export function BusinessProfileSheet({ open, onClose, profile, onSave }: BusinessProfileSheetProps) {
  const [note, setNote] = useState(profile?.note ?? '');
  const [customerType, setCustomerType] = useState<string | undefined>(profile?.customerType);
  const [mainChallenge, setMainChallenge] = useState<string | undefined>(profile?.mainChallenge);
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);

  // Re-sync local draft whenever the sheet is (re)opened with the latest
  // saved profile — mirrors the pattern already used by other sheets that
  // edit a single persisted object (e.g. LegalAgreementSheet's `name`).
  useEffect(() => {
    if (open) {
      setNote(profile?.note ?? '');
      setCustomerType(profile?.customerType);
      setMainChallenge(profile?.mainChallenge);
      setSuggestionDismissed(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const suggestedChallenge = interpretChallengeFromNote(note);
  const showSuggestion =
    !suggestionDismissed &&
    suggestedChallenge !== undefined &&
    suggestedChallenge !== mainChallenge;

  const handleSave = () => {
    onSave({
      note: note.trim(),
      customerType,
      mainChallenge,
      updatedAt: Date.now(),
    });
    onClose();
  };

  const applySuggestion = (challenge: ChallengeOption) => {
    setMainChallenge(challenge);
    setSuggestionDismissed(true);
  };

  return (
    <Sheet open={open} onClose={handleSave} maxHeight="94vh">
      <div className="flex items-center justify-between px-5 py-2 shrink-0">
        <h2 className="text-lg font-bold text-stone-900">About your business</h2>
        <button
          onClick={handleSave}
          className="w-8 h-8 rounded-full flex items-center justify-center text-stone-500 hover:bg-stone-100 active:scale-95 transition"
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6 no-scrollbar space-y-6">
        <p className="text-xs text-stone-400 leading-snug">
          Entirely optional, and just for you — this stays on this device and is never sent
          anywhere. It's a place to say more about your business, not another form to fill in
          before you can use the app.
        </p>

        {/* Option A: free-text note */}
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1.5">
            In your own words
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What's this business really about? Your goals, what you're proud of, what's hard right now — write as much or as little as you like."
            rows={5}
            className="input w-full resize-none"
          />
        </div>

        {showSuggestion && suggestedChallenge && (
          <div className="space-y-2">
            <AiBadge
              text={`Sounds like "${suggestedChallenge}" might be the challenge — want to set that below?`}
            />
            <div className="flex gap-2">
              <button
                onClick={() => applySuggestion(suggestedChallenge)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent-500 text-white text-xs font-semibold active:scale-95 transition"
              >
                <Sparkles size={12} /> Use this
              </button>
              <button
                onClick={() => setSuggestionDismissed(true)}
                className="px-3 py-1.5 rounded-full text-xs font-medium text-stone-500 hover:text-stone-700 transition"
              >
                No thanks
              </button>
            </div>
          </div>
        )}

        {/* Option B: structured presets */}
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1.5">
            Who do you mostly sell to?
          </label>
          <div className="flex flex-wrap gap-2">
            {CUSTOMER_TYPE_OPTIONS.map((option) => (
              <button
                key={option}
                onClick={() => setCustomerType(customerType === option ? undefined : option)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition active:scale-95 ${
                  customerType === option
                    ? 'bg-accent-500 border-accent-500 text-white'
                    : 'bg-white border-stone-200 text-stone-600 hover:border-accent-300'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1.5">
            What's the hardest part right now?
          </label>
          <div className="flex flex-wrap gap-2">
            {CHALLENGE_OPTIONS.map((option) => (
              <button
                key={option}
                onClick={() => setMainChallenge(mainChallenge === option ? undefined : option)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition active:scale-95 ${
                  mainChallenge === option
                    ? 'bg-accent-500 border-accent-500 text-white'
                    : 'bg-white border-stone-200 text-stone-600 hover:border-accent-300'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          {mainChallenge && CHALLENGE_TIPS[mainChallenge as ChallengeOption] && (
            <div className="mt-2 flex items-start gap-2 text-xs text-stone-500 leading-snug bg-stone-50 rounded-xl px-3 py-2">
              <Lightbulb size={14} className="text-stone-400 mt-0.5 shrink-0" />
              <p>{CHALLENGE_TIPS[mainChallenge as ChallengeOption]}</p>
            </div>
          )}
        </div>

        <button
          onClick={handleSave}
          className="w-full h-11 rounded-full bg-accent-500 text-white font-semibold text-sm active:scale-[0.98] transition"
        >
          Save
        </button>
      </div>
    </Sheet>
  );
}
