# Print Working Directory
pwd
______________________________________________________
# Codegen - with URL
npx playwright codegen
______________________________________________________

▶️ Execution

# Run with complete path 
npx playwright test tests/signin.spec.ts
# Run with File Name or Path -- 
Including test(signin)
npx playwright test signin
Eg. tests/search.spec.ts、tests/web-search.spec.ts 
# Run with Test Title -- 
npx playwright test -g "signin"
Eg. as long includes test('user should signin', ...)
# Run with debug / codegen mode
npx playwright test --debug
npx playwright codegen

Type Of Application
# 1️⃣ Open Test -- For 開發/除錯 (Debug)：
cd my-playwright-study
npx playwright test --ui

# 2️⃣ Manual Get Report -- 跑正式測試並留存報告
cd my-playwright-study
npx playwright test
npx playwright show-report

______________________________________________________

🤖 Version Related
# Install Latest Version
npm install -D @playwright/test@latest
npx playwright install --with-deps

# Check Current Version
npx playwright --version

______________________________________________________

