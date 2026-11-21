/* BridgeLearn — UI wiring (DOM only; all generation lives in quiz.js). */
'use strict';

const $ = (id) => document.getElementById(id);

const SAMPLES = {
  photo: `Photosynthesis is the process by which green plants make their own food. ` +
    `Chlorophyll is the green pigment in leaves that captures sunlight. ` +
    `Plants use sunlight, water and carbon dioxide to produce glucose and oxygen. ` +
    `The process takes place mainly in the leaves, inside tiny structures called chloroplasts. ` +
    `Oxygen is released into the air as a byproduct of photosynthesis. ` +
    `Without sunlight, plants cannot produce enough glucose to grow. ` +
    `Farmers use greenhouses to give plants steady sunlight and warm temperatures. ` +
    `Glucose is stored as starch, which the plant uses later for energy.`,
  net: `The internet is a global network of connected computers that share information. ` +
    `A web browser is a program that lets you view websites, such as Chrome or Firefox. ` +
    `Data travels across the internet in small pieces called packets. ` +
    `A router is a device that directs packets between networks. ` +
    `Websites are stored on computers called servers, which are online all day and night. ` +
    `An email address has two parts: a username and a domain name, joined by the @ symbol. ` +
    `Public Wi-Fi networks can be unsafe, so avoid typing passwords on them.`,
  civic: `Democracy is a system of government where citizens choose their leaders by voting. ` +
    `An election is the process in which people cast votes to select representatives. ` +
    `Every citizen aged 18 or older has the right to vote in most democracies. ` +
    `A constitution is a written document that sets out the basic laws of a country. ` +
    `Freedom of speech is the right to express opinions without fear of punishment. ` +
    `Local councils make decisions about schools, roads and public services in a community. ` +
    `Paying taxes is how citizens fund hospitals, schools and roads. ` +
    `A free press reports news independently so citizens can make informed choices.`,
};

/* ---------------- Review plan (localStorage, SM-2) ---------------- */
const PLAN_KEY = 'bridgelearn-plan-v1';
function loadPlan() {
  try { return JSON.parse(localStorage.getItem(PLAN_KEY) || '{}'); } catch { return {}; }
}
function savePlan(p) { try { localStorage.setItem(PLAN_KEY, JSON.stringify(p)); } catch {} }
function schedule(id, label, quality) {
  const plan = loadPlan();
  const prev = plan[id] || null;
  const next = sm2(prev, quality);
  const due = new Date(Date.now() + next.interval * 864e5);
  plan[id] = { label, ease: next.ease, interval: next.interval, reps: next.reps,
               due: due.toISOString().slice(0, 10) };
  savePlan(plan);
  renderPlan();
}
function renderPlan() {
  const plan = loadPlan();
  const list = $('plan-list');
  const items = Object.entries(plan).sort((a, b) => a[1].due.localeCompare(b[1].due));
  $('plan-empty').hidden = items.length > 0;
  const today = new Date().toISOString().slice(0, 10);
  list.innerHTML = items.map(([id, it]) => {
    const when = it.due <= today ? 'Due today' : `Due ${it.due}`;
    const safe = it.label.replace(/</g, '&lt;');
    return `<li><span>${safe}</span><span class="when">${when} · in ${it.interval}d · ×${it.reps}</span></li>`;
  }).join('');
}

/* ---------------- Tabs ---------------- */
document.querySelectorAll('.tabs button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    $('panel-' + btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'plan') renderPlan();
  });
});

/* ---------------- Samples ---------------- */
document.querySelectorAll('[data-sample]').forEach(btn => {
  btn.addEventListener('click', () => {
    $('lesson').value = SAMPLES[btn.dataset.sample];
    $('lesson').focus();
  });
});

/* ---------------- Generation ---------------- */
let quiz = [], cards = [], qi = 0, score = 0, answered = false;

function generate() {
  const text = $('lesson').value.trim();
  if (text.length < 40) {
    alert('Please paste a longer lesson — at least a few sentences.');
    return;
  }
  quiz = buildQuiz(text);
  cards = makeFlashcards(text);
  const r = readability(text);

  $('stats').hidden = false;
  $('st-words').textContent = r.words;
  $('st-sent').textContent = r.sentences;
  $('st-ease').textContent = r.ease;
  $('st-grade').textContent = r.grade;
  $('st-label').textContent = r.label;
  $('read-meter').hidden = false;
  $('read-bar').style.width = Math.max(2, Math.min(100, r.ease)) + '%';
  $('read-note').textContent = r.ease >= 60
    ? `Reading level: ${r.label} (grade ~${r.grade}). Easy to follow — good for a first read.`
    : `Reading level: ${r.label} (grade ~${r.grade}). This text is dense — try the flashcards first, then the quiz.`;

  startQuiz();
  startCards();
  document.querySelector('[data-tab="quiz"]').click();
}

