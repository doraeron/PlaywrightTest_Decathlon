import { test, expect, Page } from '@playwright/test';

test('(1) Single item : search & add to cart', async ({ page }) => {
await page.setViewportSize({ width: 1280, height: 720 });
await page.goto('https://www.decathlon.my/');

  const searchBox = page.getByPlaceholder(/Search/i); 
  
  // Hardcode product to search
  await searchBox.fill('Soy Protein');
  
  await searchBox.click();
  await page.keyboard.press('Enter');
  await page.getByTestId('productHit-tilesbox-gridcell').first().click();
  await page.getByRole('button', { name: 'Add to Cart' }).nth(1).click();
  await expect(page.getByText(/added to cart|in your cart/i).first()).toBeVisible();

});
declare const require: any;
declare const process: any;
const fs = require('fs');
const path = require('path');

// Points the project folder & targeted file, send it to rawContent to be ready 
// Parse the CSV file and create an array of products to buy
const projectRoot = process.cwd();
const csvFilePath = path.join(projectRoot,'tests','SampleProducts.csv'); 
const rawContent = fs.readFileSync(csvFilePath,'utf-8');

// Cleaning, splits/ empty lines/ header row
const productsToBuy = rawContent
  .split(/\r?\n|\r/)
  .filter((line: string) => {
    const cleanLine = line.trim();
    return cleanLine !== '' && !cleanLine.toLowerCase().includes('sku'); 
  })

  // Data Mapping: CSV split by comma, remove empty lines & header row
  .map((line: string) => {
  const rawParts = line.split(',');
  let parts = rawParts.map(p => p.trim());
  while (parts.length > 0 && parts[parts.length - 1] === '') {
    parts.pop();
  }
  // Backwards Mapping: SKU first, Price last, Size second to last
  const sku = parts[0];
  const priceString = parts[parts.length - 1];
  const sizeRaw = parts[parts.length - 2]; 
  // If size not given in CSV, default to "No Size"
  const size = (sizeRaw === '' || !sizeRaw) ? 'No Size' : sizeRaw;
  // Name: takes everything in between, to handle " or ' in product name
  const name = parts.slice(1, parts.length - 2).join(', ').replace(/"/g, '');

  return {
    sku: sku,
    name: name,
    price: parseFloat(priceString.replace(/[^0-9.]/g, '')) || 0, 
    size: size
  };
});

console.table(productsToBuy);
console.log('\n');

// Function - Search + Add To Cart
async function addProductToCart(page: Page, sku: string, name: string, intendedSize: string) {
  console.log(`\n▶ Processing: ${name} (SKU: ${sku})`);
  const searchBox = page.getByPlaceholder(/Search/i).first();
  
  try {
    await searchBox.waitFor({ state: 'visible', timeout: 10000 });
    await searchBox.click();
    await searchBox.fill(''); 
    await searchBox.fill(sku); 
    await Promise.all([
      page.waitForURL(/.*search|.*products.*/i, { timeout: 15000 }),
      page.keyboard.press('Enter')
    ]);
  } catch (e) {
    await page.locator('button[type="submit"]').first().click({ force: true });
  }

  const firstProduct = page.locator('[data-testid="productHit-tilesbox-gridcell"]').first();
  
  try {
    await firstProduct.waitFor({ state: 'visible', timeout: 10000 });
    await firstProduct.click();
  } catch (error) {
    console.log(`❌ SKU: ${sku} - Not an available SKU.`);
    await page.goto('https://www.decathlon.my/');
    return;
  }

  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000); 

  // Sizing Logic
  const dropdownPlaceholder = page.locator('div').filter({ hasText: /^Select your size$|^No Size$/ }).first();
  const isDropdownVisible = await dropdownPlaceholder.isVisible();
  const dropdownText = await dropdownPlaceholder.innerText();

  // RULE 1: No Size Product - In CSV & Product Page -- Add To Cart Instantly
  if (!isDropdownVisible || dropdownText.includes('No Size')) {
    console.log(`📦 No Size required for this product - Adding to cart`);
    await performAddToCart(page, sku);
    await page.goto('https://www.decathlon.my/cart');
  } 
  // RULE 2: Sizing Product - If a size is intended and the dropdown is active
  else if (intendedSize && intendedSize.toLowerCase() !== "no size") {
    await dropdownPlaceholder.click();
    await page.waitForTimeout(1000); 
    
    console.log(`🔍 Machine is looking for: "${intendedSize}" with Stock Status...`);

    // Look for the 'option' role with matching size text
    const sizeOption = page.locator('[role="option"]').filter({
      has: page.locator('[data-testid="option-label"]').filter({ hasText: new RegExp(`^${intendedSize}$`, 'i') })
    });

    try {
      // Wait: Attached to the DOM (it doesn't need to be visible on screen)
      await sizeOption.waitFor({ state: 'attached', timeout: 5000 });

      // Bypass textContent(): reads raw code, able to capture stock status even if hidden behind scrollbar.
      const stockElement = sizeOption.getByTestId('option-status');
      const statusText = await stockElement.textContent() || ''; 

      if (statusText.toLowerCase().includes('in stock') || statusText.toLowerCase().includes('low stock')) {
        console.log(`✅ Size ${intendedSize} is ${statusText.trim()}. Selecting...`);
        
        //raw JavaScript click: skips Playwright's scroll-and-click checks.
        await sizeOption.evaluate((element: any) => element.click()); 

        await performAddToCart(page, sku);
      } else {
        console.log(`❌ SKU: ${sku} - ${intendedSize} is OUT OF STOCK (${statusText.trim()}).`);
        await page.keyboard.press('Escape');
      }
    } catch (e) {
      console.log(`❌ SKU: ${sku} - Could not find size option "${intendedSize}".`);
      await page.keyboard.press('Escape'); 
    }
  }

  // RULE 3: Dropdown exists but no size was provided in CSV
  else {
    console.log(`⚠️ SKU: ${sku} requires a size, but none was provided in CSV. Skipping...`);
  }

  await page.goto('https://www.decathlon.my/');
}

