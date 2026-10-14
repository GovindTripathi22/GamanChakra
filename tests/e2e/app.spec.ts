import { test, expect } from "@playwright/test";

test.describe("public product", () => {
  test("landing page sells the product and opens the voice co-pilot", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Discover");
    await expect(page.getByRole("heading", { name: /reads the world/ })).toBeVisible();
    await expect(page.getByText("Zero API keys")).toBeVisible();
    await page.getByRole("button", { name: "Talk to Chakra" }).click();
    const dialog = page.getByRole("dialog", { name: "Chakra voice assistant" });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Message Chakra").fill("Is Kathmandu safe right now?");
    await dialog.getByRole("button", { name: "Send" }).click();
    await expect(dialog.getByText(/risk/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test("risk radar works without an account", async ({ page }) => {
    await page.goto("/risk");
    await page.getByLabel("Destination").fill("Delhi");
    await page.getByRole("button", { name: "Check" }).click();
    await expect(page.getByText("Delhi").first()).toBeVisible();
    await page.getByRole("button", { name: "Classify headline" }).click();
    await expect(page.getByText(/confidence/)).toBeVisible();
  });

  test("passenger-rights calculator produces a claim letter", async ({ page }) => {
    await page.goto("/claims");
    await page.getByRole("button", { name: "Check my entitlement" }).click();
    await expect(page.getByText("Claim letter", { exact: true })).toBeVisible();
  });

  test("sign-up creates a workspace and lands in Mission Control", async ({ page }) => {
    await page.goto("/sign-up");
    await page.getByRole("button", { name: /Business \/ Agency/ }).click();
    await page.getByPlaceholder("Full name").fill("E2E Tester");
    await page.getByPlaceholder("Company / agency name").fill("E2E Travels");
    await page.getByPlaceholder("Work email").fill(`e2e${Date.now()}@example.com`);
    await page.getByPlaceholder(/Password/).fill("e2e-password-123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/command/);
    await expect(page.getByRole("heading", { name: /Mission Control/ })).toBeVisible();
  });
});

test.describe("B2B demo workspace", () => {
  test.beforeEach(async ({ page }) => {
    await page.request.post("/api/auth/demo");
  });

  test("mission control shows live KPIs and the agent can be run", async ({ page }) => {
    await page.goto("/command");
    await expect(page.getByText("Live events · 24h")).toBeVisible();
    await page.getByRole("button", { name: "Run agent now" }).click();
    await expect(page.getByText(/Executed \d+ actions|Scanned \d+ news items/).first()).toBeVisible({ timeout: 30_000 });
  });

  test("duty of care: send a check-in and the traveller confirms safety from the public link", async ({ page, context }) => {
    await page.goto("/duty-of-care");
    await expect(page.getByText("Traveller roster")).toBeVisible();
    const res = await page.request.get("/api/travelers");
    const { travelers } = await res.json();
    const r = await page.request.post("/api/checkins/bulk", { data: { travelerIds: [travelers[0].id] } });
    const link: string = (await r.json()).results[0].link;
    const traveller = await context.newPage();
    await traveller.goto(new URL(link).pathname);
    await traveller.getByRole("button", { name: /I’m safe/ }).click();
    await expect(traveller.getByText(/told you’re safe/)).toBeVisible();
    await page.reload();
    await expect(page.getByText("Safe", { exact: true }).first()).toBeVisible();
  });

  test("agent page shows a full reasoning trace", async ({ page }) => {
    await page.request.post("/api/agent/run", { data: {} });
    await page.goto("/agent");
    await expect(page.getByText("Reasoning trace")).toBeVisible();
    await expect(page.getByText(/ingest_news\(\)/).first()).toBeVisible();
    await expect(page.getByText(/match_exposures\(\)/).first()).toBeVisible();
    await expect(page.getByText(/execute_tasks\(\)/).first()).toBeVisible();
  });

  test("automations: create a rule from a template", async ({ page }) => {
    await page.goto("/automations");
    const name = `E2E fog rule ${Date.now()}`;
    await page.getByPlaceholder(/Rule name/).fill(name);
    await page.getByRole("button", { name: "Create rule" }).click();
    await expect(page.getByText(name, { exact: true })).toBeVisible();
    await page.getByRole("button", { name: `Delete ${name}` }).click();
    await expect(page.getByText(name, { exact: true })).toHaveCount(0);
  });

  test("keyless trip planner generates and opens an itinerary", async ({ page }) => {
    await page.goto("/generate?origin=Delhi&destination=Jaipur&days=3&budget=Moderate&travelers=2%20People&vibe=Cultural");
    await expect(page).toHaveURL(/\/trip\//, { timeout: 30_000 });
    await expect(page.getByText("Amber Fort").first()).toBeVisible();
  });
});
