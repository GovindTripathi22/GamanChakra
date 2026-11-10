import { test, expect } from "@playwright/test";

test.describe("Mission Control Claims Center & Trip Shield Claims Autopilot", () => {
  test.beforeEach(async ({ page }) => {
    // Automatically accept window alerts / confirms (e.g. email confirmation and delete confirmations)
    page.on("dialog", (dialog) => dialog.accept());
  });

  test("Mission Control (/my-trips) displays telemetry and Claims Center empty state", async ({ page }) => {
    await page.goto("/my-trips");

    // Mission Control Header & Badges
    await expect(page.getByRole("heading", { name: /Mission Control/i })).toBeVisible();
    await expect(page.getByText("Voyage Execution Engine")).toBeVisible();
    await expect(page.getByText("Live Telemetry Active")).toBeVisible();

    // Ground-truth telemetry (no hardcoded/fake payouts)
    await expect(page.getByText("Voyage Ground-Truth Outcome Ledger")).toBeVisible();
    await expect(page.getByText("Tracked Live Steps")).toBeVisible();
    await expect(page.getByText("Prediction Accuracy")).toBeVisible();
    await expect(page.getByText("Avg. Delay Absorption")).toBeVisible();
    await expect(page.getByText("Active Claim Cases")).toBeVisible();

    // Verify there are no simulated payout buttons or fake UPI references
    await expect(page.getByText(/instant upi payout/i)).toHaveCount(0);
    await expect(page.getByText(/utr:/i)).toHaveCount(0);

    // Claims Center section & IRDAI compliance notice
    await expect(page.getByRole("heading", { name: "Travel Insurance Claims Center" })).toBeVisible();
    await expect(page.getByText("IRDAI Notice: No payout fees or disbursement QR codes").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /IRDAI Bima Bharosa/i }).first()).toBeVisible();

    // Empty state when no claims exist
    const emptyNotice = page.getByText("No Saved Claim Cases Yet");
    if (await emptyNotice.isVisible().catch(() => false)) {
      await expect(page.getByText("If you experience a transit lag, flight delay, or cancellation")).toBeVisible();
    }
  });

  test("Trip page replaces UPI payout with Voyage Shield Claims Autopilot", async ({ page }) => {
    // Generate an itinerary to land on the trip detail page
    await page.goto("/generate?origin=Delhi&destination=Jaipur&days=3&budget=Moderate&travelers=2%20People&vibe=Cultural");
    await expect(page).toHaveURL(/\/trip\//, { timeout: 45_000 });

    // Voyage Shield card is present
    await expect(page.getByText("Voyage Shield™ — Claims Autopilot")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Self-Review & Assist").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Start a claim" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Demo Simulation" })).toBeVisible();

    // Verify simulated payout card is gone
    await expect(page.getByText(/claim payout instantly via upi/i)).toHaveCount(0);
    await expect(page.getByPlaceholder(/enter upi id/i)).toHaveCount(0);
  });

  test("Interactive demo simulation flags disruptions as ineligible under IRDAI guidelines", async ({ page }) => {
    await page.goto("/generate?origin=Delhi&destination=Jaipur&days=3&budget=Moderate&travelers=2%20People&vibe=Cultural");
    await expect(page).toHaveURL(/\/trip\//, { timeout: 45_000 });

    // Click Demo Simulation
    await page.getByRole("button", { name: "Demo Simulation" }).click();

    // Verify simulation advisory banner in case dossier dialog
    const dossierModal = page.getByRole("dialog");
    await expect(dossierModal).toBeVisible();
    await expect(dossierModal.getByText(/Interactive Demo Notice:/i)).toBeVisible();
    await expect(dossierModal.getByText(/ineligible as claim evidence/i)).toBeVisible();

    // Check policy reference input has privacy constraint (max 4 chars)
    const policyInput = dossierModal.locator("#policy-last4");
    await expect(policyInput).toHaveAttribute("maxlength", "4");

    // Close dialog
    await page.keyboard.press("Escape");
  });

  test("Complete Claims Autopilot workflow: file claim, review email draft, confirm sending, and inspect in Mission Control", async ({ page }) => {
    // 1. Generate trip and open trip detail
    await page.goto("/generate?origin=Delhi&destination=Jaipur&days=3&budget=Moderate&travelers=2%20People&vibe=Cultural");
    await expect(page).toHaveURL(/\/trip\//, { timeout: 45_000 });

    // 2. Start a claim
    await page.getByRole("button", { name: "Start a claim" }).click();
    const claimDialog = page.getByRole("dialog");
    await expect(claimDialog.getByText("Voyage Claims Autopilot — Case Dossier")).toBeVisible();

    // Select flight delay and enter policy last 4 digits
    await claimDialog.locator("#incident-type").selectOption("flight_delay");
    await claimDialog.locator("#incident-provider").fill("Air India Express");
    await claimDialog.locator("#policy-last4").fill("9824");
    await claimDialog.locator("#incident-desc").fill("Flight IX-192 delayed 3.5 hours due to technical inspection.");

    // Check at least one evidence item
    await claimDialog.getByText("Carrier Written Delay Confirmation").click();

    // Save claim case as Draft
    await claimDialog.getByRole("button", { name: /Save Claim Case/i }).click();

    // Verify success banner: Claim Case Saved (Draft — Not Sent)
    await expect(claimDialog.getByText(/Claim Case Saved \(Draft — Not Sent\)/i)).toBeVisible({ timeout: 10_000 });
    await expect(claimDialog.getByRole("button", { name: "Review Insurer Email Draft" })).toBeVisible();
    await expect(claimDialog.getByRole("button", { name: "Download Summary PDF" })).toBeVisible();

    // 3. Open Email Draft Review
    await claimDialog.getByRole("button", { name: "Review Insurer Email Draft" }).click();
    const emailDialog = page.getByRole("dialog");
    await expect(emailDialog.getByText("Insurer Correspondence")).toBeVisible();
    await expect(emailDialog.getByText("Draft — Not Sent")).toBeVisible();

    // Verify draft content contains masked reference and facts
    const bodyInput = emailDialog.locator("textarea").first();
    const bodyText = await bodyInput.inputValue();
    expect(bodyText).toContain("****9824");
    expect(bodyText).toContain("Air India Express");
    expect(bodyText).toContain("bimabharosa.irdai.gov.in");

    // Verify email client helper buttons exist
    await expect(emailDialog.getByRole("button", { name: /Open in Mail App/i })).toBeVisible();
    await expect(emailDialog.getByRole("button", { name: /Open in Gmail Web/i })).toBeVisible();
    await expect(emailDialog.getByRole("button", { name: /Copy.*Text/i })).toBeVisible();

    // 4. Confirm sending the email
    await emailDialog.getByRole("button", { name: /Confirm I Sent This Email/i }).click();

    // 5. Navigate to Mission Control (/my-trips) and verify real claim appears
    await page.goto("/my-trips");
    await expect(page.getByRole("heading", { name: /Mission Control/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Travel Insurance Claims Center" })).toBeVisible();

    // The newly created claim card is displayed in Claims Center
    await expect(page.getByText("Flight Delay").first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Ref: \*\*\*\*9824/).first()).toBeVisible();
    await expect(page.getByText(/Email Sent \(Awaiting Insurer\)/i).first()).toBeVisible();

    // Open evidence checklist from Claims Center
    await page.getByRole("button", { name: /Checklist \(/i }).first().click();
    const checklistDialog = page.getByRole("dialog");
    await expect(checklistDialog.getByText("Evidence Checklist Progress")).toBeVisible();
    await checklistDialog.getByRole("button", { name: "Cancel" }).click();

    // Open status update modal and record insurer acknowledgement
    await page.getByRole("button", { name: "Status", exact: true }).first().click();
    const statusDialog = page.getByRole("dialog");
    await expect(statusDialog.getByText("Update Claim Status")).toBeVisible();
    await statusDialog.locator("select").selectOption("insurer_acknowledged");
    await statusDialog.locator("textarea").fill("Insurer acknowledged receipt with reference #DEL-2026-9824");
    await statusDialog.getByRole("button", { name: "Save Status" }).click();

    // Status badge reflects update
    await expect(page.getByText(/INSURER ACKNOWLEDGED/i).first()).toBeVisible({ timeout: 10_000 });

    // Clean up: delete the claim case
    await page.getByTitle("Delete Claim Case").first().click();
  });
});
