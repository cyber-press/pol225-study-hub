# POL225 Study Hub v2.1

A static green-and-white study hub covering eight political economy chapters.

## Run locally

Run `python -m http.server 8091` and open `http://localhost:8091`.

## Test

Use Node.js 22 or newer, then run `npm ci` and `npm test`. The jsdom interaction suite covers all eight chapters, lesson modes, quizzes, flashcard state, every revision sheet and section jump, mock-exam navigation, saved answers, submission, and timeout recovery. Dependencies are only needed for development; the website has no build step.

## v2.1 changes

- Wider desktop container, consistent gutters, and aligned chapter card actions.
- Full-width revision index with three desktop columns, two tablet columns, and one mobile column.
- Revision section jumps, visible sheet position, previous/next sheet controls, and return-to-index controls.
- Mock question navigator starts collapsed, retains expansion between questions, and immediately reflects saved answers with accessible labels.
- Exam boundary buttons disable appropriately, and question jumps move focus and scroll back to the question.
- Keyboard focus styles, skip link, and 44px minimum touch targets on revised controls.

Progress, unfinished chapter quizzes and the current exam are saved in local storage on this browser and device. Older session-only exams are migrated when available.

## Deployment

The existing Render static site `pol225-study-hub` deploys automatically from this repository's `main` branch and publishes the repository root. No new infrastructure or build settings are required. Verify the Render deploy commit and live status, then check the live homepage, revision sheets and mock exam on desktop and mobile.

## v2.1.1 visual polish

Glass controls add a translucent white or emerald gradient, an inset reflection, and a soft shadow. Backdrop blur has a solid-color fallback. Page entry, flashcards, exam questions and disclosure content use short opacity/transform animations; hover motion is limited to fine-pointer devices. Reduced-motion mode disables CSS transitions/animations and uses instant lesson scrolling. Forced-colors mode retains button borders.

Flashcard controls retain keyboard focus through rerenders. Seven interaction tests now cover the existing study flows plus focus retention and reduced-motion scrolling. No production JavaScript dependency was added.

## v2.1.2 navigation

Navigation and main study actions now use lightweight inline SVG icons. Mobile navigation has 25px icons, larger 12–13px labels and 76px-tall tap areas, with extra content clearance for its taller bar. The visible mobile exam label is shortened to “Exam” on small screens; its accessible name remains “Mock exam”. The Chapters tab stays selected inside lessons and quizzes. Decorative icons are hidden from screen readers and selected tabs expose `aria-current`.

## v2.2 automatic assessment saving

Answers and question positions save immediately. The homepage lists unfinished chapter quizzes and the mock exam under **Continue where you left off**. Chapter quizzes restore the chapter, selected answers and last visible question; the mock exam restores the exact shuffled question order, answers and question index. Completed assessments remain reviewable and are not offered as unfinished.

The mock exam is a pausable practice activity: its timer runs while the exam is visible, pauses when navigating away or hiding/closing the app, and resumes from saved remaining time. Time is checkpointed every five seconds and on answers, navigation, visibility changes and page exit. A forced process/device shutdown can recover from the most recent checkpoint. Active time expiry still submits the exam automatically.

Persistence uses a versioned local-storage record and validates saved data before loading it. Existing session-only exams are migrated. Storage failures display an explicit warning. Saving is local to the same browser and device: it does not sync across devices, and clearing browser data removes saved work.

Run `npm test` for 12 tests covering the study flows, fresh-session recovery, quiz reload, visibility pause/resume, corrupt saved data, blocked storage and completed-exam recovery. Real-browser checks also verify closing and reopening tabs for both an exam and a chapter quiz.
