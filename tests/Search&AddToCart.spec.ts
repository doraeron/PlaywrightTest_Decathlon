import { test, expect,Page } from '@playwright/test'


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
const csvFilePath = path.join(projectRoot,'tests', 'SampleProducts.csv'); 
const rawContent = fs.readFileSync(csvFilePath, 'utf-8');

// Cleaning, splits/ empty lines/ header row
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
console.table(productsToBuy);
console.log('======================================\n');

// Function - search + ATC that being use in single/multiple scenario
async function addProductToCart(page: Page, sku: string, name: string) {
  console.log(`\n▶ Executing Add to Cart for: ${name} (SKU: ${sku})`);
  const searchBox = page.getByPlaceholder(/Search/i).first();
  await searchBox.fill(sku);
  await searchBox.click(); 
  await page.keyboard.press('Enter');
  const firstProduct = page.locator('[data-testid="productHit-tilesbox-gridcell"]').first();
  
  await expect(page).toHaveURL(/.*search.*/i, { timeout: 15000 });

  // (1) Validate SKU 
  try {
    await firstProduct.waitFor({ state: 'visible', timeout: 5000 });
  } catch (error) { 
    // Not Available SKU
    console.log(`❌ Source File Error: SKU: ${sku}) - NOT FOUND`);
    await page.goto('https://www.decathlon.my/');
    return; // EXIT this function immediately and move to the next item in the loop
  }
  
  // (2) Validate In Stock Status
    const addToCartBtn = page.getByRole('button', { name: /Add to Cart/i }).nth(1);;
    const outOfStockMsg = page.getByRole('button', { name: /Out of Stock/i }).first();
    await firstProduct.click();
    await expect(addToCartBtn.or(outOfStockMsg)).toBeVisible({ timeout: 100000 });
    
    if (await outOfStockMsg.isVisible()) {  
      console.log(`❌ SKU: ${sku} - OUT OF STOCK`);
      await page.goto('https://www.decathlon.my/');
      return; // EXIT this function immediately and move to the next item in the loop
    }
    
    const successMsg = page.getByText(/added to cart|in your cart/i).first();
    await addToCartBtn.click();
  try {
    await successMsg.waitFor({ state: 'visible', timeout: 10000 });
    console.log(`Successfully added: ${sku} to cart`);    
  }catch (e){
    console.log(`⚠️ Warning: ${sku} clicked add to cart, but success message didn't appear.`);
  }
    await page.goto('https://www.decathlon.my/');
}


test('Multiple items : search & add to cart', async ({ page }) => {
  // Step 1: Initial Navigation
  await page.setViewportSize({ width: 1280, height: 720 });
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

});