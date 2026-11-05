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
      const logo = page.locator(".masthead .brand-logo");
      const [logoBox, navBox, themeBox] = await Promise.all([
        logo.boundingBox(),
        nav.boundingBox(),
        theme.boundingBox(),
      ]);
      expect(logoBox).not.toBeNull();
      expect(navBox).not.toBeNull();
      expect(themeBox).not.toBeNull();

      const logoMidY = logoBox!.y + logoBox!.height / 2;
      const navMidY = navBox!.y + navBox!.height / 2;
      const themeMidY = themeBox!.y + themeBox!.height / 2;
      expect(Math.abs(logoMidY - navMidY)).toBeLessThan(5);
      expect(Math.abs(navMidY - themeMidY)).toBeLessThan(5);
      expect(logoBox!.x + logoBox!.width).toBeLessThanOrEqual(navBox!.x);
      expect(navBox!.x + navBox!.width).toBeLessThanOrEqual(themeBox!.x);
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
