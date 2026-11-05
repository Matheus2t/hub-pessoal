import { test, expect } from "@playwright/test";

for (const width of [320, 390, 600, 768, 1366]) {
  test(`theme toggle placement and behavior at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/#/");

    const nav = page.getByRole("navigation", { name: "Navegação principal" });
    const theme = page.locator(".masthead app-topbar .theme-toggle");
    await expect(nav).toBeVisible();
    await expect(theme).toBeVisible();

    if (width <= 600) {
      const [navBox, themeBox] = await Promise.all([nav.boundingBox(), theme.boundingBox()]);
      expect(navBox).not.toBeNull();
      expect(themeBox).not.toBeNull();
      const navMidY = navBox!.y + navBox!.height / 2;
      const themeMidY = themeBox!.y + themeBox!.height / 2;
      expect(Math.abs(navMidY - themeMidY)).toBeLessThan(5);
      expect(themeBox!.x).toBeGreaterThanOrEqual(navBox!.x + navBox!.width);
      expect(themeBox!.x + themeBox!.width).toBeLessThanOrEqual(width);

      for (const name of ["Início", "Philadelphia 76ers", "São Paulo Futebol Clube", "FC Barcelona"]) {
        await expect(nav.getByRole("link", { name, exact: true })).toBeVisible();
      }
    }

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

    const initialTheme = await page.evaluate(() => document.documentElement.dataset.theme);
    await theme.click();
    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme))
      .toBe(initialTheme === "dark" ? "light" : "dark");
  });
}
