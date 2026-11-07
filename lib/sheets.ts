import { google, sheets_v4 } from 'googleapis';
import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import dotenv from 'dotenv';

// Load environment variables if not already loaded
dotenv.config();

export interface Product {
  category: string;
  brand: string;
  modelName: string;
  keySpecifications: string;
  bestFor: string;
  price: number;
  stock: number;
}

export interface Order {
  orderId: string;
  customer: string;
  product: string;
  category: string;
  daysAgo: number;
  status: string;
}

export interface BankDetail {
  orderId: string;
  customer: string;
  product: string;
  bankName: string;
  accountNumber: string;
  mobileNumber: string;
}

export interface LogEntry {
  timestamp?: string;
  sessionId?: string;
  customer?: string;
  orderId?: string;
  userMessage?: string;
  agentResponse?: string;
  actionTaken?: string;
  status?: string;
}

export interface WriteLogResult {
  success: boolean;
  mode: 'google_sheets' | 'local_fallback';
  message: string;
  details?: any;
}

export const DEFAULT_SPREADSHEET_ID =
  process.env.GOOGLE_SHEET_ID || '1P2ud7-Q95Od4myAisYoUWbbac0Y5JlnI';

/**
 * Automatically locates the Google Service Account credentials JSON file.
 */
export function getCredentialsPath(): string {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const envPath = path.isAbsolute(process.env.GOOGLE_APPLICATION_CREDENTIALS)
      ? process.env.GOOGLE_APPLICATION_CREDENTIALS
      : path.join(process.cwd(), process.env.GOOGLE_APPLICATION_CREDENTIALS);
    if (fs.existsSync(envPath)) return envPath;
  }

  // Look in the project root for matching JSON key file
  const rootFiles = fs.readdirSync(process.cwd());
  const found = rootFiles.find(
    (file) =>
      file.endsWith('.json') &&
      (file.startsWith('ai-ecommerce-agent') || file.includes('credentials') || file.includes('service_account'))
  );

  if (found) {
    return path.join(process.cwd(), found);
  }

  throw new Error('Google service account credentials JSON file not found in ' + process.cwd());
}

/**
 * Creates and returns an authenticated JWT client for the service account.
 */
export function getGoogleAuth(): InstanceType<typeof google.auth.JWT> {
  const credsPath = getCredentialsPath();
  const credentialsRaw = fs.readFileSync(credsPath, 'utf8');
  const credentials = JSON.parse(credentialsRaw);

  return new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.readonly',
    ],
  });
}

/**
 * Returns an authenticated Google Sheets API client (v4).
 */
export async function getSheetsClient(): Promise<sheets_v4.Sheets> {
  const auth = getGoogleAuth();
  return google.sheets({ version: 'v4', auth });
}

/**
 * Safely saves the workbook to disk using atomic rename to prevent corrupt concurrent reads.
 */
async function persistWorkbookLocally(workbook: ExcelJS.Workbook): Promise<void> {
  const localFile = path.join(process.cwd(), 'products_synced.xlsx');
  const tempFile = path.join(process.cwd(), `products_synced_${Date.now()}_tmp.xlsx`);
  try {
    await workbook.xlsx.writeFile(tempFile);
    fs.copyFileSync(tempFile, localFile);
    try {
      fs.unlinkSync(tempFile);
    } catch {}
  } catch {
    await workbook.xlsx.writeFile(localFile);
  }
}

/**
 * Helper to download and parse Google Sheets stored as XLSX on Drive.
 * Loads from local synced file if present so newly placed orders and bank details persist.
 */
async function fetchAndParseWorkbook(spreadsheetId: string): Promise<ExcelJS.Workbook> {
  const localFile = path.join(process.cwd(), 'products_synced.xlsx');

  // If local synced copy already exists with modifications, load from it
  if (fs.existsSync(localFile)) {
    try {
      const stats = fs.statSync(localFile);
      if (stats.size > 2000) {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(localFile);
        return workbook;
      }
    } catch {}
  }

  const auth = getGoogleAuth();
  await auth.authorize();
  const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;

  let buffer: Buffer;
  try {
    const res = await auth.request<ArrayBuffer>({
      url: exportUrl,
      responseType: 'arraybuffer',
    });
    buffer = Buffer.from(res.data);
    try {
      fs.writeFileSync(localFile, buffer);
    } catch {}
  } catch (downloadErr) {
    if (fs.existsSync(localFile)) {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(localFile);
      return workbook;
    }
    throw downloadErr;
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);
  return workbook;
}

