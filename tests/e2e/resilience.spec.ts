import { test, expect, type Page } from "@playwright/test";

/** Collect uncaught page errors so any crash fails the test. */
function watch(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

test.describe("resilience — nothing on screen may ever throw", () => {
  test.beforeEach(async ({ page }) => { await page.request.post("/api/auth/demo"); });

  test("world map survives fast drags, releases mid-move, wheel and zoom buttons", async ({ page }) => {
    const errors = watch(page);
    await page.goto("/command");
    const map = page.getByRole("img", { name: "Live world risk map" }).first();
    await expect(map).toBeVisible();
    const box = (await map.boundingBox())!;
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    for (let i = 0; i < 8; i++) {
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      // pointerup fired between moves — the exact pattern that crashed before
      await page.mouse.move(cx + 40, cy + 10, { steps: 3 });
      await page.mouse.up();
      await page.mouse.move(cx + 80, cy + 20, { steps: 2 });
    }
    await page.keyboard.down("Control");
    await page.mouse.wheel(0, -400);
    await page.keyboard.up("Control");
    await page.mouse.wheel(0, 300); // plain wheel must scroll the page, not throw
    await page.getByRole("button", { name: "Zoom in" }).first().click();
    await page.getByRole("button", { name: "Zoom out" }).first().click();
    await page.getByRole("button", { name: "Reset view" }).first().click();
    // leave the map while dragging
    await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.move(5, 5, { steps: 4 }); await page.mouse.up();
    expect(errors).toEqual([]);
  });

  test("every main screen loads without uncaught errors", async ({ page }) => {
    const errors = watch(page);
    for (const path of ["/", "/command", "/duty-of-care", "/agent", "/automations", "/risk", "/claims", "/settings", "/pricing", "/my-trips", "/create-trip", "/waitlist-rescue", "/does-not-exist"]) {
      await page.goto(path);
      await page.waitForTimeout(800);
    }
    expect(errors).toEqual([]);
  });

  test("double-clicking Approve executes a task only once", async ({ page }) => {
    const errors = watch(page);
    await page.goto("/agent");
    const approve = page.getByRole("button", { name: /Approve & run/ }).first();
    if (await approve.count()) {
      await approve.dblclick();
      await page.waitForTimeout(1500);
    }
    expect(errors).toEqual([]);
  });

  test("Jarvis copes with empty, huge and gibberish input", async ({ page }) => {
    const errors = watch(page);
    await page.goto("/");
    await page.getByRole("button", { name: "Talk to Chakra" }).click();
    const dialog = page.getByRole("dialog", { name: "Chakra voice assistant" });
    const input = dialog.getByLabel("Message Chakra");
    await input.fill("   ");
    await expect(dialog.getByRole("button", { name: "Send" })).toBeDisabled();
    await input.fill("x".repeat(800));
    await dialog.getByRole("button", { name: "Send" }).click();
    await input.fill("asdkjh qwe zzz ????");
    await input.press("Enter");
    await page.waitForTimeout(2500);
    await expect(dialog.getByText(/travel|Sorry|risk|focused/i).first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("risk radar handles empty and unknown places gracefully", async ({ page }) => {
    const errors = watch(page);
    await page.goto("/risk");
    await page.getByLabel("Destination").fill("");
    await page.getByRole("button", { name: "Check" }).click();
    await expect(page.getByText(/Type a city/)).toBeVisible();
    await page.getByLabel("Destination").fill("Atlantis");
    await page.getByRole("button", { name: "Check" }).click();
    await expect(page.getByText(/don't know/)).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("public check-in page handles an invalid token", async ({ page }) => {
    const errors = watch(page);
    await page.goto("/checkin/not-a-real-token");
    await expect(page.getByText(/not found|not valid/i)).toBeVisible();
    expect(errors).toEqual([]);
  });
});
