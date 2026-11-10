import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto("http://localhost:3001");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "C:/Users/USER/.gemini/antigravity/brain/8e4ba09f-9cf5-4548-9d24-80f277227add/hero_brightened_v2.png" });

  const keralaBtn = page.locator("button", { hasText: "Kerala Backwaters" }).first();
  await keralaBtn.click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "C:/Users/USER/.gemini/antigravity/brain/8e4ba09f-9cf5-4548-9d24-80f277227add/kerala_brightened_v2.png" });

  const ladakhBtn = page.locator("button", { hasText: "Ladakh Highway" }).first();
  await ladakhBtn.click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "C:/Users/USER/.gemini/antigravity/brain/8e4ba09f-9cf5-4548-9d24-80f277227add/ladakh_brightened_v2.png" });

  const mistyBtn = page.locator("button", { hasText: "Misty Sunrise" }).first();
  await mistyBtn.click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "C:/Users/USER/.gemini/antigravity/brain/8e4ba09f-9cf5-4548-9d24-80f277227add/misty_brightened_v2.png" });

  const alpineBtn = page.locator("button", { hasText: "Alpine Lake" }).first();
  await alpineBtn.click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "C:/Users/USER/.gemini/antigravity/brain/8e4ba09f-9cf5-4548-9d24-80f277227add/alpine_brightened_v2.png" });

  await browser.close();
  console.log("Screenshots captured successfully");
}

main().catch(console.error);