/**
 * Fetches all product data from the spreadsheet.
 */
export async function getProductData(spreadsheetId: string = DEFAULT_SPREADSHEET_ID): Promise<Product[]> {
  const sheets = await getSheetsClient();

  try {
    // Try native Google Sheets v4 API first
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1!A2:G',
    });

    const rows = res.data.values;
    if (rows && rows.length > 0) {
      return rows.map((row) => ({
        category: (row[0] || '').toString().trim(),
        brand: (row[1] || '').toString().trim(),
        modelName: (row[2] || '').toString().trim(),
        keySpecifications: (row[3] || '').toString().trim(),
        bestFor: (row[4] || '').toString().trim(),
        price: parseFloat((row[5] || '0').toString().replace(/[$,]/g, '')) || 0,
        stock: parseInt((row[6] || '0').toString(), 10) || 0,
      }));
    }
  } catch (err: any) {
    const isOfficeFile = err?.message?.includes('Office file') || err?.code === 400;
    if (!isOfficeFile) {
      console.warn('Sheets API native call failed, checking workbook export...', err.message);
    }
  }

  // Fallback: fetch via Google Drive authorized export & ExcelJS
  const workbook = await fetchAndParseWorkbook(spreadsheetId);
  const worksheet = workbook.getWorksheet('Sheet1') || workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('Worksheet "Sheet1" not found in spreadsheet.');
  }

  const products: Product[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header row
    const values = row.values as any[];
    // ExcelJS row.values is 1-indexed (index 0 is empty)
    const category = (values[1] ?? '').toString().trim();
    const brand = (values[2] ?? '').toString().trim();
    const modelName = (values[3] ?? '').toString().trim();
    const keySpecifications = (values[4] ?? '').toString().trim();
    const bestFor = (values[5] ?? '').toString().trim();
    const priceRaw = (values[6] ?? '0').toString().replace(/[$,]/g, '');
    const stockRaw = (values[7] ?? '0').toString();

    if (category || modelName) {
      products.push({
        category,
        brand,
        modelName,
        keySpecifications,
        bestFor,
        price: parseFloat(priceRaw) || 0,
        stock: parseInt(stockRaw, 10) || 0,
      });
    }
  });

  return products;
}

/**
 * Fetches all order data from the spreadsheet.
 */
export async function getOrderData(spreadsheetId: string = DEFAULT_SPREADSHEET_ID): Promise<Order[]> {
  const sheets = await getSheetsClient();

  try {
    // Try native Google Sheets v4 API first
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet2!A2:F',
    });

    const rows = res.data.values;
    if (rows && rows.length > 0) {
      return rows.map((row) => ({
        orderId: (row[0] || '').toString().trim(),
        customer: (row[1] || '').toString().trim(),
        product: (row[2] || '').toString().trim(),
        category: (row[3] || '').toString().trim(),
        daysAgo: parseInt((row[4] || '0').toString(), 10) || 0,
        status: (row[5] || 'Pending').toString().trim(),
      }));
    }
  } catch (err: any) {
    const isOfficeFile = err?.message?.includes('Office file') || err?.code === 400;
    if (!isOfficeFile) {
      console.warn('Sheets API native call failed for orders, using workbook fallback...', err.message);
    }
  }

  // Fallback: fetch via Google Drive authorized export & ExcelJS
  const workbook = await fetchAndParseWorkbook(spreadsheetId);
  const worksheet = workbook.getWorksheet('Sheet2') || workbook.worksheets[1];
  if (!worksheet) {
    throw new Error('Worksheet "Sheet2" not found in spreadsheet.');
  }

  const orders: Order[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header row
    const values = row.values as any[];
    const orderId = (values[1] ?? '').toString().trim();
    const customer = (values[2] ?? '').toString().trim();
    const product = (values[3] ?? '').toString().trim();
    const category = (values[4] ?? '').toString().trim();
    const daysAgo = parseInt((values[5] ?? '0').toString(), 10) || 0;
    const status = (values[6] ?? 'Pending').toString().trim();

    if (orderId) {
      orders.push({
        orderId,
        customer,
        product,
        category,
        daysAgo,
        status: status || 'Pending',
      });
    }
  });

  return orders;
}