/* ---------------- Quiz flow ---------------- */
function startQuiz() {
  qi = 0; score = 0;
  $('quiz-empty').hidden = true;
  $('quiz-box').hidden = false;
  $('quiz-done').hidden = true;
  showQuestion();
}
function showQuestion() {
  const q = quiz[qi];
  answered = false;
  $('quiz-progress').textContent = `Question ${qi + 1} of ${quiz.length} · Score ${score}/${qi}`;
  $('quiz-q').textContent = q.question;
  $('quiz-feedback').textContent = '';
  $('quiz-feedback').className = '';
  $('quiz-next').hidden = true;
  const opts = $('quiz-opts');
  const free = $('quiz-free');
  opts.innerHTML = '';
  if (q.type === 'mcq') {
    free.hidden = true;
    q.options.forEach(opt => {
      const b = document.createElement('button');
      b.textContent = opt;
      b.addEventListener('click', () => answer(opt === q.answer, q, b));
      opts.appendChild(b);
    });
  } else if (q.type === 'tf') {
    free.hidden = true;
    ['True', 'False'].forEach(opt => {
      const b = document.createElement('button');
      b.textContent = opt;
      b.addEventListener('click', () => answer(opt === q.answer, q, b));
      opts.appendChild(b);
    });
  } else { // cloze
    free.hidden = false;
    $('quiz-input').value = '';
    $('quiz-input').focus();
  }
}
function norm(s) { return String(s).trim().toLowerCase().replace(/[^a-z0-9 ]/g, ''); }
function answer(ok, q, btn) {
  if (answered) return;
  answered = true;
  if (ok) score++;
  document.querySelectorAll('#quiz-opts button').forEach(b => { b.disabled = true; });
  if (btn) {
    if (q.type === 'mcq' || q.type === 'tf') {
      document.querySelectorAll('#quiz-opts button').forEach(b => {
        if (norm(b.textContent) === norm(q.answer)) b.classList.add('correct');
      });
      if (!ok) btn.classList.add('wrong');
    }
  }
  const fb = $('quiz-feedback');
  fb.className = 'feedback ' + (ok ? 'good' : 'bad');
  fb.textContent = ok
    ? '✓ Correct!'
    : `✗ Not quite. The answer is "${q.answer}".` + (q.explanation ? ' ' + q.explanation : '');
  $('quiz-next').hidden = false;
  schedule('q:' + norm(q.source).slice(0, 60), q.source.slice(0, 80), ok ? 5 : 1);
}
$('quiz-check').addEventListener('click', () => {
  if (answered) return;
  const q = quiz[qi];
  answer(norm($('quiz-input').value) === norm(q.answer), q, null);
});
$('quiz-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('quiz-check').click();
});
$('quiz-next').addEventListener('click', () => {
  qi++;
  if (qi >= quiz.length) return finishQuiz();
  showQuestion();
});
function finishQuiz() {
  const pct = Math.round((score / quiz.length) * 100);
  $('quiz-q').textContent = '';
  $('quiz-opts').innerHTML = '';
  $('quiz-free').hidden = true;
  $('quiz-feedback').textContent = '';
  $('quiz-next').hidden = true;
  $('quiz-progress').textContent = '';
  const done = $('quiz-done');
  done.hidden = false;
  done.innerHTML = `<div class="score">${score} / ${quiz.length} — ${pct}%</div>
    <p class="hint" style="text-align:center">${pct >= 80 ? 'Excellent — this lesson is sticking.' : pct >= 50 ? 'Good start — the questions you missed are now in your review plan for tomorrow.' : 'Keep going — review the flashcards, then try the quiz again. Missed questions are scheduled for review.'}</p>
    <div class="row" style="justify-content:center"><button class="primary" id="quiz-retry">Try again</button></div>`;
  $('quiz-retry').addEventListener('click', () => {
    quiz = buildQuiz($('lesson').value.trim());
    startQuiz();
  });
}

/* ---------------- Flashcards ---------------- */
let ci = 0, flipped = false;
function startCards() {
  ci = 0; flipped = false;
  $('cards-empty').hidden = true;
  $('cards-box').hidden = cards.length === 0;
  $('cards-empty').hidden = cards.length > 0;
  if (cards.length) showCard();
}
function showCard() {
  flipped = false;
  const c = cards[ci];
  $('card-text').textContent = c.front;
  $('card-hint').textContent = 'tap to flip';
  $('card-progress').textContent = `Card ${ci + 1} of ${cards.length}`;
}
$('card-face').addEventListener('click', () => {
  const c = cards[ci];
  flipped = !flipped;
  $('card-text').textContent = flipped ? c.back : c.front;
  $('card-hint').textContent = flipped ? 'tap to see the term' : 'tap to flip';
});
function stepCard(d) {
  ci = (ci + d + cards.length) % cards.length;
  showCard();
}
$('card-prev').addEventListener('click', () => stepCard(-1));
$('card-next').addEventListener('click', () => stepCard(1));
$('card-know').addEventListener('click', () => {
  schedule('c:' + norm(cards[ci].front).slice(0, 60), cards[ci].front, 5);
  stepCard(1);
});
$('card-miss').addEventListener('click', () => {
  schedule('c:' + norm(cards[ci].front).slice(0, 60), cards[ci].front, 1);
  stepCard(1);
});

/* ---------------- Plan ---------------- */
$('plan-clear').addEventListener('click', () => {
  if (confirm('Clear your whole review plan?')) { savePlan({}); renderPlan(); }
});

/* ---------------- Boot ---------------- */
$('btn-generate').addEventListener('click', generate);
renderPlan();
