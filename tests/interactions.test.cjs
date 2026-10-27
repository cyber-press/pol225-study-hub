const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { JSDOM } = require("jsdom");
const html = fs.readFileSync("index.html", "utf8");
const source = fs.readFileSync("app.js", "utf8");
function app(saved = {}) {
  const dom = new JSDOM(html, {
    url: "https://pol225.test/" + (saved.hash || ""),
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  const w = dom.window;
  w.scrollTo = () => {};
  w.HTMLElement.prototype.scrollIntoView = () => {};
  w.alert = () => {};
  w.confirm = () => true;
  if (saved.progress) w.localStorage.setItem("pol225-v16", saved.progress);
  if (saved.exam) w.sessionStorage.setItem("pol225-exam", saved.exam);
  if (saved.assessments)
    w.localStorage.setItem("pol225-assessments-v3", saved.assessments);
  if (saved.now) w.Date.now = () => saved.now;
  w.eval(source);
  const click = (selector) => {
    const e = w.document.querySelector(selector);
    assert.ok(e, selector);
    e.click();
  };
  const action = (name) => click('[data-act="' + name + '"]');
  const change = (selector, value) => {
    const e = w.document.querySelector(selector);
    e.value = value;
    e.dispatchEvent(new w.Event("change"));
  };
  return { w, doc: w.document, action, click, change, close: () => w.close() };
}
test("all chapters, lesson modes, section jumps, completion and quiz grading", () => {
  const a = app();
  try {
    a.click('[data-go="chapters"]');
    assert.equal(a.doc.querySelectorAll("article.card").length, 8);
    for (let i = 0; i < 8; i++) {
      a.click('[data-go="chapters"]');
      a.action("lesson:" + i);
      assert.equal(a.doc.querySelectorAll(".lesson-section").length, 7);
      a.action("lessonjump:3");
      a.action("lessonmode:quick");
      assert.equal(a.doc.querySelectorAll(".lesson-section").length, 4);
      a.action("lessonmode:deep");
      a.action("complete");
      a.action("quiz");
      for (let q = 0; q < 5; q++)
        a.click('input[name="quiz' + q + '"][value="0"]');
      a.action("grade");
      assert.equal(a.doc.querySelectorAll(".feedback").length, 5);
      a.action("retake");
      assert.equal(a.doc.querySelectorAll(".feedback").length, 0);
    }
    assert.equal(
      JSON.parse(a.w.localStorage.getItem("pol225-v16")).done.length,
      8,
    );
  } finally {
    a.close();
  }
});
test("flashcards flip, deck selection, wrap, learned state and persistence", () => {
  const a = app();
  try {
    a.click('[data-go="flashcards"]');
    a.action("flip");
    assert.ok(a.doc.querySelector(".revealed"));
    a.change("#cardSelect", "7");
    assert.match(a.doc.querySelector(".flash-metrics").textContent, /of 5/);
    a.action("cardprev");
    assert.match(
      a.doc.querySelector(".flash-metrics").textContent,
      /Question 5/,
    );
    a.action("known");
    a.action("cardreset");
    assert.match(
      a.doc.querySelector(".flash-metrics").textContent,
      /1 learned/,
    );
    const b = app({ progress: a.w.localStorage.getItem("pol225-v16") });
    try {
      b.click('[data-go="flashcards"]');
      assert.match(
        b.doc.querySelector(".flash-metrics").textContent,
        /1 learned/,
      );
    } finally {
      b.close();
    }
  } finally {
    a.close();
  }
});
test("all revision sheets, section focus, previous/next boundaries, selector and return", () => {
  const a = app();
  try {
    a.click('[data-go="revision"]');
    assert.equal(a.doc.querySelectorAll(".revision-grid .card").length, 8);
    assert.equal(a.doc.querySelector("#revisionSelect").value, "-1");
    for (let i = 0; i < 8; i++) {
      a.action("rev:" + i);
      assert.equal(a.doc.querySelector("#revisionSelect").value, String(i));
      assert.equal(a.doc.querySelectorAll(".revision-jumps button").length, 6);
      for (let j = 0; j < 6; j++) {
        a.action("revjump:" + j);
        assert.equal(a.doc.activeElement.id, "revision-section-" + j);
      }
      assert.equal(
        [...a.doc.querySelectorAll(".revision-actions button")].some((b) =>
          b.textContent.includes("Previous sheet"),
        ),
        i > 0,
      );
      assert.equal(
        !!a.doc.querySelector('[data-act="rev:' + (i + 1) + '"]'),
        i < 7,
      );
    }
    a.change("#revisionSelect", "2");
    assert.match(
      a.doc.querySelector(".revision-toolbar").textContent,
      /Sheet 3 of 8/,
    );
    a.action("rev:-1");
    assert.equal(a.doc.querySelector("#revisionSelect").value, "-1");
  } finally {
    a.close();
  }
});
test("mock navigator collapse, answer state, boundaries, jump, resume and submit", () => {
  const a = app();
  try {
    a.click('[data-go="mock"]');
    a.action("examstart");
    assert.equal(a.doc.querySelectorAll(".exam-number").length, 100);
    assert.equal(a.doc.querySelector("#examNavigator").open, false);
    assert.equal(a.doc.querySelector('[data-act="examprev"]').disabled, true);
    const details = a.doc.querySelector("#examNavigator");
    details.open = true;
    details.dispatchEvent(new a.w.Event("toggle"));
    a.click('input[name="exam0"][value="0"]');
    assert.equal(a.doc.querySelector("#examAnswered").textContent, "1");
    assert.ok(a.doc.querySelector(".exam-number.answered"));
    a.action("examnext");
    assert.equal(a.doc.querySelector("#examNavigator").open, true);
    assert.equal(a.doc.activeElement.className, "panel exam-question");
    a.action("examgoto:99");
    assert.equal(a.doc.querySelector('[data-act="examnext"]').disabled, true);
    a.action("examgoto:0");
    assert.equal(a.doc.querySelector('input[value="0"]').checked, true);
    const b = app({ exam: a.w.sessionStorage.getItem("pol225-exam") });
    try {
      b.click('[data-go="mock"]');
      assert.equal(b.doc.querySelector("#examAnswered").textContent, "1");
    } finally {
      b.close();
    }
    a.action("examsubmit");
    assert.match(a.doc.querySelector("h1").textContent, /Mock exam score/);
    assert.equal(
      JSON.parse(a.w.localStorage.getItem("pol225-v16")).attempts.length,
      1,
    );
  } finally {
    a.close();
  }
});
test("expired exam auto-submits once and results survive reload", () => {
  const a = app();
  let saved;
  try {
    a.click('[data-go="mock"]');
    a.action("examstart");
    saved = JSON.parse(a.w.sessionStorage.getItem("pol225-exam"));
  } finally {
    a.close();
  }
  saved.ends = Date.now() - 1000;
  const b = app({ exam: JSON.stringify(saved) });
  try {
    b.click('[data-go="mock"]');
    assert.match(b.doc.querySelector("h1").textContent, /Mock exam score/);
    assert.equal(
      JSON.parse(b.w.localStorage.getItem("pol225-v16")).attempts.length,
      1,
    );
  } finally {
    b.close();
  }
});

test("flashcard rerenders preserve keyboard focus and do not replay page entry", () => {
  const a = app();
  try {
    a.click('[data-go="flashcards"]');
    const card = a.doc.querySelector('[data-act="flip"]');
    card.focus();
    a.action("flip");
    assert.equal(a.doc.activeElement.dataset.act, "flip");
    assert.equal(
      a.doc.activeElement.getAttribute("aria-label"),
      "Show question",
    );
    assert.equal(
      a.doc.querySelector("#app").classList.contains("view-enter"),
      false,
    );
    const next = a.doc.querySelector('[data-act="cardnext"]');
    next.focus();
    a.action("cardnext");
    assert.equal(a.doc.activeElement.dataset.act, "cardnext");
  } finally {
    a.close();
  }
});

test("lesson scroll behavior respects reduced motion and its unsupported-browser fallback", () => {
  const a = app();
  try {
    const observed = [];
    a.w.HTMLElement.prototype.scrollIntoView = (options) =>
      observed.push(options.behavior);
    a.click('[data-go="chapters"]');
    a.action("lesson:0");
    a.w.matchMedia = () => ({ matches: true });
    a.action("lessonjump:1");
    a.action("lessonfinish");
    assert.deepEqual(observed.slice(-2), ["instant", "instant"]);
    a.w.matchMedia = () => ({ matches: false });
    a.action("lessonjump:2");
    assert.equal(observed.at(-1), "smooth");
    a.w.matchMedia = undefined;
    a.action("lessonjump:3");
    assert.equal(observed.at(-1), "smooth");
  } finally {
    a.close();
  }
});

test("mock exam resumes in a fresh browser session with question order, answers, position and paused time", () => {
  const a = app();
  let stored;
  try {
    a.click('[data-go="mock"]');
    a.action("examstart");
    a.action("examgoto:41");
    a.click('input[name="exam41"][value="2"]');
    a.action("examgoto:72");
    a.action("exampause");
    stored = a.w.localStorage.getItem("pol225-assessments-v3");
    assert.match(
      a.doc.querySelector(".resume-panel").textContent,
      /Question 73 of 100/,
    );
  } finally {
    a.close();
  }
  const b = app({ assessments: stored, now: Date.now() + 86400000 });
  try {
    assert.match(
      b.doc.querySelector(".resume-panel").textContent,
      /Continue where you left off/,
    );
    b.action("resume:exam");
    assert.match(
      b.doc.querySelector(".exam-status").textContent,
      /Question 73 of 100/,
    );
    assert.equal(b.doc.querySelector("#examAnswered").textContent, "1");
    assert.match(
      b.doc.querySelector("#countdown").textContent,
      /^(100:00|99:59)$/,
    );
    const restored = JSON.parse(
      b.w.localStorage.getItem("pol225-assessments-v3"),
    ).exam;
    assert.deepEqual(restored.questions, JSON.parse(stored).exam.questions);
    b.action("examgoto:41");
    assert.equal(b.doc.querySelector('input[value="2"]').checked, true);
  } finally {
    b.close();
  }
});

test("chapter quiz restores the chapter, answers and last question after close and reopen", () => {
  const a = app();
  let stored;
  try {
    a.click('[data-go="chapters"]');
    a.action("lesson:5");
    a.action("quiz");
    a.click('input[name="quiz3"][value="1"]');
    stored = a.w.localStorage.getItem("pol225-assessments-v3");
  } finally {
    a.close();
  }
  const b = app({ assessments: stored });
  try {
    assert.match(
      b.doc.querySelector(".resume-panel").textContent,
      /Chapter 6 practice quiz/,
    );
    assert.match(
      b.doc.querySelector(".resume-panel").textContent,
      /Question 4 of 5/,
    );
    b.action("resume:quiz:5");
    assert.match(b.doc.querySelector("h1").textContent, /Colonialism/);
    assert.equal(
      b.doc.querySelector('input[name="quiz3"][value="1"]').checked,
      true,
    );
    for (let i = 0; i < 5; i++)
      b.click('input[name="quiz' + i + '"][value="0"]');
    b.action("grade");
    assert.equal(
      JSON.parse(b.w.localStorage.getItem("pol225-assessments-v3")).quizzes["5"]
        .submitted,
      true,
    );
    b.action("retake");
    assert.equal(b.doc.querySelectorAll("input:checked").length, 0);
  } finally {
    b.close();
  }
  const c = app({ assessments: stored, hash: "#quiz" });
  try {
    assert.match(c.doc.querySelector("h1").textContent, /Colonialism/);
    assert.equal(
      c.doc.querySelector('input[name="quiz3"][value="1"]').checked,
      true,
    );
  } finally {
    c.close();
  }
});

test("exam timer pauses on visibility change and resumes without consuming time away", () => {
  const a = app();
  try {
    let now = Date.now();
    a.w.Date.now = () => now;
    a.click('[data-go="mock"]');
    a.action("examstart");
    now += 20000;
    Object.defineProperty(a.doc, "hidden", { configurable: true, value: true });
    a.doc.dispatchEvent(new a.w.Event("visibilitychange"));
    const paused = JSON.parse(a.w.localStorage.getItem("pol225-assessments-v3"))
      .exam.remainingMs;
    assert.equal(paused, 100 * 60000 - 20000);
    now += 7200000;
    Object.defineProperty(a.doc, "hidden", {
      configurable: true,
      value: false,
    });
    a.doc.dispatchEvent(new a.w.Event("visibilitychange"));
    assert.equal(
      JSON.parse(a.w.localStorage.getItem("pol225-assessments-v3")).exam
        .remainingMs,
      paused,
    );
    assert.equal(a.doc.querySelector("#countdown").textContent, "99:40");
  } finally {
    a.close();
  }
});

test("malformed saved assessments are ignored and blocked storage produces an honest warning", () => {
  const a = app({
    assessments: '{"version":3,"exam":{"questions":[]},"quizzes":{"99":{}}}',
  });
  try {
    assert.ok(a.doc.querySelector(".hero"));
    assert.equal(a.doc.querySelector(".resume-panel"), null);
    a.w.Storage.prototype.setItem = () => {
      throw new Error("storage blocked");
    };
    a.click('[data-go="mock"]');
    a.action("examstart");
    assert.match(
      a.doc.querySelector("#assessmentSaveStatus").textContent,
      /Auto-save unavailable/,
    );
  } finally {
    a.close();
  }
});

test("active exam expiry is recorded once and completed work is not offered as unfinished", () => {
  const a = app();
  let state, progressSaved;
  try {
    let now = Date.now();
    a.w.Date.now = () => now;
    a.click('[data-go="mock"]');
    a.action("examstart");
    now += 100 * 60000 + 1;
    a.w.updateTimer();
    assert.match(a.doc.querySelector("h1").textContent, /Mock exam score/);
    state = a.w.localStorage.getItem("pol225-assessments-v3");
    progressSaved = a.w.localStorage.getItem("pol225-v16");
  } finally {
    a.close();
  }
  const b = app({ assessments: state, progress: progressSaved });
  try {
    assert.equal(b.doc.querySelector(".resume-panel"), null);
    b.click('[data-go="mock"]');
    assert.match(b.doc.querySelector("h1").textContent, /Mock exam score/);
    assert.equal(
      JSON.parse(b.w.localStorage.getItem("pol225-v16")).attempts.length,
      1,
    );
  } finally {
    b.close();
  }
});
