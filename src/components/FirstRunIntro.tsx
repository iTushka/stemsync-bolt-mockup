import { useState } from 'react';
import { Wallet, Store, HelpCircle, Camera, Tag, TrendingUp } from 'lucide-react';
import { useLanguage } from '../useLanguage';

interface FirstRunIntroProps {
  open: boolean;
  onDismiss: () => void;
}

/**
 * Minimal in-app "so funkar det" sequence — P1.6. Not new content: it's
 * the already-vetted "3 rules" (pocket.html) and "5 things you can do"
 * (tuvara_walkthrough_shoilee.pdf) condensed into 4 screens, shown once,
 * inside the app itself. See the "coverage note" in strings.ts for why —
 * a prospect exploring alone previously had nothing between the external
 * walkthrough PDF and the (fairly dense) Add-item card.
 *
 * Deliberately does NOT close on backdrop tap — a first-time visitor
 * dismissing this by an accidental tap outside would land back at square
 * one with no orientation at all, worse than not showing it. Skip/Next/
 * Done are all explicit.
 */
export function FirstRunIntro({ open, onDismiss }: FirstRunIntroProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);

  if (!open) return null;

  const steps = [
    {
      icon: null,
      title: t('introStep1Title'),
      rules: [
        { Icon: Wallet, text: t('introStep1Money') },
        { Icon: Store, text: t('introStep1Shop') },
        { Icon: HelpCircle, text: t('introStep1Guess') },
      ],
      body: undefined as string | undefined,
    },
    { icon: Camera, title: t('introStep2Title'), body: t('introStep2Body'), rules: undefined },
    { icon: Tag, title: t('introStep3Title'), body: t('introStep3Body'), rules: undefined },
    { icon: TrendingUp, title: t('introStep4Title'), body: t('introStep4Body'), rules: undefined },
  ] as const;

  const isLast = step === steps.length - 1;
  const current = steps[step];

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-stone-900/50 animate-fadeIn">
      <div className="w-full sm:max-w-sm bg-cream-50 rounded-t-3xl sm:rounded-3xl shadow-sheet animate-slideUp p-6 pb-7">
        {/* Step dots */}
        <div className="flex items-center justify-center gap-1.5 mb-5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-6 bg-accent-500' : 'w-1.5 bg-stone-200'
              }`}
            />
          ))}
        </div>

        <div className="min-h-[210px] flex flex-col items-center text-center">
          {current.rules ? (
            <>
              <h2 className="text-lg font-bold text-stone-900 mb-4">{current.title}</h2>
              <div className="w-full space-y-2.5">
                {current.rules.map(({ Icon, text }) => (
                  <div
                    key={text}
                    className="flex items-center gap-3 bg-white rounded-2xl border border-stone-200 px-4 py-3 text-left"
                  >
                    <Icon size={20} className="text-accent-500 shrink-0" />
                    <span className="text-sm font-medium text-stone-700">{text}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              {current.icon && (
                <div className="w-14 h-14 rounded-2xl bg-accent-50 flex items-center justify-center mb-4">
                  <current.icon size={26} className="text-accent-500" />
                </div>
              )}
              <h2 className="text-lg font-bold text-stone-900 mb-2">{current.title}</h2>
              <p className="text-sm text-stone-600 leading-relaxed">{current.body}</p>
            </>
          )}
        </div>

        <div className="flex items-center justify-between mt-6 gap-3">
          {step > 0 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="text-sm font-medium text-stone-400 hover:text-stone-600 transition px-2 py-2"
            >
              {t('introBack')}
            </button>
          ) : (
            <button
              onClick={onDismiss}
              className="text-sm font-medium text-stone-400 hover:text-stone-600 transition px-2 py-2"
            >
              {t('introSkip')}
            </button>
          )}

          <button
            onClick={() => (isLast ? onDismiss() : setStep((s) => s + 1))}
            className="flex-1 h-11 rounded-full bg-accent-500 text-white font-semibold text-sm shadow-fab hover:bg-accent-600 active:scale-[0.98] transition"
          >
            {isLast ? t('introDone') : t('introNext')}
          </button>
        </div>
      </div>
    </div>
  );
}
