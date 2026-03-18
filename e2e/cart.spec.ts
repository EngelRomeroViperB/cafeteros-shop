import { test, expect, type Page } from "@playwright/test";

async function goToFirstProduct(page: Page): Promise<boolean> {
  const cards = page.locator('#destacados [role="button"]');
  if ((await cards.count()) === 0) return false;
  await cards.first().click();
  await expect(page.locator("h1")).toBeVisible();

  // Select first available gender
  const genderBtns = page.locator("button").filter({ hasText: /^(Caballero|Dama)$/ });
  if ((await genderBtns.count()) > 0) await genderBtns.first().click();

  // Select first in-stock size so "Agregar al Carrito" is enabled
  const sizeBtns = page.locator("button:not([disabled])").filter({ hasText: /^(XS|S|M|L|XL|XXL)$/ });
  if ((await sizeBtns.count()) > 0) await sizeBtns.first().click();

  // If add-to-cart is still disabled, product is fully out of stock
  const addBtn = page.getByRole("button", { name: "Agregar al Carrito" });
  if (await addBtn.isDisabled()) return false;
  return true;
}

test.describe("Cart flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("cart:v1"));
    await page.reload();
    await expect(page.locator("#navbar")).toBeVisible();
  });

  test("empty cart shows empty state message", async ({ page }) => {
    // Cart button now opens a drawer
    await page.getByLabel(/Carrito con \d+ productos/).click();
    await expect(page.getByRole("dialog", { name: "Carrito de compras" })).toBeVisible();
    await expect(page.getByText("Tu carrito está vacío")).toBeVisible();
    await expect(page.getByRole("button", { name: "Seguir Comprando" })).toBeVisible();
  });

  test("add product to cart from product detail page", async ({ page }) => {
    if (!(await goToFirstProduct(page))) { test.skip(); return; }

    const addBtn = page.getByRole("button", { name: "Agregar al Carrito" });
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    await expect(page.getByText("Producto añadido al carrito")).toBeVisible();
    // Cart drawer opens automatically after adding
    await expect(page.getByRole("dialog", { name: "Carrito de compras" })).toBeVisible();
    // Close drawer
    await page.getByLabel("Cerrar carrito").click();
    await expect(page.getByLabel(/Carrito con 1 productos/)).toBeVisible();
  });

  test("change quantity in product detail before adding", async ({ page }) => {
    if (!(await goToFirstProduct(page))) { test.skip(); return; }

    // Increase qty using the + button next to the quantity input
    const qtyInput = page.getByLabel("Cantidad");
    await expect(qtyInput).toHaveValue("1");
    // The + button is the one right after the qty input within the same container
    const qtyContainer = qtyInput.locator("..").locator("..");
    const plusBtn = qtyContainer.locator("button").last();
    await plusBtn.click();
    await expect(qtyInput).toHaveValue("2");

    await page.getByRole("button", { name: "Agregar al Carrito" }).click();
    await expect(page.getByText("Producto añadido al carrito")).toBeVisible();
    await expect(page.getByLabel(/Carrito con 2 productos/)).toBeVisible();
  });

  test("update quantity inside cart drawer", async ({ page }) => {
    if (!(await goToFirstProduct(page))) { test.skip(); return; }
    await page.getByRole("button", { name: "Agregar al Carrito" }).click();
    await expect(page.getByText("Producto añadido al carrito")).toBeVisible();

    // Drawer opens automatically after adding
    const drawer = page.getByRole("dialog", { name: "Carrito de compras" });
    await expect(drawer).toBeVisible();

    // Increase qty with the aria-labeled button inside drawer
    const increaseBtn = drawer.getByLabel(/Aumentar cantidad/);
    await increaseBtn.click();

    // qty text should now be 2
    const qtySpan = drawer.locator("#cart-container span.font-bold.text-xs");
    await expect(qtySpan).toContainText("2");
  });

  test("remove item from cart drawer", async ({ page }) => {
    if (!(await goToFirstProduct(page))) { test.skip(); return; }
    await page.getByRole("button", { name: "Agregar al Carrito" }).click();
    await expect(page.getByText("Producto añadido al carrito")).toBeVisible();

    const drawer = page.getByRole("dialog", { name: "Carrito de compras" });
    await expect(drawer).toBeVisible();

    await drawer.getByLabel(/Eliminar .+ del carrito/).click();
    await expect(drawer.getByText("Tu carrito está vacío")).toBeVisible();
  });

  test("decrease qty to 0 removes the item", async ({ page }) => {
    if (!(await goToFirstProduct(page))) { test.skip(); return; }
    await page.getByRole("button", { name: "Agregar al Carrito" }).click();

    const drawer = page.getByRole("dialog", { name: "Carrito de compras" });
    await expect(drawer).toBeVisible();

    await drawer.getByLabel(/Reducir cantidad/).click();
    await expect(drawer.getByText("Tu carrito está vacío")).toBeVisible();
  });

  test("cart persists across page reloads", async ({ page }) => {
    if (!(await goToFirstProduct(page))) { test.skip(); return; }
    await page.getByRole("button", { name: "Agregar al Carrito" }).click();
    await expect(page.getByText("Producto añadido al carrito")).toBeVisible();

    await page.reload();
    await expect(page.getByLabel(/Carrito con 1 productos/)).toBeVisible();
  });

  test("Seguir Comprando closes drawer and goes home", async ({ page }) => {
    await page.getByLabel(/Carrito con \d+ productos/).click();
    const drawer = page.getByRole("dialog", { name: "Carrito de compras" });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText("Tu carrito está vacío")).toBeVisible();
    await drawer.getByRole("button", { name: "Seguir Comprando" }).click();
    // Drawer closes (slides off-screen via translate-x-full)
    await expect(drawer).toHaveClass(/translate-x-full/);
    await expect(page.locator("#navbar")).toBeVisible();
  });

  test("catalog filters show all products", async ({ page }) => {
    // Navigate to collections view
    await page.getByRole("button", { name: "Colecci\u00f3n" }).first().click();
    await expect(page.getByText("Nuestra Colecci\u00f3n")).toBeVisible();
    // Filter controls should be visible
    await expect(page.getByRole("button", { name: "Todos" }).first()).toBeVisible();
    // Products should be displayed
    const productCards = page.locator('[role="button"]').filter({ has: page.locator("h3") });
    expect(await productCards.count()).toBeGreaterThan(0);
  });
});
