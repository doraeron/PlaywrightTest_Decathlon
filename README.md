Project Title: Automated E-Commerce Testing Suite for Decathlon MY

Tech Stack: Playwright, TypeScript, Node.js

Features: 
1. CSV Data-Driven Testing
   - Parsing data in CSV [SampleProducts] to being use in add to cart function.
   - Exported Result: data written to CSV, auto replace after executions.
  
2. Check on targeted product availability
   - If SKU not able to search, then prompt product not available
   - If SKU searched but out of stock, then prompt OOS

3. Dynamic size selection:
   - If ❌ size given in csv + ❌ size option on product page = add to cart if available
   - If ❌ size given in csv + ✅ size option on product page = request tester to modify csv
   - If ✅ size given in csv + ✅ size option on product page = add correct size to cart [both in stock and low stock, need or dont need scrolling]
   - If ✅ size given in csv + size option Out Of Stock on product page = prompt out of stock

How to Run: 
1. Clone repo to ide
2. Terminal to run: npx playwright test --ui
3. Click play button (can choose "(2)Multiple items : search & add to cart" to see whole running process of the function)

Example Output:
<img width="3360" height="2100" alt="image" src="https://github.com/user-attachments/assets/cd6a1c14-3204-4f02-a327-6459afe26cce" />
Exported Execution Result:
<img width="1966" height="776" alt="image" src="https://github.com/user-attachments/assets/96839dd4-3573-4f9b-8b47-945526d8bd7a" />
