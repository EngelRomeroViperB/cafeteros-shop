import { test, expect } from "@playwright/test";

const navbar = (page: import("@playwright/test").Page) => page.locator("#navbar");

test.describe("Navigation flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(navbar(page)).toBeVisible();
  });

  test("home page loads with navbar and nav buttons", async ({ page }) => {
    await expect(navbar(page).getByText("CAFETEROS")).toBeVisible();
    // Desktop nav buttons (hidden md:flex)
    const desktopNav = navbar(page).locator(".hidden.md\\:flex");
    await expect(desktopNav.getByRole("button", { name: "Inicio" })).toBeVisible();
    await expect(desktopNav.getByRole("button", { name: "Conjuntos" })).toBeVisible();
    await expect(page.getByLabel(/Carrito con \d+ productos/)).toBeVisible();
  });

  test("clicking a product card navigates to product detail", async ({ page }) => {
    const productCards = page.locator('#tienda [role="button"]');
    const cardCount = await productCards.count();
    if (cardCount === 0) { test.skip(); return; }

    const firstName = (await productCards.first().locator("h3").first().innerText()).trim();
    await productCards.first().click();

    // Product detail view shows h1 with product name
    await expect(page.locator("h1")).toContainText(firstName);
  });

  test("breadcrumb Inicio returns to home from product page", async ({ page }) => {
    const productCards = page.locator('#tienda [role="button"]');
    if ((await productCards.count()) === 0) { test.skip(); return; }

    await productCards.first().click();
    await expect(page.locator("h1")).toBeVisible();

    // Breadcrumb "Inicio" lives inside #main-content, not the navbar
    await page.locator("#main-content").getByRole("button", { name: "Inicio", exact: true }).click();
    await expect(navbar(page)).toBeVisible();
  });

  test("Conjuntos nav button navigates to collections", async ({ page }) => {
    const desktopNav = navbar(page).locator(".hidden.md\\:flex");
    await desktopNav.getByRole("button", { name: "Conjuntos" }).click();
    await expect(page.locator("h1")).toContainText("Conjuntos Deportivos");
  });

  test("collections breadcrumb Inicio returns to home", async ({ page }) => {
    const desktopNav = navbar(page).locator(".hidden.md\\:flex");
    await desktopNav.getByRole("button", { name: "Conjuntos" }).click();
    await expect(page.locator("h1")).toContainText("Conjuntos");
    await page.locator("#main-content").getByRole("button", { name: "Inicio", exact: true }).click();
    await expect(navbar(page)).toBeVisible();
  });

  test("cart icon navigates to cart view", async ({ page }) => {
    await page.getByLabel(/Carrito con \d+ productos/).click();
    await expect(page.locator("h1")).toContainText("Tu Carrito");
  });

  test("user icon navigates to login view", async ({ page }) => {
    await page.getByLabel(/Iniciar sesión|Mi cuenta/).first().click();
    await expect(page.locator("h2")).toContainText(/Inicia Sesión|Tu cuenta/);
  });

  test("browser back button works after navigation", async ({ page }) => {
    const desktopNav = navbar(page).locator(".hidden.md\\:flex");
    await desktopNav.getByRole("button", { name: "Conjuntos" }).click();
    await expect(page.locator("h1")).toContainText("Conjuntos");
    await page.goBack();
    await expect(navbar(page)).toBeVisible();
  });
});
