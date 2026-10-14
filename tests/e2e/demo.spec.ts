import { test, expect } from "@playwright/test";

test("first visit explains the product, the tour walks every section, and a simulated incident is handled end to end", async ({ page, context }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.request.post("/api/auth/demo");
  await page.goto("/command");
  await page.evaluate(() => localStorage.removeItem("gc.welcome.v1"));
  await page.reload();

  // Welcome guide explains what the product is, with live numbers
  await expect(page.getByRole("heading", { name: /always-on travel safety agent/ })).toBeVisible();
  await expect(page.getByText("It watches the world")).toBeVisible();

  // Guided tour: step through to the end
  await page.getByRole("button", { name: /Take the 60-second tour/ }).click();
  const tour = page.getByRole("dialog", { name: /Tour step 1 of/ });
  await expect(tour).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your situation at a glance" })).toBeVisible();
  for (let i = 0; i < 12; i++) {
    const finish = page.getByRole("button", { name: "Finish" });
    if (await finish.isVisible().catch(() => false)) { await finish.click(); break; }
    await page.getByRole("button", { name: "Next" }).click();
  }
  await expect(page.getByRole("dialog", { name: /Tour step/ })).toHaveCount(0);

  // Simulate an incident and read the plain-language story
  await page.getByRole("button", { name: "Simulate an incident" }).click();
  await page.getByRole("button", { name: /Earthquake near Dubai/ }).click();
  await expect(page.getByRole("heading", { name: "Here’s what just happened" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Detected", { exact: true })).toBeVisible();
  await expect(page.getByText("Kabir Singh").first()).toBeVisible();

  // Open the traveller's view in a new tab, reply "safe", and see it land back in the app live
  const link = page.locator("a[href*='/checkin/']").first();
  const href = await link.getAttribute("href");
  const traveller = await context.newPage();
  await traveller.goto(href!);
  await traveller.getByRole("button", { name: /I’m safe/ }).click();
  await expect(traveller.getByText(/told you’re safe/)).toBeVisible();
  await expect(page.getByText("Safe ✓").first()).toBeVisible({ timeout: 15_000 });

  // Dismissing the guide sticks
  await page.getByRole("button", { name: /Show on the map/ }).click();
  await page.getByRole("button", { name: "Got it" }).click();
  await page.reload();
  await expect(page.getByRole("heading", { name: /always-on travel safety agent/ })).toHaveCount(0);

  // Old presenter URL now lands in the product with the simulator open
  await page.goto("/demo");
  await expect(page).toHaveURL(/\/command/);
  await expect(page.getByRole("dialog", { name: "Simulate an incident" })).toBeVisible();
  expect(errors).toEqual([]);
});
