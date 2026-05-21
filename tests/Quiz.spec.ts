import {test,expect} from '@playwright/test';

// UI QUIZ// 

/* Scenario 1: The Basic Search & Verify Flow
1. Navigate to the Decathlon Malaysia homepage (https://www.decathlon.my/).
2. Locate the main search bar.
3. Type in a keyword (e.g., "camping tent" or "badminton racket").
4. Trigger the search (either by pressing 'Enter' or clicking the search magnifying glass icon).
5. Assertion: Verify that the search results page loads successfully
6. At least one product card is visible OR that the search results title (e.g., "Search results for camping tent") is displayed.
Assertion: Verify that the search results page loads successfully.*/

test('UI Q1: Search & Verify',async({page})=>{
    const ToSearchProduct="camping tent";
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('https://www.decathlon.my/');
    
    const searchBox = page.getByPlaceholder(/Search/i);
    await searchBox.fill(ToSearchProduct);
    await searchBox.click();
    await page.keyboard.press('Enter');

    await expect(page.getByText(/Search results for/i).first()).toBeVisible();
    await expect(page.getByText(ToSearchProduct).first()).toBeVisible();
})

/* Scenario 2: Category Navigation (Click)
1. Navigate to the Decathlon Malaysia homepage (https://www.decathlon.my/).
2. Locate the main navigation menu at the top of the page (e.g., "Sports", "Men", "Women", or "Equipment").
3. Click on one of these main categories to open the dropdown/flyout menu.
4. Click on a specific sub-category from the revealed menu (for example, "Running Shoes" under "Men" or "Yoga" under "Sports").
Assertion: Verify that you have successfully landed on the correct category page. 
You can do this by asserting that the main header text (<h1>) of the new page matches the sub-category you clicked, or by checking the URL.
*/
test('UI Q2: Category Navigation (Clicks)', async({page})=>{
    const ToClickCategory1 = "Sports";
    const ToClickCategory2 = "Outdoor Sports";
    const ToClickCategory3 = "Climbing";

    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('https://www.decathlon.my/')
    await page.locator('#headerBoxInBaseContainer a').filter({ hasText:ToClickCategory1 }).click();
    await page.getByText(ToClickCategory2, { exact: true }).first().click();
    await page.getByText(ToClickCategory3, { exact: true }).first().click();
    await page.getByRole('link', { name: `${ToClickCategory3} View All` }).first().click();
    
    await expect(page).toHaveURL(new RegExp(ToClickCategory3, 'i'), { timeout: 15000 });
    await expect(page.getByText(new RegExp(ToClickCategory3, 'i')).first()).toBeVisible();
})
    
// API QUIZ //
/*
Scenario 1: The Direct Backend Search (Pure API)
Objective: Verify that the Decathlon search API returns correct data without using the browser.
Your Mission:
1. Open the Decathlon MY website manually, press F12 to open DevTools, and go to the Network tab.
2. Search for "Tent" and find the backend API URL that Decathlon actually calls to fetch the results (Look for a request that returns a JSON file with product names).
3. Create a new Playwright test using ({ request }) instead of ({ page }).
4. Send a request.get() to that API URL.

Assert 1: Check that the response status is 200.
Assert 2: Parse the JSON response and assert that the results array contains more than 0 items.*/

test('API Q1: Direct Backend Search', async({ request })=>{
    const SearchKeyword = "Tent";
    const APIUrl = `https://www.decathlon.my/search?query=${SearchKeyword}`;

    const response = await request.get(APIUrl);
    expect(response.status()).toBe(200);

    const responseData = await response.json();
    expect(responseData.results.length).toBeGreaterThan(0);
})