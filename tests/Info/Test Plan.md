Test Plans
============
1.0 Cookies and Location Pop Ups ()

2.0 Customer Journey
- Search by SKU
- Handle: Unavailable SKU
- Landing product page
- Handle: Out of stock
- Add to cart
- Handle: Size Selection
- Cart Math

To Dos:

⏰ Dynamic Filtering & Sorting Logic
- The Scenario: Navigate to a category (e.g., "Men's Running Shoes"), apply a filter (e.g., "Price: Low to High"), and then programmatically verify that the prices on the results page are actually in ascending order.
- Interview Value: Proves you can handle complex data validation. Most candidates just check if a page loads; verifying the logic of the data (Math: A≤B≤C) is much more impressive.
- Task: Use .allTextContents() to grab prices, clean the strings (remove "RM"), and compare them in a loop.


⏰ API Interception & Mocking (The "Technical Depth" Play)
- The Scenario: Use page.route() to intercept the network call when a user searches for a product. Mock the response to show 0 results or a specific "Server Error" (500) to see how the UI handles it.
- Interview Value: This is a "Power User" move. It proves you understand the Client-Server relationship. It allows you to test "Edge Cases" (like empty states or errors) that are hard to trigger naturally.
- Task: Mock a JSON response to force the "Oops, no products found" screen to appear.