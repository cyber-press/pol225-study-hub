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

Progress remains in local storage; the current exam remains in session storage.

## Deployment

The existing Render static site `pol225-study-hub` deploys automatically from this repository's `main` branch and publishes the repository root. No new infrastructure or build settings are required. Verify the Render deploy commit and live status, then check the live homepage, revision sheets and mock exam on desktop and mobile.

## v2.1.1 visual polish

Glass controls add a translucent white or emerald gradient, an inset reflection, and a soft shadow. Backdrop blur has a solid-color fallback. Page entry, flashcards, exam questions and disclosure content use short opacity/transform animations; hover motion is limited to fine-pointer devices. Reduced-motion mode disables CSS transitions/animations and uses instant lesson scrolling. Forced-colors mode retains button borders.

Flashcard controls retain keyboard focus through rerenders. Seven interaction tests now cover the existing study flows plus focus retention and reduced-motion scrolling. No production JavaScript dependency was added.
