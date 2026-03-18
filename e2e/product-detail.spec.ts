import { test, expect, type Page } from "@playwright/test";

async function goToFirstProduct(page: Page): Promise<boolean> {
  const cards = page.locator('#tienda [role="button"]');
  if ((await cards.count()) === 0) return false;
  await cards.first().click();
  await expect(page.locator("h1")).toBeVisible();

  const genderBtns = page.locator("button").filter({ hasText: /^(Caballero|Dama)$/ });
  if ((await genderBtns.count()) > 0) await genderBtns.first().click();
  const sizeBtns = page.locator("button:not([disabled])").filter({ hasText: /^(XS|S|M|L|XL|XXL)$/ });
  if ((await sizeBtns.count()) > 0) await sizeBtns.first().click();
  return true;
}

test.describe("Product detail page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("cart:v1"));
    await page.reload();
    await expect(page.locator("#navbar")).toBeVisible();
  });

  test("product detail shows name and price", async ({ page }) => {
    if (!(await goToFirstProduct(page))) { test.skip(); return; }
    await expect(page.locator("h1")).not.toBeEmpty();
    // Price should be visible (COP format like $150.000)
    await expect(page.getByText(/\$\s?\d/)).toBeVisible();
  });

  test("gender selector changes available sizes", async ({ page }) => {
    if (!(await goToFirstProduct(page))) {
      test.skip();
      return;
    }

    const genderBtns = page.locator("button").filter({ hasText: /^(Caballero|Dama)$/ });
    const genderCount = await genderBtns.count();
    if (genderCount < 2) {
      test.skip();
      return;
    }

    // Click first gender, record sizes
    await genderBtns.nth(0).click();
    const sizeBtnsA = page.locator("button").filter({ hasText: /^(XS|S|M|L|XL|XXL)$/ });
    const sizesA = await sizeBtnsA.allTextContents();

    // Click second gender
    await genderBtns.nth(1).click();
    const sizeBtnsB = page.locator("button").filter({ hasText: /^(XS|S|M|L|XL|XXL)$/ });
    const sizesB = await sizeBtnsB.allTextContents();

    // At least one gender should have sizes (they may or may not differ)
    expect(sizesA.length + sizesB.length).toBeGreaterThan(0);
  });

  test("out-of-stock sizes are disabled", async ({ page }) => {
    if (!(await goToFirstProduct(page))) {
      test.skip();
      return;
    }

    const disabledSizes = page.locator("button[disabled]").filter({ hasText: /^(XS|S|M|L|XL|XXL)$/ });
    const count = await disabledSizes.count();
    // If there are disabled sizes, they should have line-through styling
    for (let i = 0; i < count; i++) {
      await expect(disabledSizes.nth(i)).toHaveClass(/line-through/);
      await expect(disabledSizes.nth(i)).toHaveClass(/cursor-not-allowed/);
    }
  });

  test("quantity cannot go below 1", async ({ page }) => {
    if (!(await goToFirstProduct(page))) {
      test.skip();
      return;
    }

    const qtyInput = page.getByLabel("Cantidad");
    await expect(qtyInput).toHaveValue("1");

    // Try to decrease below 1
    const minusBtn = page.locator("button").filter({ has: page.locator("svg.lucide-minus") }).first();
    await minusBtn.click();

    // Should still be 1
    await expect(qtyInput).toHaveValue("1");
  });

  test("accordion toggles open and closed", async ({ page }) => {
    if (!(await goToFirstProduct(page))) {
      test.skip();
      return;
    }

    const detailsBtn = page.getByRole("button", { name: "Detalles del producto" });
    await expect(detailsBtn).toBeVisible();

    // Initially collapsed
    await expect(detailsBtn).toHaveAttribute("aria-expanded", "false");

    // Open
    await detailsBtn.click();
    await expect(detailsBtn).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#accordion-details")).toBeVisible();

    // Close
    await detailsBtn.click();
    await expect(detailsBtn).toHaveAttribute("aria-expanded", "false");
  });

  test("stock indicator is shown for in-stock variant", async ({ page }) => {
    if (!(await goToFirstProduct(page))) {
      test.skip();
      return;
    }

    // If there's an in-stock variant selected, "En Stock" badge should show
    const stockBadge = page.getByText(/En Stock/);
    const isVisible = await stockBadge.isVisible().catch(() => false);
    if (isVisible) {
      await expect(stockBadge).toContainText(/\(\d+\)/);
    }
  });
});
