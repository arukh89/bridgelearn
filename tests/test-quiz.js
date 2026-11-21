// Smoke test for the BridgeLearn quiz engine. Run: node tests/test-quiz.js
const assert = require('node:assert');
const q = require('../quiz.js');

const PHOTOSYNTHESIS = `Photosynthesis is the process by which green plants make their own food. ` +
  `Chlorophyll is the green pigment in leaves that captures sunlight. ` +
  `Plants use sunlight, water and carbon dioxide to produce glucose and oxygen. ` +
  `The process takes place mainly in the leaves, inside tiny structures called chloroplasts. ` +
  `Oxygen is released into the air as a byproduct of photosynthesis. ` +
  `Without sunlight, plants cannot produce enough glucose to grow. ` +
  `Farmers use greenhouses to give plants steady sunlight and warm temperatures. ` +
  `Glucose is stored as starch, which the plant uses later for energy.`;

const INTERNET = `The internet is a global network of connected computers that share information. ` +
  `A web browser is a program that lets you view websites, such as Chrome or Firefox. ` +
  `Data travels across the internet in small pieces called packets. ` +
  `A router is a device that directs packets between networks. ` +
  `Websites are stored on computers called servers, which are online all day and night. ` +
  `An email address has two parts: a username and a domain name, joined by the @ symbol. ` +
  `Public Wi-Fi networks can be unsafe, so avoid typing passwords on them.`;

for (const [name, text] of [['photosynthesis', PHOTOSYNTHESIS], ['internet', INTERNET]]) {
  const s = q.splitSentences(text);
  assert.ok(s.length >= 5, `${name}: sentences ${s.length}`);
  const terms = q.extractKeyTerms(text);
  assert.ok(terms.length >= 5, `${name}: terms ${terms.length}`);
  assert.ok(terms.some(t => /photosynthesis|internet/i.test(t.term)), `${name}: key term found`);

  const quiz = q.buildQuiz(text);
  assert.ok(quiz.length >= 6, `${name}: quiz size ${quiz.length}`);
  const types = new Set(quiz.map(x => x.type));
  assert.ok(types.has('mcq') && types.has('cloze'), `${name}: mixed types ${[...types]}`);
  for (const item of quiz) {
    assert.ok(item.question && item.question.includes('_____') || item.type === 'tf',
      `${name}: blank present in ${item.type}`);
    assert.ok(item.answer, `${name}: answer present`);
    if (item.type === 'mcq') {
      assert.strictEqual(item.options.length, 4, `${name}: 4 MCQ options`);
      assert.ok(item.options.includes(item.answer), `${name}: answer among options`);
      assert.strictEqual(new Set(item.options).size, 4, `${name}: options unique`);
    }
  }
  // Determinism: same input -> same quiz
  assert.deepStrictEqual(q.buildQuiz(text), quiz, `${name}: deterministic`);

  const cards = q.makeFlashcards(text);
  assert.ok(cards.length >= 3, `${name}: flashcards ${cards.length}`);
  assert.ok(cards[0].front && cards[0].back, `${name}: card shape`);

  const r = q.readability(text);
  assert.ok(r.words > 20 && r.sentences >= 5, `${name}: readability counts`);
  assert.ok(r.ease > 0 && r.ease <= 100, `${name}: ease ${r.ease}`);
  console.log(`OK ${name}: ${s.length} sentences, ${terms.length} terms, quiz=${quiz.length} ` +
    `(mcq=${quiz.filter(x => x.type === 'mcq').length}, cloze=${quiz.filter(x => x.type === 'cloze').length}, ` +
    `tf=${quiz.filter(x => x.type === 'tf').length}), cards=${cards.length}, ` +
    `readability ease=${r.ease} grade=${r.grade} (${r.label})`);
}

// Readability sanity: simple text scores easier than dense text.
const easy = q.readability('The cat sat on the mat. The dog ran in the park. We like to play all day.');
const hard = q.readability('Mitochondrial oxidative phosphorylation facilitates adenosine triphosphate synthesis through chemiosmotic coupling across the inner membrane.');
assert.ok(easy.ease > hard.ease, `readability ordering: easy=${easy.ease} hard=${hard.ease}`);
console.log(`OK readability ordering: easy=${easy.ease} vs hard=${hard.ease}`);

// SM-2: correct answers stretch the interval; a fail resets it.
let st = q.sm2(null, 5);
assert.strictEqual(st.interval, 1, 'sm2 first pass = 1 day');
st = q.sm2(st, 5);
assert.strictEqual(st.interval, 6, 'sm2 second pass = 6 days');
const before = st.interval;
st = q.sm2(st, 5);
assert.ok(st.interval > before, 'sm2 third pass grows');
const failed = q.sm2(st, 1);
assert.strictEqual(failed.interval, 1, 'sm2 fail resets to 1 day');
assert.ok(failed.ease >= 1.3, 'sm2 ease floor 1.3');
console.log(`OK sm2: intervals 1 -> 6 -> ${st.interval}, fail resets to 1`);

// Edge cases: empty / tiny input must not crash.
assert.deepStrictEqual(q.buildQuiz(''), [], 'empty text -> empty quiz');
assert.deepStrictEqual(q.makeFlashcards('hello'), [], 'tiny text -> no cards');
assert.strictEqual(q.readability('').words, 0, 'empty readability');
console.log('OK edge cases: empty/tiny input handled');

console.log('\nALL QUIZ ENGINE TESTS PASSED');
