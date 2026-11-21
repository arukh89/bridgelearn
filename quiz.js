/**
 * BridgeLearn — quiz/flashcard engine (pure logic, no DOM, no network).
 * Everything runs 100% client-side so the app works offline on any device,
 * including low-bandwidth / shared-device classrooms. No API keys, no server.
 *
 * Pipeline: raw study text
 *   -> splitSentences()          (sentence segmentation)
 *   -> extractKeyTerms()         (candidate "important words": numbers,
 *                                  capitalised phrases, longest content words)
 *   -> makeClozeQuestions()      (fill-in-the-blank)
 *   -> makeMultipleChoice()      (same blank + distractors from the text)
 *   -> makeTrueFalse()           (true statement vs. term-swapped false one)
 *   -> makeFlashcards()          ("X is ..." definitions + term -> sentence)
 *   -> readability()             (Flesch Reading Ease + grade level)
 *   -> sm2()                     (spaced-repetition scheduling, SM-2 lite)
 *
 * Deterministic: same input text always yields the same questions
 * (seeded shuffle), so a teacher can reproduce a quiz exactly.
 */

'use strict';

/* ------------------------------------------------------------------ */
/* Small utilities                                                     */
/* ------------------------------------------------------------------ */

/** Deterministic PRNG (mulberry32) so quizzes are reproducible. */
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Simple string hash -> uint32 seed. */
function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Fisher-Yates with a seeded rng. */
function shuffled(arr, rand) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const STOPWORDS = new Set(
  ('a an the and or but if then else when while of at by for with about against between into through ' +
   'during before after above below to from up down in out on off over under again further once here there ' +
   'all any both each few more most other some such no nor not only own same so than too very can will just ' +
   'should now is am are was were be been being have has had having do does did doing would could shall ' +
   'may might must i you he she it we they me him her us them my your his its our their this that these those ' +
   'as because until per via etc also one two three first second third new old big small good bad many much ' +
   'well even still already yet').split(' ')
);

/* ------------------------------------------------------------------ */
/* Text processing                                                     */
/* ------------------------------------------------------------------ */

