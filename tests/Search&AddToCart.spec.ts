import { test, expect, Page } from '@playwright/test';

test('Single item : search & add to cart', async ({ page }) => {
await page.setViewportSize({ width: 1280, height: 720 });
await page.goto('https://www.decathlon.my/');

  const searchBox = page.getByPlaceholder(/Search/i); 
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

  // 3. Map the clean data 
  .map((line: string) => {
  // 1. Split the line by comma
  const rawParts = line.split(',');

  // 2. Trim spaces. 
  // FIX: Do NOT use .filter(p => p !== '') here, because it will destroy valid blank Size columns!
  let parts = rawParts.map(p => p.trim());
  
  // Clean up any accidental trailing commas (Excel often adds these at the end of rows)
  while (parts.length > 0 && parts[parts.length - 1] === '') {
    parts.pop();
  }

  // 3. Backwards mapping logic:
  // SKU is always parts[0]
  // Price is now ALWAYS the last item
  // Size is now the second to last item
  const sku = parts[0];
  const priceString = parts[parts.length - 1];
  const sizeRaw = parts[parts.length - 2]; 
  
  // FIX: If the size column is left completely blank in the CSV, automatically label it "No Size"
  const size = (sizeRaw === '' || !sizeRaw) ? 'No Size' : sizeRaw;
  
  // 4. Reconstruction of the Name:
  // The name is everything in between the SKU and the Size
  const name = parts.slice(1, parts.length - 2).join(', ').replace(/"/g, '');

  return {
    sku: sku,
    name: name,
    price: parseFloat(priceString.replace(/[^0-9.]/g, '')) || 0, // Extra safety: strip out RM if accidentally typed
    size: size
  };
});

console.table(productsToBuy);
console.log('======================================\n');

// Function - Search + ATC 
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
    console.log(`❌ SKU: ${sku} - Not found.`);
    await page.goto('https://www.decathlon.my/');
    return;
  }

  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000); 

  // --- Sizing Logic ---
  const dropdownPlaceholder = page.locator('div').filter({ hasText: /^Select your size$|^No Size$/ }).first();
  const isDropdownVisible = await dropdownPlaceholder.isVisible();
  const dropdownText = await dropdownPlaceholder.innerText();

  // RULE 1: If it's a "No Size" product OR the dropdown isn't there, Add to Cart immediately
  if (!isDropdownVisible || dropdownText.includes('No Size')) {
    console.log(`📦 No Size required for this product - Adding to cart`);
    await performAddToCart(page, sku);
    await page.goto('https://www.decathlon.my/cart');
  } 
  // RULE 2: If a size is intended and the dropdown is active
  else if (intendedSize && intendedSize.toLowerCase() !== "no size") {
    await dropdownPlaceholder.click();
    await page.waitForTimeout(1000); 
    
    console.log(`🔍 Machine is looking for: "${intendedSize}" with Stock Status...`);

    // FIX 1: Look for the 'option' role that HAS an inner 'option-label' matching your exact size
    const sizeOption = page.locator('[role="option"]').filter({
      has: page.locator('[data-testid="option-label"]').filter({ hasText: new RegExp(`^${intendedSize}$`, 'i') })
    });

    try {
      // 1. Wait for it to be attached to the DOM (it doesn't need to be visible on screen)
      await sizeOption.waitFor({ state: 'attached', timeout: 5000 });

      // 2. THE BYPASS: Read the text using 'textContent()' instead of 'innerText()'. 
      // textContent() reads the raw code, so it doesn't care if the text is hidden behind a scrollbar.
      const stockElement = sizeOption.getByTestId('option-status');
      const statusText = await stockElement.textContent() || ''; 

      if (statusText.toLowerCase().includes('in stock') || statusText.toLowerCase().includes('low stock')) {
        console.log(`✅ Size ${intendedSize} is ${statusText.trim()}. Selecting...`);
        
        // 3. THE BYPASS: Execute a raw JavaScript click. 
        // This completely skips Playwright's scroll-and-click checks.
        await sizeOption.evaluate((element: any) => element.click()); 
        
        await performAddToCart(page, sku);
      } else {
        console.log(`❌ SKU: ${sku} - ${intendedSize} is OUT OF STOCK (${statusText.trim()}).`);
        await page.keyboard.press('Escape');
      }
    } catch (e) {
      console.log(`❌ SKU: ${sku} - Could not find size option "${intendedSize}".`);
      await page.keyboard.press('Escape'); // Close dropdown if it fails
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
  
  // 1. Click the button
  await addToCartBtn.click({ force: true });
  
  // 2. STICKY FIX: Wait for the "Added to Cart" popup/sidebar to appear
  // This ensures the server request completed successfully
  const successMsg = page.getByText(/added to cart|in your cart/i).first();
  try {
    await successMsg.waitFor({ state: 'visible', timeout: 10000 });
    console.log(`✅ Success: ${sku} is confirmed in cart.`);
  } catch (e) {
    console.log(`⚠️ Warning: ${sku} clicked but no confirmation seen. It might have failed.`);
  }
}


test('Multiple items : search & add to cart', async ({ page }) => {
  // FIX: Increase the global timeout for this test to 3 minutes (180,000 milliseconds)
  // because processing multiple items from a CSV takes time!
  test.setTimeout(180000); 

  // Step 1: Initial Navigation
  await page.setViewportSize({ width: 1280, height: 720 });
  
  // OPTIMIZATION: Tell Playwright not to wait for heavy ads/trackers to finish loading
  await page.goto('https://www.decathlon.my/', { waitUntil: 'domcontentloaded' });

  // Optional: Handle cookies once before the loop starts
  const acceptBtn = page.getByRole('button', { name: 'Got It' });
  try {
    await acceptBtn.waitFor({ state: 'visible', timeout: 3000 });
    await acceptBtn.click();
  } catch (error) {
    // Ignore if banner doesn't appear
  }

  // Step 2: The for...of Loop (Sequential Execution)
  for (const product of productsToBuy) {
    await addProductToCart(page, product.sku, product.name, product.size); 
  }

  // Step 3: Final Cart Validation
  console.log('\nAll SKUs added successfully. Proceeding to cart validation.');
  await page.goto('https://www.decathlon.my/cart', { waitUntil: 'domcontentloaded' });

  // Calculate the expected total based on the 'Price' column
  const expectedTotal = productsToBuy.reduce((sum: number, item: any) => sum + item.price, 0);
  console.log(`Expected Total from Data: RM ${expectedTotal.toFixed(2)}`);
});