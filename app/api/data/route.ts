import { NextResponse } from 'next/server';
import {
  getProductData,
  getOrderData,
  getCustomerBankDetails,
  DEFAULT_SPREADSHEET_ID,
} from '@/lib/sheets';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [products, orders, bankDetails] = await Promise.all([
      getProductData().catch(() => []),
      getOrderData().catch(() => []),
      getCustomerBankDetails().catch(() => []),
    ]);

    // Read local audit activity logs
    let logs: any[] = [];
    const logFilePath = path.join(process.cwd(), 'logs', 'agent_activity.json');
    if (fs.existsSync(logFilePath)) {
      try {
        logs = JSON.parse(fs.readFileSync(logFilePath, 'utf8'));
      } catch {
        logs = [];
      }
    }

    return NextResponse.json({
      success: true,
      spreadsheetId: DEFAULT_SPREADSHEET_ID,
      counts: {
        products: products.length,
        orders: orders.length,
        bankDetails: bankDetails.length,
        logs: logs.length,
      },
      products,
      orders,
      bankDetails,
      logs: logs.slice(-20).reverse(), // latest 20 logs
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching sheet data:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch data' },
      { status: 500 }
    );
  }
}
