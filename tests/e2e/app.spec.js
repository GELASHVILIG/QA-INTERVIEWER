/* ============================================================
   QA Quest — Playwright E2E suite
   Run:   npx playwright test
   The config auto-starts `node server.js` on port 3100 with an
   isolated data file (tests/e2e/.tmp), so real data is untouched.
   ============================================================ */
const { test, expect } = require("@playwright/test");

const uniq = p => p + Math.random().toString(36).slice(2, 8);

async function playAsGuest(page) {
  await page.goto("/");
  await page.click("#btn-guest");
  await expect(page.locator("#screen-start")).toBeVisible();
}

async function register(page, name, password = "secret123") {
  await page.goto("/");
  await page.click('#auth-tabs [data-auth="register"]');
  await page.fill("#auth-user", name);
  await page.fill("#auth-pass", password);
  await page.click("#btn-auth");
  await expect(page.locator("#screen-start")).toBeVisible();
}

/* Answer every question (always option A) until the result screen shows.
   Handles both practice (explicit Next button) and interview (auto-advance). */
async function finishQuiz(page, { maxQuestions = 120 } = {}) {
  for (let i = 0; i < maxQuestions; i++) {
    if (await page.locator("#screen-result").isVisible()) return;
    const qLabel = await page.locator("#qnum").textContent();
    await page.locator("#opts .opt:not(.locked)").first()
      .click({ timeout: 3000 }).catch(() => {});
    const next = page.locator("#btn-next");
    if (await next.isVisible()) {
      await next.click();
    } else {
      // interview mode auto-advances after a short pause
      await page.waitForFunction(
        prev =>
          document.getElementById("screen-result").offsetParent !== null ||
          document.getElementById("qnum").textContent !== prev,
        qLabel,
        { timeout: 10_000 }
      ).catch(() => {});
    }
  }
  await expect(page.locator("#screen-result")).toBeVisible();
}

/* ============================================================ Auth */
test.describe("Authentication", () => {
  test("auth screen is shown first when the backend is up", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#screen-auth")).toBeVisible();
    await expect(page.locator("#screen-start")).toBeHidden();
  });

  test("guest mode skips login and reaches the start screen", async ({ page }) => {
    await playAsGuest(page);
  });

  test("register creates an account and shows the userbar", async ({ page }) => {
    const name = uniq("E2e_");
    await register(page, name);
    await expect(page.locator("#userbar")).toContainText(name);
  });

  test("register rejects a too-short password with an inline error", async ({ page }) => {
    await page.goto("/");
    await page.click('#auth-tabs [data-auth="register"]');
    await page.fill("#auth-user", uniq("Short_"));
    await page.fill("#auth-pass", "123");
    await page.click("#btn-auth");
    await expect(page.locator("#auth-err")).not.toBeEmpty();
    await expect(page.locator("#screen-auth")).toBeVisible();
  });

  test("login with wrong password shows an error", async ({ page }) => {
    const name = uniq("WrongPw_");
    await register(page, name);
    // userbar re-renders while history/leaderboard load — force the click
    await page.locator("#btn-logout").click({ force: true });
    await expect(page.locator("#screen-auth")).toBeVisible();
    await page.fill("#auth-user", name);
    await page.fill("#auth-pass", "not-the-password");
    await page.click("#btn-auth");
    await expect(page.locator("#auth-err")).not.toBeEmpty();
  });

  test("logout returns to the auth screen", async ({ page }) => {
    await register(page, uniq("Bye_"));
    await page.locator("#btn-logout").click({ force: true });
    await expect(page.locator("#screen-auth")).toBeVisible();
  });
});

/* ============================================================ Start screen */
test.describe("Start screen", () => {
  test("track buttons show non-zero question counts", async ({ page }) => {
    await playAsGuest(page);
    for (const id of ["#t-manual", "#t-auto", "#t-all"]) {
      await expect(page.locator(id)).not.toHaveText(/^0 /);
    }
  });

  test("mode, track and level selections toggle the active state", async ({ page }) => {
    await playAsGuest(page);
    await page.click('#modes [data-mode="interview"]');
    await expect(page.locator('#modes [data-mode="interview"]')).toHaveClass(/active/);
    await page.click('#tracks [data-track="auto"]');
    await expect(page.locator('#tracks [data-track="auto"]')).toHaveClass(/active/);
    await page.click('#levels [data-level="junior"]');
    await expect(page.locator('#levels [data-level="junior"]')).toHaveClass(/active/);
  });
});

