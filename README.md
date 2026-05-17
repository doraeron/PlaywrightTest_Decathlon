Project Title & Goal: Automated E-Commerce Testing Suite for Decathlon MY

Tech Stack: Playwright, TypeScript, Node.js

Features: 
1. CSV Data-Driven Testing - Parsing data in CSV [SampleProducts] to being use in add to cart function.

  
2. Check on targeted product availability
- If SKU not able to search, then prompt product not available
- If SKU searched but out of stock, then prompt OOS


3. Dynamic size selection:
- If ❌ size given in csv + ❌ size option on product page = add to cart
- If ❌ size given in csv + ✅ size option on product page = request tester to modify csv
- If ✅ size given in csv + ✅ size option on product page = add correct size to cart [both in stock and low stock, need or dont need scrolling]
- If ✅ size given in csv + size option Out Of Stock on product page = prompt out of stock

How to Run: 
1. Clone repo to vs code
2. Terminal to run: npx playwright test --ui
3. Click play button (can choose "(2)Multiple items : search & add to cart" to see whole running process of the function)

Example Output:
<img width="3360" height="2100" alt="image" src="https://github.com/user-attachments/assets/cd6a1c14-3204-4f02-a327-6459afe26cce" />
