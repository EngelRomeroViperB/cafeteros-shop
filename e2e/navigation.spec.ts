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
    await expect(desktopNav.getByRole("button", { name: "Colección" })).toBeVisible();
    await expect(page.getByLabel(/Carrito con \d+ productos/)).toBeVisible();
  });

  test("clicking a product card navigates to product detail", async ({ page }) => {
    const productCards = page.locator('#destacados [role="button"]');
    const cardCount = await productCards.count();
    if (cardCount === 0) { test.skip(); return; }

    const firstName = (await productCards.first().locator("h3").first().innerText()).trim();
    await productCards.first().click();

    // Product detail view shows h1 with product name
    await expect(page.locator("h1")).toContainText(firstName);
  });

  test("breadcrumb Inicio returns to home from product page", async ({ page }) => {
    const productCards = page.locator('#destacados [role="button"]');
    if ((await productCards.count()) === 0) { test.skip(); return; }

    await productCards.first().click();
    await expect(page.locator("h1")).toBeVisible();

    // Breadcrumb "Inicio" lives inside #main-content, not the navbar
    await page.locator("#main-content").getByRole("button", { name: "Inicio", exact: true }).click();
    await expect(navbar(page)).toBeVisible();
  });

  test("Colección nav button navigates to collections", async ({ page }) => {
    const desktopNav = navbar(page).locator(".hidden.md\\:flex");
    await desktopNav.getByRole("button", { name: "Colección" }).click();
    await expect(page.locator("h1")).toContainText("Nuestra Colección");
  });

  test("collections breadcrumb Inicio returns to home", async ({ page }) => {
    const desktopNav = navbar(page).locator(".hidden.md\\:flex");
    await desktopNav.getByRole("button", { name: "Colección" }).click();
    await expect(page.locator("h1")).toContainText("Nuestra Colección");
    await page.locator("#main-content").getByRole("button", { name: "Inicio", exact: true }).click();
    await expect(navbar(page)).toBeVisible();
  });

  test("cart icon opens cart drawer", async ({ page }) => {
    await page.getByLabel(/Carrito con \d+ productos/).click();
    const drawer = page.getByRole("dialog", { name: "Carrito de compras" });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("heading", { name: "Tu Carrito", exact: true })).toBeVisible();
  });

  test("user icon navigates to login view", async ({ page }) => {
    // User icon could be in navbar or footer; click the one in the navbar area
    await page.locator("#navbar").getByLabel(/Iniciar sesión|Mi cuenta/).click();
    await expect(page.getByRole("heading", { name: "Inicia Sesión" })).toBeVisible();
  });

  test("browser back button works after navigation", async ({ page }) => {
    const desktopNav = navbar(page).locator(".hidden.md\\:flex");
    await desktopNav.getByRole("button", { name: "Colección" }).click();
    await expect(page.locator("h1")).toContainText("Nuestra Colección");
    await page.goBack();
    await expect(navbar(page)).toBeVisible();
  });
});