/** Split text into sentences (keeps abbreviations like "e.g." intact-ish). */
function splitSentences(text) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const parts = clean.match(/[^.!?]+[.!?]+["')\]]*\s*/g) || [clean];
  return parts.map(s => s.trim()).filter(s => s.length > 3);
}

/** Words of a sentence, stripped of punctuation. */
function wordsOf(sentence) {
  return sentence.replace(/[“”"()\[\]{}:;,.!?]/g, ' ').split(/\s+/).filter(Boolean);
}

/** Count syllables in a word (heuristic, good enough for readability). */
function countSyllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length <= 3) return 1;
  const groups = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')
                  .replace(/^y/, '')
                  .match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

/**
 * Extract key terms from the text: numbers with units, capitalised phrases
 * (proper nouns), and the longest non-stopwords. Returns [{term, count}].
 */
function extractKeyTerms(text, maxTerms = 24) {
  const sentences = splitSentences(text);
  const counts = new Map();

  const bump = (term) => {
    const t = term.trim().replace(/\s+/g, ' ');
    if (!t || t.length < 3 || t.length > 40) return;
    if (STOPWORDS.has(t.toLowerCase())) return;
    counts.set(t, (counts.get(t) || 0) + 1);
  };

  for (const s of sentences) {
    // Numbers (with optional unit): "6 hours", "1945", "3.5 kg"
    for (const m of s.matchAll(/\b\d+(?:\.\d+)?\s?(?:%|kg|km|m|cm|hours?|minutes?|seconds?|years?|days?|°C)?\b/gi)) {
      bump(m[0]);
    }
    // Capitalised phrases: "Photosynthesis", "Mount Everest", "World War II"
    for (const m of s.matchAll(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\b/g)) {
      if (!/^(The|This|That|These|Those|It|Its|In|On|At|For|With|And|But)\b/.test(m[0])) bump(m[0]);
    }
    // Longest content words
    for (const w of wordsOf(s)) {
      const lw = w.toLowerCase();
      if (lw.length >= 6 && !STOPWORDS.has(lw) && /^[a-z-]+$/.test(lw)) bump(lw);
    }
  }

  return [...counts.entries()]
    .map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count || b.term.length - a.term.length)
    .slice(0, maxTerms);
}

/* ------------------------------------------------------------------ */
/* Question generation                                                 */
/* ------------------------------------------------------------------ */

/** Pick the best "blankable" term inside a sentence, or null. */
function pickBlank(sentence, terms) {
  const lower = sentence.toLowerCase();
  // Prefer terms actually present in this sentence, longest first.
  const present = terms
    .filter(t => lower.includes(t.term.toLowerCase()))
    .sort((a, b) => b.term.length - a.term.length);
  return present.length ? present[0].term : null;
}

/** Fill-in-the-blank questions: one per suitable sentence (max `limit`). */
function makeClozeQuestions(text, limit = 8) {
  const sentences = splitSentences(text);
  const terms = extractKeyTerms(text);
  const rand = rng(hashSeed(text));
  const out = [];
  for (const s of shuffled(sentences, rand)) {
    if (out.length >= limit) break;
    const blank = pickBlank(s, terms);
    if (!blank) continue;
    // Don't blank the very first word (too easy / ambiguous) and don't
    // blank a term that appears twice in the sentence.
    const idx = s.toLowerCase().indexOf(blank.toLowerCase());
    if (idx <= 1) continue;
    const re = new RegExp(blank.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    if ((s.match(new RegExp(re.source, 'gi')) || []).length > 1) continue;
    out.push({
      type: 'cloze',
      question: s.replace(re, '_____'),
      answer: blank,
      source: s,
    });
  }
  return out;
}

/** Multiple-choice: cloze + 3 distractors drawn from other key terms. */
function makeMultipleChoice(text, limit = 8) {
  const cloze = makeClozeQuestions(text, limit);
  const terms = extractKeyTerms(text).map(t => t.term);
  const rand = rng(hashSeed(text) ^ 0x9e3779b9);
  return cloze.map(q => {
    const pool = shuffled(terms.filter(t => t.toLowerCase() !== q.answer.toLowerCase()), rand);
    const distractors = pool.slice(0, 3);
    const options = shuffled([q.answer, ...distractors], rand);
    return {
      type: 'mcq',
      question: q.question,
      answer: q.answer,
      options,
      source: q.source,
    };
  });
}

/**
 * True/False: a true sentence, and a false twin with one key term swapped
 * for another term of similar shape. `isTrue` tells which one we show.
 */
function makeTrueFalse(text, limit = 6) {
  const sentences = splitSentences(text);
  const terms = extractKeyTerms(text);
  const rand = rng(hashSeed(text) ^ 0x51ed270b);
  const out = [];
  for (const s of shuffled(sentences, rand)) {
    if (out.length >= limit) break;
    const blank = pickBlank(s, terms);
    if (!blank) continue;
    const others = terms.map(t => t.term).filter(t => t.toLowerCase() !== blank.toLowerCase());
    if (!others.length) continue;
    const swap = others[Math.floor(rand() * others.length)];
    const re = new RegExp(blank.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const isTrue = rand() < 0.5;
    out.push({
      type: 'tf',
      question: isTrue ? s : s.replace(re, swap),
      answer: isTrue ? 'True' : 'False',
      explanation: isTrue
        ? 'This matches the lesson text.'
        : `The lesson says "${blank}", not "${swap}".`,
      source: s,
    });
  }
  return out;
}

/** Build a full mixed quiz: MCQ + cloze + true/false, shuffled. */
function buildQuiz(text, counts = { mcq: 5, cloze: 3, tf: 2 }) {
  const mcq = makeMultipleChoice(text, counts.mcq);
  const cloze = makeClozeQuestions(text, counts.cloze);
  const tf = makeTrueFalse(text, counts.tf);
  const rand = rng(hashSeed(text) ^ 0xabcdef);
  // Round-robin across types so no single type hogs all sentences:
  // each sentence is used at most once, but the mix stays balanced.
  const seen = new Set();
  const all = [];
  const queues = [mcq, cloze, tf].map(list => shuffled(list, rand));
  let added = true;
  while (added) {
    added = false;
    for (const queue of queues) {
      while (queue.length) {
        const q = queue.shift();
        if (!seen.has(q.source)) {
          seen.add(q.source);
          all.push(q);
          added = true;
          break;
        }
      }
    }
  }
  return shuffled(all, rand);
}

/* ------------------------------------------------------------------ */
/* Flashcards                                                          */
/* ------------------------------------------------------------------ */

/**
 * Flashcards: "X is/are ..." definition sentences become term -> definition;
 * remaining key terms become term -> example sentence.
 */
function makeFlashcards(text, limit = 10) {
  const sentences = splitSentences(text);
  const terms = extractKeyTerms(text);
  const cards = [];
  const used = new Set();

  for (const s of sentences) {
    if (cards.length >= limit) break;
    // "Photosynthesis is the process by which ..."
    const m = s.match(/^([A-Z][A-Za-z' -]{2,40}?)\s+(is|are|refers to|means)\s+(.+)$/);
    if (m && !used.has(m[1])) {
      cards.push({ front: m[1].trim(), back: s.trim() });
      used.add(m[1]);
    }
  }
  for (const t of terms) {
    if (cards.length >= limit) break;
    if (used.has(t.term)) continue;
    const ex = sentences.find(s => s.toLowerCase().includes(t.term.toLowerCase()));
    if (ex) {
      cards.push({ front: t.term, back: ex });
      used.add(t.term);
    }
  }
  return cards;
}

/* ------------------------------------------------------------------ */
/* Readability                                                         */
/* ------------------------------------------------------------------ */

/** Flesch Reading Ease (0-100) + Flesch-Kincaid grade level. */
function readability(text) {
  const sentences = splitSentences(text);
  const words = text.split(/\s+/).filter(Boolean);
  if (!sentences.length || !words.length) {
    return { ease: 0, grade: 0, words: 0, sentences: 0, label: '—' };
  }
  const syllables = words.reduce((n, w) => n + countSyllables(w), 0);
  const wps = words.length / sentences.length;
  const spw = syllables / words.length;
  const ease = 206.835 - 1.015 * wps - 84.6 * spw;
  const grade = 0.39 * wps + 11.8 * spw - 15.59;
  const label =
    ease >= 90 ? 'Very easy' :
    ease >= 80 ? 'Easy' :
    ease >= 70 ? 'Fairly easy' :
    ease >= 60 ? 'Standard' :
    ease >= 50 ? 'Fairly difficult' :
    ease >= 30 ? 'Difficult' : 'Very difficult';
  return {
    ease: Math.round(ease * 10) / 10,
    grade: Math.round(grade * 10) / 10,
    words: words.length,
    sentences: sentences.length,
    label,
  };
}

/* ------------------------------------------------------------------ */
/* Spaced repetition (SM-2 lite)                                       */
/* ------------------------------------------------------------------ */

/**
 * Next review for a card/question after a quality rating 0-5.
 * state: { ease, interval, reps }. Returns the new state.
 * interval is in days; `dueInDays` is relative to today.
 */
function sm2(state, quality) {
  const s = { ease: 2.5, interval: 0, reps: 0, ...(state || {}) };
  if (quality < 3) {
    s.reps = 0;
    s.interval = 1;
  } else {
    if (s.reps === 0) s.interval = 1;
    else if (s.reps === 1) s.interval = 6;
    else s.interval = Math.round(s.interval * s.ease);
    s.reps += 1;
    s.ease = Math.max(1.3, s.ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  }
  s.ease = Math.round(s.ease * 100) / 100;
  return s;
}

/* ------------------------------------------------------------------ */

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    splitSentences, extractKeyTerms, makeClozeQuestions, makeMultipleChoice,
    makeTrueFalse, buildQuiz, makeFlashcards, readability, sm2,
    countSyllables, rng, hashSeed,
  };
}
