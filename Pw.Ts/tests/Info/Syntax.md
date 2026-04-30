Syntax
_____________________________________________________________________
# Import
import { test, expect, chromium, request } from '@playwright/test';

    import:{ test, expect }
    - 具名匯入 (Named Imports)- to import these 2 tools only

    @playwright/test 
    - Toolbox that having lots of functions

    from:'@playwright/test'
    - From source path (Installed in node_modules previously)
_____________________________________________________________________
# Test Declare
test('Title', async ({ page }) => { ... });
test('Advanced Test', async ({ page, context, browserName }) => {...});

1. Register the Title
2. Inject the 'page' object to be used in {}
_____________________________________________________________________
# Actions
Navigation
await
await page.goto('https://playwright.dev/');

# Basic actions
check、click、fill、press
go to link: await page.goto('https://www.decathlon.my/');
click 
const getStarted = page.getByRole('link', { name: 'Get started' });
fill in   : await searchBox.fill(ToSearchProduct);
hover on  : await page.getByText('').hover();

await page.getByTestId('productHit-tilesbox-gridcell').first().click();

# Assertions
expect
await expect(page).toHaveTitle(/Playwright/);

# Check if a text exist, then click on it
Text:
await page.getByRole('link', { name: 'Climbing View All' }).click();

Template Literal:
await page.getByRole('link', { name: `${ToClickCategory3} View All` }).click();

# Check if URL have certain text:
Text: 
await expect(page).toHaveURL(/.*climbing.*/i, { timeout: 15000 });

Variable: 
await expect(page).toHaveURL(new RegExp(ToClickCategory3, 'i'), { timeout: 15000 });


