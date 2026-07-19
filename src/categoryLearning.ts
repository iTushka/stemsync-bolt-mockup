import type { Category } from './types';
import { STORAGE_PREFIX } from './config';

/**
 * The honest answer to "how do we detect categories across languages and
 * industries": a hardcoded keyword list (see categoryFieldMap.ts) can
 * never cover every language a seller might write in — Jhum Fashion's
 * real listings are in Bangla script mixed with English, and no keyword
 * list I write myself can be verified correct without native review. The
 * industry-proven fix for this is a real multilingual LLM call (see the
 * write-up shared alongside this — same backend/API-key/cost trade-off
 * already deferred for free-text price parsing, and for the same reasons).
 *
 * This is the honest, free, client-side middle step: instead of guessing
 * with words I chose, the app learns from words the SELLER actually uses.
 * Every time an item is saved, whatever category it ends up with gets
 * associated with the words in its name/description. Over time this
 * builds a vocabulary unique to that seller's own language, slang, and
 * script — Bangla, English, code-switched, regional terms, abbreviations,
 * anything — with zero translation and zero maintenance. It only ever
 * suggests a category once it has seen enough repetition to be
 * reasonably confident, and it never claims more certainty than that —
 * same "don't guess, ask" principle as the rest of parse.ts.
 */

type LearningTable = Record<string, Partial<Record<Category, number>>>;

const STORAGE_KEY = `${STORAGE_PREFIX}-category-learning`;
const MIN_VOTES_TO_SUGGEST = 2;

function loadTable(): LearningTable {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LearningTable) : {};
  } catch {
    return {};
  }
}

function saveTable(table: LearningTable): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(table));
  } catch {
    // Storage full or unavailable — learning is a nice-to-have, fail silently
    // rather than block saving the item itself.
  }
}

/** Splits on anything that isn't a letter or digit, Unicode-aware — this
 *  is what makes it work for Bangla script the same way it works for
 *  English, with no per-language logic needed. */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length >= 2);
}

/** Call this whenever an item is saved with a category — whether the
 *  category was guessed, manually picked, or left at the default. Every
 *  save reinforces the association a little more; wrong early guesses
 *  naturally get outweighed as real usage accumulates. */
export function recordCategoryCorrection(text: string, category: Category): void {
  if (!text.trim()) return;
  const table = loadTable();
  for (const token of tokenize(text)) {
    table[token] = { ...table[token], [category]: (table[token]?.[category] ?? 0) + 1 };
  }
  saveTable(table);
}

/** Suggests a category from words this seller has used before. Returns
 *  undefined — never a guess — if there isn't enough repeated history yet
 *  to be reasonably confident. */
export function suggestCategoryFromLearning(text: string): Category | undefined {
  if (!text.trim()) return undefined;
  const table = loadTable();
  const scores: Partial<Record<Category, number>> = {};

  for (const token of tokenize(text)) {
    const entry = table[token];
    if (!entry) continue;
    for (const [category, count] of Object.entries(entry) as [Category, number][]) {
      scores[category] = (scores[category] ?? 0) + count;
    }
  }

  let best: Category | undefined;
  let bestScore = 0;
  for (const [category, score] of Object.entries(scores) as [Category, number][]) {
    if (score > bestScore) {
      bestScore = score;
      best = category as Category;
    }
  }

  return bestScore >= MIN_VOTES_TO_SUGGEST ? best : undefined;
}