/* ============================================================ Practice quiz */
test.describe("Practice mode", () => {
  test("starting a quiz shows question 1 with options", async ({ page }) => {
    await playAsGuest(page);
    await page.click("#btn-start");
    await expect(page.locator("#screen-quiz")).toBeVisible();
    await expect(page.locator("#qnum")).toContainText("Question 1 of");
    expect(await page.locator("#opts .opt").count()).toBeGreaterThanOrEqual(2);
  });

  test("answering reveals feedback and an explanation", async ({ page }) => {
    await playAsGuest(page);
    await page.click("#btn-start");
    await page.locator("#opts .opt").first().click();
    await expect(page.locator("#explain")).toBeVisible();
    await expect(page.locator("#btn-next")).toBeVisible();
  });

  test("Next advances to question 2", async ({ page }) => {
    await playAsGuest(page);
    await page.click("#btn-start");
    await page.locator("#opts .opt").first().click();
    await page.click("#btn-next");
    await expect(page.locator("#qnum")).toContainText("Question 2 of");
  });

  test("Main Menu returns to the start screen", async ({ page }) => {
    await playAsGuest(page);
    await page.click("#btn-start");
    await page.click("#btn-menu");
    await expect(page.locator("#screen-start")).toBeVisible();
  });

  test("deck is reshuffled between runs", async ({ page }) => {
    await playAsGuest(page);
    const first = [];
    for (let run = 0; run < 3; run++) {
      await page.click("#btn-start");
      await expect(page.locator("#qtext")).not.toBeEmpty();
      first.push(await page.locator("#qtext").textContent());
      await page.click("#btn-menu");
      await expect(page.locator("#screen-start")).toBeVisible();
    }
    // with 100+ questions, three identical openers means no shuffle
    expect(new Set(first).size).toBeGreaterThan(1);
  });

  test("finishing a junior manual quiz reaches the results screen", async ({ page }) => {
    test.slow();
    await playAsGuest(page);
    await page.click('#levels [data-level="junior"]');
    await page.click("#btn-start");
    await finishQuiz(page);
    await expect(page.locator("#res-pct")).toContainText("%");
    await expect(page.locator("#res-total")).not.toHaveText("0");
  });
});

/* ============================================================ Interview mode */
test.describe("Interview mode", () => {
  test("shows a countdown timer and hides practice feedback", async ({ page }) => {
    await playAsGuest(page);
    await page.click('#modes [data-mode="interview"]');
    await page.click("#btn-start");
    await expect(page.locator("#qtimer")).toBeVisible();
    await expect(page.locator("#interviewer")).toBeVisible();
    await page.locator("#opts .opt").first().click();
    // no feedback mid-interview: the explanation panel never gets the "show" class
    await expect(page.locator("#explain")).not.toHaveClass(/show/);
    await expect(page.locator("#explain")).toBeEmpty();
  });

  test("junior interview ends with a hiring verdict", async ({ page }) => {
    test.slow();
    await playAsGuest(page);
    await page.click('#modes [data-mode="interview"]');
    await page.click('#levels [data-level="junior"]');
    await page.click("#btn-start");
    await finishQuiz(page);
    // hiring decision (HIRED or NOT HIRED) is rendered in the grade line
    await expect(page.locator("#res-grade")).toContainText(/HIRED · Junior/);
    await expect(page.locator("#res-h1")).toContainText(/Hiring/);
  });
});

/* ============================================================ Persistence */
test.describe("History & leaderboard", () => {
  test("a finished quiz is saved to history and the leaderboard", async ({ page }) => {
    test.slow();
    const name = uniq("Hist_");
    await register(page, name);
    await page.click('#levels [data-level="junior"]');
    await page.click("#btn-start");
    await finishQuiz(page);
    await page.click("#btn-menu2");
    await expect(page.locator("#start-history")).toBeVisible();
    await expect(page.locator("#hist-list")).not.toBeEmpty();
    await expect(page.locator("#lb-list")).toContainText(name);
  });

  test("history survives a page reload for a logged-in user", async ({ page }) => {
    test.slow();
    const name = uniq("Sync_");
    await register(page, name);
    await page.click('#levels [data-level="junior"]');
    await page.click("#btn-start");
    await finishQuiz(page);
    await page.reload();
    await expect(page.locator("#screen-start")).toBeVisible();
    await expect(page.locator("#hist-list")).not.toBeEmpty();
  });
});
