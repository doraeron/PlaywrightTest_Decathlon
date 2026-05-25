import { test, expect, Page } from '@playwright/test';

test('(1) Hard Coded - Single item : search & add to cart', async ({ page }) => {
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

// Define structured item tracking type interface
interface ProductItem {
  sku: string;
  name: string;
  price: number;
  size: string;
  status: 'Added' | 'Failed' | 'Out of Stock' | 'Skipped due to missing size' | '-';
}

// Points the project folder & targeted file, send it to rawContent to be ready 
const projectRoot = process.cwd();
const csvFilePath = path.join(projectRoot, 'tests', 'SampleProducts.csv'); 
const rawContent = fs.readFileSync(csvFilePath, 'utf-8');

// Cleaning, splits/ empty lines/ header row
const productsToBuy: ProductItem[] = rawContent
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
      size: size,
      status: '-' 
    };
  });

// Function - Search + Add To Cart
async function addProductToCart(page: Page, product: ProductItem) {
  const { sku, name, size: intendedSize } = product;
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
    console.log(`\x1b[31m❌ SKU: ${sku} - Not an available SKU.\x1b[0m`);
    product.status = 'Failed';
    await page.goto('https://www.decathlon.my/');
    return;
  }

  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000); 

  const globalSizeBlock = page.locator('div').filter({ hasText: /Select your size|No Size/i }).nth(1);
  const primaryActionButton = page.getByRole('button', { name: /Add to Cart|OUT OF STOCK/i }).nth(1);

  let selectorTextContext = '';
  let buttonTextContext = '';

  if (await globalSizeBlock.count() > 0) {
    selectorTextContext = (await globalSizeBlock.innerText()).replace(/\s+/g, ' '); 
  }
  if (await primaryActionButton.count() > 0) {
    buttonTextContext = await primaryActionButton.innerText();
  }

  if (
    selectorTextContext.toLowerCase().includes('check store availability') || 
    buttonTextContext.toLowerCase().includes('out of stock')
  ) {
    console.log(`\x1b[31m❌ SKU: ${sku} - ${intendedSize} is OUT OF STOCK (${selectorTextContext.trim()}).\x1b[0m`);
    product.status = 'Out of Stock'; 
    await page.keyboard.press('Escape');
    await page.goto('https://www.decathlon.my/');
    return; 
  }
  // =========================================================================

  // Sizing Logic Flow
  const dropdownPlaceholder = page.locator('div').filter({ hasText: /^Select your size$|^No Size$/ }).first();
  const isDropdownVisible = await dropdownPlaceholder.isVisible();
  const dropdownText = await dropdownPlaceholder.innerText();

  // RULE 1: No Size Product
  if (!isDropdownVisible || dropdownText.includes('No Size')) {
    console.log(`📦 No Size required for this product - Adding to cart`);
    const success = await performAddToCart(page, sku);
    product.status = success ? 'Added' : 'Failed';
  } 
  // RULE 2: Sizing Product
  else if (intendedSize && intendedSize.toLowerCase() !== "no size") {
    await dropdownPlaceholder.click();
    await page.waitForTimeout(1000); 
    
    console.log(`🔍 Machine is looking for: "${intendedSize}" with Stock Status...`);

    const sizeOption = page.locator('[role="option"]').filter({
      has: page.locator('[data-testid="option-label"]').filter({ hasText: new RegExp(`^${intendedSize}$`, 'i') })
    });

    try {
      await sizeOption.waitFor({ state: 'attached', timeout: 5000 });

      const stockElement = sizeOption.getByTestId('option-status');
      const statusText = await stockElement.textContent() || ''; 

      if (statusText.toLowerCase().includes('in stock') || statusText.toLowerCase().includes('low stock')) {
        console.log(`✅ Size ${intendedSize} is ${statusText.trim()}. Selecting...`);
        
        await sizeOption.evaluate((element: any) => element.click()); 

        const success = await performAddToCart(page, sku);
        product.status = success ? 'Added' : 'Failed';
      } else {
        console.log(`\x1b[31m❌ SKU: ${sku} - ${intendedSize} is OUT OF STOCK (${statusText.trim()}).\x1b[0m`);
        product.status = 'Out of Stock';
        await page.keyboard.press('Escape');
      }
    } catch (e) {
      console.log(`\x1b[31m❌ SKU: ${sku} - Could not find size option "${intendedSize}".\x1b[0m`);
      product.status = 'Failed';
      await page.keyboard.press('Escape'); 
    }
  }
  // RULE 3: Dropdown exists but no size was provided in CSV
  else {
    console.log(`⚠️ SKU: ${sku} requires a size, but none was provided in CSV. Skipping...`);
    product.status = 'Skipped due to missing size';
  }

  await page.goto('https://www.decathlon.my/');
}

