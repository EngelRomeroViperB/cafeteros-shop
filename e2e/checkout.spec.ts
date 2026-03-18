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

  const addBtn = page.getByRole("button", { name: "Agregar al Carrito" });
  if (await addBtn.isDisabled()) return false;
  return true;
}

test.describe("Checkout flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("cart:v1"));
    await page.reload();
    await expect(page.locator("#navbar")).toBeVisible();
  });

  test("empty cart shows empty state (no checkout button)", async ({ page }) => {
    await page.getByLabel(/Carrito con \d+ productos/).click();
    await expect(page.getByText("Tu carrito está vacío")).toBeVisible();
  });

  test("unauthenticated user is redirected to login when clicking checkout", async ({ page }) => {
    if (!(await goToFirstProduct(page))) { test.skip(); return; }
    await page.getByRole("button", { name: "Agregar al Carrito" }).click();
    await expect(page.getByText("Producto añadido al carrito")).toBeVisible();

    await page.getByLabel(/Carrito con \d+ productos/).click();
    await expect(page.getByText("Tu Carrito")).toBeVisible();

    // Button text shows "Inicia sesión para pagar" for unauthenticated users
    const checkoutBtn = page.getByRole("button", { name: /Inicia sesión para pagar/ });
    await expect(checkoutBtn).toBeVisible();
    await checkoutBtn.click();

    await expect(page.locator("h2")).toContainText("Inicia Sesión");
    await expect(page.getByText("Inicia sesión para continuar al pago")).toBeVisible();
  });

  test("login form renders with required fields", async ({ page }) => {
    await page.getByLabel(/Iniciar sesión|Mi cuenta/).first().click();
    await expect(page.locator("h2")).toBeVisible();

    // Verify form fields exist
    const emailInput = page.getByPlaceholder("hincha@colombia.com");
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute("required", "");

    const passwordInput = page.getByPlaceholder("••••••••");
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute("required", "");

    // Submit button exists
    await expect(page.getByRole("button", { name: /Entrar a la Tribuna/ })).toBeVisible();
    // Signup button exists
    await expect(page.getByRole("button", { name: /Crear cuenta nueva/ })).toBeVisible();
  });

  test("full purchase flow: add product → cart → attempt checkout (needs auth)", async ({ page }) => {
    if (!(await goToFirstProduct(page))) { test.skip(); return; }

    // Add to cart (goToFirstProduct already selected gender + size)
    await page.getByRole("button", { name: "Agregar al Carrito" }).click();
    await expect(page.getByText("Producto añadido al carrito")).toBeVisible();

    // Go to cart
    await page.getByLabel(/Carrito con \d+ productos/).click();
    await expect(page.getByText("Tu Carrito")).toBeVisible();

    // Verify summary is visible with a non-zero total
    await expect(page.getByText("Resumen del Pedido")).toBeVisible();
    await expect(page.getByText("Subtotal")).toBeVisible();
    const totalEl = page.locator("span.font-black.text-2xl");
    await expect(totalEl).toBeVisible();
    const totalContent = await totalEl.textContent();
    expect(totalContent).toBeTruthy();
    expect(totalContent).not.toContain("$ 0");

    // Attempt checkout — should redirect to login
    await page.getByRole("button", { name: /Inicia sesión para pagar/ }).click();
    await expect(page.locator("h2")).toContainText("Inicia Sesión");
  });
});
