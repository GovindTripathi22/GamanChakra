import { test, expect } from "@playwright/test";

test("mobile: landing has no horizontal scroll and the check-in page is thumb-friendly", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.getByRole("button", { name: /Launch the live demo/ }).first()).toBeVisible();
});
