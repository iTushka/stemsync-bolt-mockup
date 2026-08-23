import { useState } from 'react';
import { Sheet } from '../components/Sheet';
import {
  fetchSecurityQuestion,
  submitSecurityAnswer,
  completePasswordReset,
} from '../lib/demoAgentAuth';

interface Props {
  onClose: () => void;
}

type Step =
  | { name: 'phone' }
  | { name: 'answer'; phone: string; question: string }
  | { name: 'newPassword'; phone: string; token: string }
  | { name: 'done' };

const STATUS_MESSAGE: Record<string, string> = {
  not_found: 'No demo account found for that phone number.',
  no_question_set: "This account doesn't have a security question set up — ask Tushar to reset your password directly.",
  locked_out: 'Too many wrong answers — try again in 30 minutes.',
  wrong_answer: "That answer doesn't match — try again.",
};

/**
 * "Forgot password" — same three-step security-question flow as
 * tuvara-faltagent's ForgotPasswordSheet.tsx (tuvara-sales Krav 5): phone
 * -> security answer -> new password. No SMS/email involved, matching the
 * kravspec's explicit "no new paid infrastructure" constraint.
 */
export function ForgotDemoAgentPasswordSheet({ onClose }: Props) {
  const [step, setStep] = useState<Step>({ name: 'phone' });
  const [phoneInput, setPhoneInput] = useState('');
  const [answerInput, setAnswerInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await fetchSecurityQuestion(phoneInput);
      if (result.status !== 'ok' || !result.question) {
        setError(STATUS_MESSAGE[result.status] ?? 'Something went wrong — try again.');
        return;
      }
      setStep({ name: 'answer', phone: phoneInput, question: result.question });
    } catch {
      setError('Something went wrong — try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step.name !== 'answer') return;
    setError(null);
    setLoading(true);
    try {
      const result = await submitSecurityAnswer(step.phone, answerInput);
      if (result.status !== 'success' || !result.token) {
        setError(STATUS_MESSAGE[result.status] ?? 'Something went wrong — try again.');
        return;
      }
      setStep({ name: 'newPassword', phone: step.phone, token: result.token });
    } catch {
      setError('Something went wrong — try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNewPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step.name !== 'newPassword') return;
    setError(null);
    setLoading(true);
    try {
      const resetError = await completePasswordReset(step.phone, step.token, newPasswordInput);
      if (resetError) {
        setError(resetError);
        return;
      }
      setStep({ name: 'done' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open onClose={onClose} maxHeight="80vh">
      <div className="p-6 pt-2">
        <h2 className="text-base font-semibold text-stone-800 mb-4">Forgot password</h2>

        {step.name === 'phone' && (
          <form onSubmit={handlePhoneSubmit} className="space-y-3">
            <p className="text-xs text-stone-500">Enter your phone number to see your security question.</p>
            <input
              type="tel"
              required
              autoFocus
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="+46701234567"
              className="input"
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button type="submit" disabled={loading} className="w-full py-2 rounded-lg bg-accent-500 text-white text-sm font-medium disabled:opacity-50">
              {loading ? 'Checking…' : 'Continue'}
            </button>
          </form>
        )}

        {step.name === 'answer' && (
          <form onSubmit={handleAnswerSubmit} className="space-y-3">
            <p className="text-sm font-medium text-stone-700">{step.question}</p>
            <input
              type="text"
              required
              autoFocus
              value={answerInput}
              onChange={(e) => setAnswerInput(e.target.value)}
              placeholder="Your answer"
              className="input"
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button type="submit" disabled={loading} className="w-full py-2 rounded-lg bg-accent-500 text-white text-sm font-medium disabled:opacity-50">
              {loading ? 'Checking…' : 'Continue'}
            </button>
          </form>
        )}

        {step.name === 'newPassword' && (
          <form onSubmit={handleNewPasswordSubmit} className="space-y-3">
            <p className="text-xs text-stone-500">Set a new password.</p>
            <input
              type="password"
              required
              autoFocus
              minLength={6}
              value={newPasswordInput}
              onChange={(e) => setNewPasswordInput(e.target.value)}
              placeholder="New password"
              className="input"
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button type="submit" disabled={loading} className="w-full py-2 rounded-lg bg-accent-500 text-white text-sm font-medium disabled:opacity-50">
              {loading ? 'Saving…' : 'Set new password'}
            </button>
          </form>
        )}

        {step.name === 'done' && (
          <div className="space-y-3">
            <p className="text-sm text-stone-700">Password updated — sign in with your new password.</p>
            <button onClick={onClose} className="w-full py-2 rounded-lg bg-accent-500 text-white text-sm font-medium">
              Back to sign-in
            </button>
          </div>
        )}
      </div>
    </Sheet>
  );
}
