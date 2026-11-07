# 🛒 NexusTech AI E-Commerce Support Agent

An autonomous AI-powered e-commerce customer support and order management agent built with **Next.js 16**, **TypeScript**, **Google Sheets API v4**, and **Mammoth**. 

Developed as a capstone project to demonstrate real-time store policy compliance, multi-sheet database integration, automated refund workflows with payout banking verification, and live order placement.

---

## 🌟 Key Capabilities

1. **Strict Store Policy Enforcement**:
   - Ingests official store policies directly from Word documents (`policy.docx`) using `mammoth`.
   - Strictly enforces return windows: **15 days for electronics** (laptops, phones, headphones, keyboards) and **30 days for general items**.
   - Transparently validates purchase dates and calculates eligibility in real time.

2. **Autonomous Order Taking & Inventory Sync (Sheet1 & Sheet2)**:
   - Takes orders directly from customers via natural conversational chat.
   - Automatically checks stock, decrements product inventory count in **Sheet1 (Products)**, and records newly confirmed orders with sequential IDs (`#ORD-101`, `#ORD-102`...) into **Sheet2 (Orders)**.

3. **Refund Processing & Bank Details Capture (Sheet3)**:
   - When a refund is requested, verifies purchase date against policy limits.
   - For eligible refunds, prompts customer for payout banking details (**Bank Name**, **Account Number / IBAN**, and **Mobile Number**).
   - Securely stores banking details in **Sheet3 (BankDetails)** and automatically updates the order status in **Sheet2** to `"Refund approved"`.

4. **Automated Transactional Emails**:
   - Generates and dispatches responsive HTML email receipts upon order placement and refund approvals (via Resend or Nodemailer).

5. **Modern Minimalist Cyberpunk Terminal UI**:
   - Dark aesthetic interface with floating side navigation and real-time sparkline product cards.
   - Live Slide-out Data Drawers to inspect **Sheet1 (Catalog)**, **Sheet2 (Orders)**, **Sheet3 (Bank Accounts)**, and **Audit Activity Logs**.

---

## 🏗️ Architecture & Database Structure

| Sheet / Table | Purpose | Managed Fields |
| :--- | :--- | :--- |
| **Sheet1 (Products)** | Live inventory catalog | Category, Brand, Model Name, Specifications, Price, Stock Remaining |
| **Sheet2 (Orders)** | Order transactions | Order ID, Customer Name, Product, Category, Days Ago, Status |
| **Sheet3 (BankDetails)** | Customer refund payouts | Order ID, Customer Name, Product, Bank Name, Account / IBAN, Mobile Number |
| **Logs** | Immutable audit trail | Timestamp, Session ID, Customer, Order ID, User Message, Agent Action, Status |

---

## 🚀 Quick Start

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18+ or v20+)
- npm or yarn

### 2. Installation
```bash
git clone https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPOSITORY_NAME>.git
cd "AI-Ecommerce Agent"
npm install
```

### 3. Environment Setup
Copy the example environment file:
```bash
cp .env.example .env.local
```

Configure your environment variables in `.env.local`:
```env
# Google Service Account Credentials JSON path
GOOGLE_APPLICATION_CREDENTIALS=ai-ecommerce-agent-513409-a77cc7a940b8.json

# Google Spreadsheet ID (from Google Drive URL)
GOOGLE_SHEET_ID=your_google_spreadsheet_id

# Optional: LLM Providers (Gemini or OpenAI)
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key

# Email Dispatch (Resend or SMTP)
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=onboarding@resend.dev
```

### 4. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Verification & Test Suite

Run the full automated test suite covering policy extraction, Sheets read/write, tool calling, and API routing:

```bash
npm test
```

Four comprehensive test suites are included:
* `test_policy.ts`: Verifies Mammoth Word document parsing and policy section extraction.
* `test_sheets.ts`: Verifies credentials, product catalog retrieval, order placement, stock decrement, and bank details persistence.
* `test_tools.ts`: Verifies AI function calling tools (`lookupProduct`, `lookupOrder`, `processRefund`, `createOrder`, `saveBankDetails`).
* `test_chat_route.ts`: Verifies end-to-end multi-turn conversation routing and HTTP endpoint responses.

---

## 📄 License
MIT License. Created for Capstone Project.