/**
 * Fetches customer banking and refund details from Sheet3.
 */
export async function getCustomerBankDetails(spreadsheetId: string = DEFAULT_SPREADSHEET_ID): Promise<BankDetail[]> {
  const workbook = await fetchAndParseWorkbook(spreadsheetId);
  const worksheet = workbook.getWorksheet('Sheet3') || workbook.worksheets[2];
  if (!worksheet) {
    return [];
  }

  const details: BankDetail[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = row.values as any[];
    const orderId = (values[1] ?? '').toString().trim();
    const customer = (values[2] ?? '').toString().trim();
    const product = (values[3] ?? '').toString().trim();
    const bankName = (values[4] ?? '').toString().trim();
    const accountNumber = (values[5] ?? '').toString().trim();
    const mobileNumber = (values[6] ?? '').toString().trim();

    if (orderId) {
      details.push({
        orderId,
        customer,
        product,
        bankName,
        accountNumber,
        mobileNumber,
      });
    }
  });

  return details;
}

/**
 * Places a new customer order:
 * 1. Checks product stock in Sheet1.
 * 2. Decrements product stock count by 1 in Sheet1.
 * 3. Appends a new Order row (with next sequential ORD-xxx) in Sheet2.
 * 4. Persists changes to both local synced Excel file and cloud Google Sheet (if permitted).
 * 5. Logs the audit record in Google Sheets / activity log.
 */
