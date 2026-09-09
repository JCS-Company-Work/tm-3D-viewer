const { test, expect } = require("@playwright/test");

const productPath = process.env.PRODUCT_PATH || "/product/your-product-slug/";
const edgeProductPath = process.env.EDGE_PRODUCT_PATH || "";

const hashFromSrc = (src) =>
  (src || "").match(/composites\/([^/]+)-\d+\.png/)?.[1] || "";

const safeInputValue = async (page, selector) => {
  const locator = page.locator(selector);
  const count = await locator.count();
  if (!count) {
    return "";
  }

  const first = locator.first();
  try {
    return await first.inputValue();
  } catch {
    return "";
  }
};

test.describe("TM3D Plugin E2E", () => {
  test("initial load renders composite image", async ({ page }) => {
    await page.goto(productPath, { waitUntil: "domcontentloaded" });

    const statusImage = page.locator(".status-image img");
    await expect(statusImage).toBeVisible();

    const src = await statusImage.getAttribute("src");
    expect(src || "").toContain("/assets/layers/composites/");
  });

  test("equivalent no-param and param config use the same composite hash", async ({
    page,
  }) => {
    await page.goto(productPath, { waitUntil: "domcontentloaded" });

    const firstSrc = await page
      .locator(".status-image img")
      .getAttribute("src");
    expect(firstSrc).toBeTruthy();

    const current = new URL(page.url());

    const checkedModel = page.locator(".obj-product-type .wapf-input:checked");
    const checkedModelCount = await checkedModel.count();
    const idFromDOM = checkedModelCount
      ? (await checkedModel.first().getAttribute("id")) || ""
      : "";

    const initialState = await page.evaluate(
      () => window.TM3DPlugin?.data?.initial_state || {},
    );

    const idFromInitialState = initialState?.id ? String(initialState.id) : "";

    const colourFromState = initialState?.top ? String(initialState.top) : "";
    const baseFromState = initialState?.base ? String(initialState.base) : "";
    const veneerFromState = initialState?.veneer
      ? String(initialState.veneer)
      : "";

    const idFromAddToCart = await page
      .locator(".single_add_to_cart_button")
      .first()
      .getAttribute("value")
      .catch(() => "");

    const idFromUrl = current.searchParams.get("id") || "";

    const id =
      idFromDOM || idFromInitialState || idFromAddToCart || idFromUrl || "";
    const colour =
      colourFromState ||
      (await safeInputValue(page, ".obj-top-colour .wapf-input:checked"));
    const base =
      baseFromState ||
      (await safeInputValue(page, ".obj-base .wapf-input:checked"));

    expect(id).not.toBe("");
    expect(colour).not.toBe("");
    expect(base).not.toBe("");

    current.searchParams.set("id", id || "");
    current.searchParams.set("colour", colour || "");
    current.searchParams.set("base", base || "");

    const veneerFromDOM = await safeInputValue(
      page,
      ".obj-metal-edge-veneer .wapf-input:checked",
    );
    const veneer = veneerFromState || veneerFromDOM;
    if (veneer) {
      current.searchParams.set("veneer", veneer);
    }

    await page.goto(current.toString(), { waitUntil: "domcontentloaded" });

    const secondSrc = await page
      .locator(".status-image img")
      .getAttribute("src");
    expect(secondSrc).toBeTruthy();

    const firstHash = hashFromSrc(firstSrc);
    const secondHash = hashFromSrc(secondSrc);

    expect(firstHash).not.toBe("");
    expect(secondHash).not.toBe("");
    expect(secondHash).toBe(firstHash);
  });

  // test("edge product default load keeps metal edge drawer active", async ({
  //   page,
  // }) => {
  //   test.skip(
  //     !edgeProductPath,
  //     "Set EDGE_PRODUCT_PATH in tests/.env for this test.",
  //   );

  //   await page.goto(edgeProductPath, { waitUntil: "domcontentloaded" });

  //   const metalButton = page.locator("#option-metal-edge-veneer");
  //   await expect(metalButton).toBeVisible();
  //   await expect(metalButton).not.toHaveClass(/inactive/);
  // });

  // test("created-by-us click keeps composite valid and base selected", async ({
  //   page,
  // }) => {
  //   await page.goto(productPath, { waitUntil: "domcontentloaded" });

  //   const cards = page.locator(".created-by-us-configuration");
  //   const count = await cards.count();
  //   test.skip(count === 0, "No Created By Us cards rendered for this product.");

  //   await cards.first().click();

  //   const statusImage = page.locator(".status-image img");
  //   await expect(statusImage).toBeVisible();

  //   const src = await statusImage.getAttribute("src");
  //   expect(src || "").toContain("/assets/layers/composites/");

  //   const selectedBase = page.locator(".obj-base .wapf-input:checked");
  //   await expect(selectedBase).toHaveCount(1);

  //   const baseLabel = await selectedBase.first().evaluate((el) => {
  //     return (
  //       el
  //         .closest(".wapf-swatch")
  //         ?.querySelector("label")
  //         ?.textContent?.trim() || ""
  //     );
  //   });

  //   expect(baseLabel).not.toBe("");
  // });

  // test("current-status busy mask stays visible long enough to avoid flicker", async ({
  //   page,
  // }) => {
  //   await page.goto(productPath, { waitUntil: "domcontentloaded" });

  //   const busyDuration = await page.evaluate(async () => {
  //     const status = document.querySelector(".current-status");
  //     const topInputs = Array.from(
  //       document.querySelectorAll(".obj-top-colour .wapf-input"),
  //     );
  //     const nextInput = topInputs.find(
  //       (input) => !input.checked && input.offsetParent !== null,
  //     );

  //     if (!status || !nextInput) {
  //       return -1;
  //     }

  //     return await new Promise((resolve) => {
  //       let startedAt = null;

  //       const observer = new MutationObserver(() => {
  //         const busy = status.getAttribute("aria-busy") === "true";

  //         if (busy && startedAt === null) {
  //           startedAt = performance.now();
  //           return;
  //         }

  //         if (!busy && startedAt !== null) {
  //           const duration = performance.now() - startedAt;
  //           observer.disconnect();
  //           resolve(duration);
  //         }
  //       });

  //       observer.observe(status, {
  //         attributes: true,
  //         attributeFilter: ["aria-busy"],
  //       });

  //       nextInput.click();

  //       setTimeout(() => {
  //         observer.disconnect();
  //         resolve(-2);
  //       }, 5000);
  //     });
  //   });

  //   test.skip(
  //     busyDuration === -1,
  //     "No alternate top swatch or current-status element found.",
  //   );
  //   expect(busyDuration).toBeGreaterThanOrEqual(250);
  // });

  // test("no bogus texture-key 404s are requested", async ({ page }) => {
  //   const bad404s = [];
  //   const invalidTexturePattern =
  //     /(profilecolour|meshcolour|undercolour|secondcolourname)/i;

  //   page.on("response", (response) => {
  //     const url = response.url();
  //     if (response.status() === 404 && invalidTexturePattern.test(url)) {
  //       bad404s.push(url);
  //     }
  //   });

  //   await page.goto(productPath, { waitUntil: "domcontentloaded" });

  //   const topButton = page.locator("#option-top-colour");
  //   if (await topButton.count()) {
  //     await topButton.first().click();
  //   }

  //   const topInputs = page.locator(".obj-top-colour .wapf-input:visible");
  //   const topCount = await topInputs.count();

  //   if (topCount > 1) {
  //     const firstChecked = page.locator(".obj-top-colour .wapf-input:checked");
  //     const checkedId = await firstChecked
  //       .first()
  //       .getAttribute("id")
  //       .catch(() => null);

  //     for (let i = 0; i < topCount; i += 1) {
  //       const input = topInputs.nth(i);
  //       const id = await input.getAttribute("id").catch(() => null);
  //       const isChecked = await input.isChecked().catch(() => false);

  //       if ((id && checkedId && id === checkedId) || isChecked) {
  //         continue;
  //       }

  //       await input.check({ force: true });
  //       break;
  //     }
  //   }

  //   await page.waitForLoadState("networkidle");

  //   expect(
  //     bad404s,
  //     `Unexpected invalid texture key 404s: ${bad404s.join(", ")}`,
  //   ).toHaveLength(0);
  // });
  test("PDF can be generated", async ({ page }) => {
    await page.goto(
      "https://store.tailormade.uk/product/phantom-edge-stadium/",
      { waitUntil: "domcontentloaded" },
    );

    const cookieConsent = page.locator("#cookie-consent-options");

    if (await cookieConsent.isVisible()) {
      await page.locator("#btn-accept-all").click();
    }

    const downloadPromise = page.waitForEvent("download");

    await page.locator("#make-pdf").click();

    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
  });
});
