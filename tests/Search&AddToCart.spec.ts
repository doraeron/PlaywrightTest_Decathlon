import { test, expect,Page } from '@playwright/test';

test('Single item : search & add to cart', async ({ page }) => {

await page.goto('https://www.decathlon.my/');

  // ENTER : needs update
  const searchBox = page.getByPlaceholder(/Search/i); 
  await searchBox.fill('Soy Protein');
  await searchBox.click();
  await page.keyboard.press('Enter');
  
  // Wait for search results to load
  await page.getByTestId('productHit-tilesbox-gridcell').first().click();

  // 7. 加入購物車
  await page.getByRole('button', { name: 'Add to Cart' }).nth(1).click();

  // 8. 最終驗證：檢查是否出現成功加入的文字
  await expect(page.getByText(/added to cart|in your cart/i).first()).toBeVisible();

});

declare const require: any;
declare const process: any;
const fs = require('fs');
const path = require('path');

// Points the project folder & targeted file, send it to rawContent to be ready 
// Parse the CSV file and create an array of products to buy
const projectRoot = process.cwd();
const csvFilePath = path.join(projectRoot,'tests', 'SampleProducts.csv'); 
const rawContent = fs.readFileSync(csvFilePath, 'utf-8');

// Now being cleaning, splits/ empty lines/ header row
const productsToBuy = rawContent
  .split(/\r?\n|\r/)
  .filter((line: string) => {
    const cleanLine = line.trim();
    return cleanLine !== '' && !cleanLine.toLowerCase().includes('sku'); 
  })
  // 3. Map the clean data 
  .map((line: string) => {
    
    const delimiter = line.includes(';') ? ';' : ',';  
    const parts = line.split(delimiter); 
    
    return { 
      sku: parts[0] ? parts[0].trim() : 'MISSING_SKU', 
      name: parts[1] ? parts[1].trim() : 'MISSING_NAME', 
      price: parts[2] ? parseFloat(parts[2].trim()) : 0 
    };
  });

// Able to see info parsing from csv
console.log('\n=== 🔍 DEBUG: CHECKING PARSED DATA ===');
console.table(productsToBuy);
console.log('======================================\n');

async function addProductToCart(page: Page, sku: string, name: string) {
  console.log(`\n▶ Executing Add to Cart for: ${name} (SKU: ${sku})`);
  
  // 1. Search by SKU
  const searchBox = page.getByPlaceholder(/Search/i).first();
  await searchBox.fill(sku);
  await searchBox.click(); 
  await page.keyboard.press('Enter');

  // 2. Wait for search results to load
  await expect(page).toHaveURL(/.*search.*/i, { timeout: 15000 });
  const firstProduct = page.locator('[data-testid="productHit-tilesbox-gridcell"]').first();
  await expect(firstProduct).toBeVisible({ timeout: 15000 });

  // 3. Click the first product and add to cart
  await firstProduct.click();
  await page.getByRole('button', { name: 'Add to Cart' }).nth(1).click();

  // 4. Wait for success confirmation
  const successMsg = page.getByText(/added to cart|in your cart/i).first();
  await expect(successMsg).toBeVisible({ timeout: 10000 });
  console.log(`✔ Successfully added: ${sku}`);
  
  // 5. CRITICAL RESET: Navigate back to home page for the next loop iteration
  await page.goto('https://www.decathlon.my/');
}

// 4. MAIN TEST EXECUTION

test('Multiple items : search & add to cart', async ({ page }) => {
  // Step 1: Initial Navigation
  await page.goto('https://www.decathlon.my/');

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
    await addProductToCart(page, product.sku, product.name); 
  }

  // Step 3: Final Cart Validation
  console.log('\nAll SKUs added successfully. Proceeding to cart validation.');
  await page.goto('https://www.decathlon.my/cart');

  // Calculate the expected total based on the 'Price' column in your text file
  const expectedTotal = productsToBuy.reduce((sum: number, item: any) => sum + item.price, 0);
  console.log(`Expected Total from Data: RM ${expectedTotal.toFixed(2)}`);

  // Assertion Placeholder: 
  // You must use Codegen to find the exact locator for the final price on the Decathlon Cart page.
  // Example:
  // const uiTotalPrice = page.locator('.cart-total-price'); 
  // await expect(uiTotalPrice).toContainText(expectedTotal.toString());
});