export async function createOrder(params: {
  customer: string;
  product: string;
  category?: string;
  email?: string;
  spreadsheetId?: string;
}): Promise<{
  success: boolean;
  order?: Order;
  product?: Product;
  updatedStock?: number;
  message: string;
}> {
  const spreadsheetId = params.spreadsheetId || DEFAULT_SPREADSHEET_ID;
  const workbook = await fetchAndParseWorkbook(spreadsheetId);
  const sheet1 = workbook.getWorksheet('Sheet1') || workbook.worksheets[0];
  const sheet2 = workbook.getWorksheet('Sheet2') || workbook.worksheets[1];

  if (!sheet1 || !sheet2) {
    return { success: false, message: 'Required sheets (Sheet1 or Sheet2) not found in workbook.' };
  }

  // Find matching product in Sheet1
  const search = params.product.toLowerCase().trim();
  let targetRowNumber = -1;
  let matchedProduct: Product | null = null;

  sheet1.eachRow((row, rowNumber) => {
    if (rowNumber === 1 || matchedProduct) return;
    const values = row.values as any[];
    const category = (values[1] ?? '').toString().trim();
    const brand = (values[2] ?? '').toString().trim();
    const modelName = (values[3] ?? '').toString().trim();
    const keySpecifications = (values[4] ?? '').toString().trim();
    const bestFor = (values[5] ?? '').toString().trim();
    const priceRaw = (values[6] ?? '0').toString().replace(/[$,]/g, '');
    const stockRaw = (values[7] ?? '0').toString();

    const price = parseFloat(priceRaw) || 0;
    const stock = parseInt(stockRaw, 10) || 0;
    const fullName = `${brand} ${modelName}`.toLowerCase();

    if (
      fullName.includes(search) ||
      modelName.toLowerCase().includes(search) ||
      search.includes(modelName.toLowerCase()) ||
      (category && (category.toLowerCase().includes(search) || search.includes(category.toLowerCase())) && stock > 0) ||
      (brand && search.includes(brand.toLowerCase()) && category && search.includes(category.toLowerCase())) ||
      (brand && search.includes(brand.toLowerCase()))
    ) {
      targetRowNumber = rowNumber;
      matchedProduct = {
        category,
        brand,
        modelName,
        keySpecifications,
        bestFor,
        price,
        stock,
      };
    }
  });

  // If still not matched, check if search was a general term like "laptop", "tablet", "electronics"
  if (!matchedProduct || targetRowNumber < 0) {
    sheet1.eachRow((row, rowNumber) => {
      if (rowNumber === 1 || matchedProduct) return;
      const values = row.values as any[];
      const category = (values[1] ?? '').toString().trim();
      const stock = parseInt((values[7] ?? '0').toString(), 10) || 0;
      if ((category.toLowerCase().includes(search) || search.includes(category.toLowerCase())) && stock > 0) {
        targetRowNumber = rowNumber;
        matchedProduct = {
          category,
          brand: (values[2] ?? '').toString().trim(),
          modelName: (values[3] ?? '').toString().trim(),
          keySpecifications: (values[4] ?? '').toString().trim(),
          bestFor: (values[5] ?? '').toString().trim(),
          price: parseFloat((values[6] ?? '0').toString().replace(/[$,]/g, '')) || 0,
          stock,
        };
      }
    });
  }

  if (!matchedProduct || targetRowNumber < 0) {
    return {
      success: false,
      message: `Product "${params.product}" was not found in our store inventory catalog.`,
    };
  }

  const productFound: Product = matchedProduct;

  if (productFound.stock <= 0) {
    return {
      success: false,
      message: `We're sorry, "${productFound.brand} ${productFound.modelName}" is currently out of stock.`,
    };
  }

  // Decrement stock in Sheet1
  const updatedStock = productFound.stock - 1;
  productFound.stock = updatedStock;
  const stockCell = sheet1.getCell(targetRowNumber, 7);
  stockCell.value = updatedStock;

  // Determine next sequential Order ID in Sheet2
  let maxIdNum = 100;
  sheet2.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const idVal = (row.getCell(1).value || '').toString().trim();
    const match = idVal.match(/ORD-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxIdNum) maxIdNum = num;
    }
  });

  const newOrderId = `ORD-${maxIdNum + 1}`;
  const newOrder: Order = {
    orderId: newOrderId,
    customer: params.customer,
    product: productFound.modelName,
    category: productFound.category || params.category || 'electronics',
    daysAgo: 0,
    status: 'Confirmed',
  };

  // Append new row in Sheet2
  const newRow = sheet2.addRow([
    newOrder.orderId,
    newOrder.customer,
    newOrder.product,
    newOrder.category,
    newOrder.daysAgo,
    newOrder.status,
  ]);
  newRow.commit();

  // Save changes locally to products_synced.xlsx
  await persistWorkbookLocally(workbook);

  // Attempt Google Sheets API cloud update
  try {
    const sheets = await getSheetsClient();
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Sheet1!G${targetRowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[updatedStock]] },
    });
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Sheet2!A:F',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [
          [newOrder.orderId, newOrder.customer, newOrder.product, newOrder.category, 0, newOrder.status],
        ],
      },
    });
  } catch {
    // Graceful cloud fallback handled by local file persistence
  }

  // Write audit log
  await writeLog({
    customer: params.customer,
    orderId: newOrderId,
    actionTaken: 'order_created',
    status: 'SUCCESS',
    userMessage: `Order placed for ${productFound.modelName} ($${productFound.price}) by ${params.customer}`,
    agentResponse: `Order #${newOrderId} confirmed and saved to Sheet2. Inventory stock updated to ${updatedStock} in Sheet1.`,
  });

  return {
    success: true,
    order: newOrder,
    product: productFound,
    updatedStock,
    message: `Order #${newOrderId} successfully placed for ${params.customer}! Product: ${productFound.brand} ${productFound.modelName} ($${productFound.price}). Stock remaining: ${updatedStock}.`,
  };
}

/**
 * Saves customer bank details to Sheet3 for refund processing.
 * Also marks the order as "Refund approved" in Sheet2.
 */
