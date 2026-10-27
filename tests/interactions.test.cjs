const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { JSDOM } = require("jsdom");
const html = fs.readFileSync("index.html", "utf8");
const source = fs.readFileSync("app.js", "utf8");
function app(saved = {}) {
  const dom = new JSDOM(html, {
    url: "https://pol225.test",
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