async function performAddToCart(page: Page, sku: string): Promise<boolean> {
  const addToCartBtn = page.getByRole('button', { name: /Add to Cart|OUT OF STOCK/i}).nth(1);
  await addToCartBtn.waitFor({ state: 'visible' });
  
  if (await addToCartBtn.innerText().then(t => t.toLowerCase().includes('out of stock'))) {
    console.log(`\x1b[31m❌ SKU: ${sku} - Action Button locked as Out Of Stock.\x1b[0m`);
    return false;
  }

  await addToCartBtn.click({ force: true });
  const successMsg = page.getByText(/added to cart|in your cart/i).first();
  try {
    await successMsg.waitFor({ state: 'visible', timeout: 10000 });
    console.log(`✅ Success: ${sku} is confirmed in cart.`);
    return true;
  } catch (e) {
    console.log(`⚠️ Warning: ${sku} clicked but no confirmation seen. It might have failed.`);
    return false;
  }
}

test('(2) CSV Parsed - Multiple items : search & add to cart', async ({ page }) => {
  test.setTimeout(180000); 
  // Replace console table - only triggers when running this test
  console.log('📋 Parsed CSV Product Array Template Loaded:');

  // Create an Object instead of an Array to force the index to start at 1
  const displayTable: Record<string, any> = {};
  
  productsToBuy.forEach((p, index) => {
    displayTable[index + 1] = {
      sku: p.sku,
      name: p.name.length > 25 ? p.name.substring(0, 22) + '...' : p.name, // Truncates long names
      size: p.size,
      price: p.price,
      status: p.status
    };
  });
  console.log('\n');
  console.table(displayTable,['sku', 'name', 'size', 'price', 'status']);
  
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('https://www.decathlon.my/', { waitUntil: 'domcontentloaded' });
  
  // Pre handling Cookies
  const acceptBtn = page.getByRole('button', { name: 'Got It' });
  try {
    await acceptBtn.waitFor({ state: 'visible', timeout: 3000 });
    await acceptBtn.click();
  } catch (error) {
  }

  // Loop through CSV products
  for (const product of productsToBuy) {
    await addProductToCart(page, product); 
  }

  // Final Cart Validation
  console.log('\n======================================================');
  console.log('🏁 All SKUs processed. Compiling final verification dashboards:');
  console.log('======================================================');
  
  await page.goto('https://www.decathlon.my/cart', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(4000);

  // Post-test results list layout tracking
  console.log('Product Status Summary:');
  productsToBuy.forEach((product, index) => {
    console.log(`${index + 1}. ${product.sku} - ${product.name} - ${product.size} - RM ${product.price.toFixed(2)} - ${product.status}`);
  });

  let liveCartTotalValue = 'RM 0.00';
  try {
    const totalBlock = page.locator('[class*="summary"], [class*="total"]').locator('text=/RM\\s*\\d+/i').first();
    if (await totalBlock.isVisible()) {
      liveCartTotalValue = await totalBlock.innerText();
    } else {
      const computedTotal = productsToBuy
        .filter(item => item.status === 'Added')
        .reduce((sum, item) => sum + item.price, 0);
      liveCartTotalValue = `RM ${computedTotal.toFixed(2)} (Calculated from Added Array)`;
    }
  } catch (e) {
    console.log('\x1b[31m⚠️ Attention: Unable to directly extract running total values from UI wrapper elements.\x1b[0m');
    const computedTotal = productsToBuy
      .filter(item => item.status === 'Added')
      .reduce((sum, item) => sum + item.price, 0);
    liveCartTotalValue = `RM ${computedTotal.toFixed(2)} (Calculated from Added Array)`;
  }
  
  console.log(`\n💰 Final Checkout: ${liveCartTotalValue.trim()}`);
  console.log('======================================================\n');

  // =========================================================================
  // AUTOMATED FILE REPLACEMENT SYSTEM (OVERWRITES CLEANLY ON RUNTIME)
  // =========================================================================
  const outputCsvFilePath = path.join(projectRoot, 'tests', 'ExecutionResults.csv');
  let csvContent = 'SKU,Product Name,Size,Price,Execution Status\n';
  
  productsToBuy.forEach((product) => {
    const sanitizedName = product.name.replace(/,/g, ''); // Stop commas from breaking columns
    csvContent += `${product.sku},${sanitizedName},${product.size},RM ${product.price.toFixed(2)},${product.status}\n`;
  });
  
  try {
    // fs.writeFileSync automatically truncates and completely overrides the old sheet
    fs.writeFileSync(outputCsvFilePath, csvContent, 'utf-8');
    console.log(`💾 Auto-Replace Success: Final run logged fresh at: ${outputCsvFilePath}`);
  } catch (err) {
    console.log(`\x1b[31m❌ Export Error: Could not overwrite data matrix to file system: ${err}\x1b[0m`);
  }
  // =========================================================================
});