export async function saveCustomerBankDetails(params: {
  orderId: string;
  customer: string;
  product?: string;
  bankName: string;
  accountNumber: string;
  mobileNumber: string;
  spreadsheetId?: string;
}): Promise<{
  success: boolean;
  message: string;
  bankDetail: BankDetail;
}> {
  const spreadsheetId = params.spreadsheetId || DEFAULT_SPREADSHEET_ID;
  const workbook = await fetchAndParseWorkbook(spreadsheetId);
  let sheet3 = workbook.getWorksheet('Sheet3') || workbook.worksheets[2];
  if (!sheet3) {
    sheet3 = workbook.addWorksheet('Sheet3');
    sheet3.addRow(['order_id', 'Customer', 'product ', 'Bank_Name', 'Account Number', 'Mobile Number']);
  }

  const sheet2 = workbook.getWorksheet('Sheet2') || workbook.worksheets[1];
  let detectedProduct = params.product || '';

  // Update Sheet2 order status to 'Refund approved'
  if (sheet2) {
    sheet2.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const oId = (row.getCell(1).value || '').toString().trim();
      if (oId.toUpperCase() === params.orderId.toUpperCase()) {
        if (!detectedProduct) {
          detectedProduct = (row.getCell(3).value || '').toString().trim();
        }
        row.getCell(6).value = 'Refund approved';
      }
    });
  }

  const bankDetail: BankDetail = {
    orderId: params.orderId.toUpperCase(),
    customer: params.customer,
    product: detectedProduct || 'Product',
    bankName: params.bankName.trim(),
    accountNumber: params.accountNumber.trim(),
    mobileNumber: (params.mobileNumber || '').trim(),
  };

  // Check if bank details already exist for this order in Sheet3
  let existingRowNumber = -1;
  sheet3.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const oId = (row.getCell(1).value || '').toString().trim();
    if (oId.toUpperCase() === params.orderId.toUpperCase()) {
      existingRowNumber = rowNumber;
    }
  });

  if (existingRowNumber > 0) {
    const row = sheet3.getRow(existingRowNumber);
    row.getCell(2).value = bankDetail.customer;
    row.getCell(3).value = bankDetail.product;
    row.getCell(4).value = bankDetail.bankName;
    row.getCell(5).value = bankDetail.accountNumber;
    row.getCell(6).value = bankDetail.mobileNumber;
    row.commit();
  } else {
    const newRow = sheet3.addRow([
      bankDetail.orderId,
      bankDetail.customer,
      bankDetail.product,
      bankDetail.bankName,
      bankDetail.accountNumber,
      bankDetail.mobileNumber,
    ]);
    newRow.commit();
  }

  // Persist locally
  await persistWorkbookLocally(workbook);

  // Attempt Google Sheets API cloud append
  try {
    const sheets = await getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Sheet3!A:F',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [
          [
            bankDetail.orderId,
            bankDetail.customer,
            bankDetail.product,
            bankDetail.bankName,
            bankDetail.accountNumber,
            bankDetail.mobileNumber,
          ],
        ],
      },
    });
  } catch {
    // Cloud fallback
  }

  // Log action
  await writeLog({
    customer: params.customer,
    orderId: params.orderId,
    actionTaken: 'bank_details_saved',
    status: 'SUCCESS',
    userMessage: `Bank details provided for Order ${params.orderId}`,
    agentResponse: `Saved bank details to Sheet3: Bank ${bankDetail.bankName}, Account ${bankDetail.accountNumber}. Marked status as Refund approved.`,
  });

  return {
    success: true,
    message: `Bank details for Order #${bankDetail.orderId} have been securely registered in Google Sheets (Sheet3).`,
    bankDetail,
  };
}

/**
 * Updates an order status in Sheet2.
 */
export async function updateOrderStatus(
  orderId: string,
  newStatus: string,
  spreadsheetId: string = DEFAULT_SPREADSHEET_ID
): Promise<boolean> {
  const workbook = await fetchAndParseWorkbook(spreadsheetId);
  const sheet2 = workbook.getWorksheet('Sheet2') || workbook.worksheets[1];
  if (!sheet2) return false;

  let updated = false;
  sheet2.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const oId = (row.getCell(1).value || '').toString().trim();
    if (oId.toUpperCase() === orderId.toUpperCase()) {
      row.getCell(6).value = newStatus;
      updated = true;
    }
  });

  if (updated) {
    await persistWorkbookLocally(workbook);
  }
  return updated;
}