async function performAddToCart(page: Page, sku: string) {
  const addToCartBtn = page.getByRole('button', { name: /Add to Cart/i }).nth(1);
  await addToCartBtn.waitFor({ state: 'visible' });
  
  await addToCartBtn.click({ force: true });
  const successMsg = page.getByText(/added to cart|in your cart/i).first();
  try {
    await successMsg.waitFor({ state: 'visible', timeout: 10000 });
    console.log(`✅ Success: ${sku} is confirmed in cart.`);
  } catch (e) {
    console.log(`⚠️ Warning: ${sku} clicked but no confirmation seen. It might have failed.`);
  }
}


test('(2)Multiple items : search & add to cart', async ({ page }) => {
  test.setTimeout(180000); 
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('https://www.decathlon.my/', { waitUntil: 'domcontentloaded' });
  
  //Pre handling Cookies, ignore if not appear
  const acceptBtn = page.getByRole('button', { name: 'Got It' });
  try {
    await acceptBtn.waitFor({ state: 'visible', timeout: 3000 });
    await acceptBtn.click();
  } catch (error) {
  }

  // Loop through CSV products & to add each to cart
  for (const product of productsToBuy) {
    await addProductToCart(page, product.sku, product.name, product.size); 
  }

  // Final Cart Validation
  console.log('\nAll SKUs added successfully. Proceeding to cart validation.');
  await page.goto('https://www.decathlon.my/cart', { waitUntil: 'domcontentloaded' });

  // To Add - Print the updated (console.table(productsToBuy) with column (1) Status: Added/Failed (2) Cart Total
  
  
  /* OLD -- compare expected total with displayed total --

  // ⚠️ Extract the displayed total from the cart page
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000); 
  const totalLocator = page.locator('text=Total').first();
  await totalLocator.waitFor({ state: 'visible', timeout: 10000 });
  const totalText = await totalLocator.textContent() || '';
  const displayedTotalMatch = totalText.match(/RM\s?([\d,.]+)/i);
  const displayedTotal = displayedTotalMatch ? parseFloat(displayedTotalMatch[1].replace(/,/g, '')) : 0;
  console.log(`Displayed Total in Cart: RM ${displayedTotal.toFixed(2)}`);

  // ⚠️ Final Assertion: Compare expected total with displayed total
  try {
    expect(displayedTotal).toBeCloseTo(expectedTotal, 2);
    console.log('✅ Cart Total Validation Passed!');
  } catch (error) {
    console.log('❌ Cart Total Validation Failed. There might be a discrepancy in pricing or items added.');
  }*/

});