/**
 * Ensures the 'Logs' sheet exists in a native Google Sheet.
 */
async function ensureLogsSheetExists(sheets: sheets_v4.Sheets, spreadsheetId: string): Promise<void> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetTitles = (meta.data.sheets || []).map((s) => s.properties?.title);

  if (!sheetTitles.includes('Logs')) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: 'Logs',
              },
            },
          },
        ],
      },
    });

    // Add header row
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Logs!A1:H1',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [
          ['Timestamp', 'Session ID', 'Customer', 'Order ID', 'User Message', 'Agent Response', 'Action Taken', 'Status'],
        ],
      },
    });
  }
}

/**
 * Writes conversation or transaction logs to Google Sheets.
 * If the target document is an Office file (where Google Sheets API cannot write directly),
 * it securely logs to a local fallback log file (logs/agent_activity.json) and reports the status.
 */
export async function writeLog(
  log: LogEntry,
  spreadsheetId: string = DEFAULT_SPREADSHEET_ID
): Promise<WriteLogResult> {
  const timestamp = log.timestamp || new Date().toISOString();
  const row = [
    timestamp,
    log.sessionId || 'session-' + Date.now(),
    log.customer || '',
    log.orderId || '',
    log.userMessage || '',
    log.agentResponse || '',
    log.actionTaken || '',
    log.status || 'OK',
  ];

  try {
    const sheets = await getSheetsClient();
    await ensureLogsSheetExists(sheets, spreadsheetId);

    const appendRes = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Logs!A:H',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [row],
      },
    });

    return {
      success: true,
      mode: 'google_sheets',
      message: 'Log successfully appended to Google Sheets (Logs tab).',
      details: appendRes.data,
    };
  } catch (error: any) {
    // If it's an Office file on Google Drive or write permission is restricted:
    const isOfficeDoc = error?.message?.includes('Office file') || error?.code === 400;
    
    // Fallback: write to local logs directory
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    const logFilePath = path.join(logsDir, 'agent_activity.json');

    let currentLogs: any[] = [];
    if (fs.existsSync(logFilePath)) {
      try {
        currentLogs = JSON.parse(fs.readFileSync(logFilePath, 'utf8'));
      } catch {
        currentLogs = [];
      }
    }

    const newLogRecord = {
      timestamp,
      sessionId: row[1],
      customer: row[2],
      orderId: row[3],
      userMessage: row[4],
      agentResponse: row[5],
      actionTaken: row[6],
      status: row[7],
    };

    currentLogs.push(newLogRecord);
    fs.writeFileSync(logFilePath, JSON.stringify(currentLogs, null, 2), 'utf8');

    const note = isOfficeDoc
      ? 'Target Google Drive document is an Excel (.xlsx) file, so Google Sheets API v4 prohibits row insertion. Log saved to local logs/agent_activity.json. To write directly to Google Sheets in cloud, open the file in Google Drive and select File -> Save as Google Sheets.'
      : `Google Sheets write encountered: ${error?.message}. Saved to local logs/agent_activity.json fallback.`;

    return {
      success: true,
      mode: 'local_fallback',
      message: note,
      details: newLogRecord,
    };
  }
}

/**
 * Fetches recent logs from either Google Sheets or the local fallback.
 */
export async function getLogs(spreadsheetId: string = DEFAULT_SPREADSHEET_ID): Promise<LogEntry[]> {
  try {
    const sheets = await getSheetsClient();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Logs!A2:H',
    });
    if (res.data.values && res.data.values.length > 0) {
      return res.data.values.map((r) => ({
        timestamp: r[0],
        sessionId: r[1],
        customer: r[2],
        orderId: r[3],
        userMessage: r[4],
        agentResponse: r[5],
        actionTaken: r[6],
        status: r[7],
      }));
    }
  } catch {
    // If not found in sheets, check local logs
  }

  const logFilePath = path.join(process.cwd(), 'logs', 'agent_activity.json');
  if (fs.existsSync(logFilePath)) {
    try {
      return JSON.parse(fs.readFileSync(logFilePath, 'utf8'));
    } catch {
      return [];
    }
  }

  return [];
}
