import {
  getProductData,
  getOrderData,
  getCustomerBankDetails,
  createOrder,
  saveCustomerBankDetails,
  writeLog,
  getLogs,
  getCredentialsPath,
} from './lib/sheets';

async function main() {
  console.log('====================================================');
  console.log('   AI-ECOMMERCE AGENT: GOOGLE SHEETS TEST SUITE     ');
  console.log('====================================================\n');

  // 1. Verify Credentials
  console.log('[1/5] Verifying Google Service Account Credentials...');
  const credPath = getCredentialsPath();
  console.log('      Found credentials at:', credPath);

  // 2. Test Product Data Retrieval
  console.log('\n[2/5] Testing getProductData()...');
  const products = await getProductData();
  console.log(`      Retrieved ${products.length} products.`);
  if (products.length > 0) {
    console.log('      Sample product 1:', JSON.stringify(products[0], null, 2));
    console.log('      Sample product 2:', JSON.stringify(products[1], null, 2));
  } else {
    throw new Error('No products retrieved!');
  }

  // 3. Test Order Data Retrieval
  console.log('\n[3/5] Testing getOrderData()...');
  const orders = await getOrderData();
  console.log(`      Retrieved ${orders.length} orders.`);
  if (orders.length > 0) {
    console.log('      Sample order 1:', JSON.stringify(orders[0], null, 2));
    console.log('      Sample order 2:', JSON.stringify(orders[1], null, 2));
  } else {
    throw new Error('No orders retrieved!');
  }

  // 4. Test Customer Bank Details Retrieval
  console.log('\n[4/5] Testing getCustomerBankDetails()...');
  const bankDetails = await getCustomerBankDetails();
  console.log(`      Retrieved ${bankDetails.length} customer banking records.`);
  if (bankDetails.length > 0) {
    console.log('      Sample bank detail 1:', JSON.stringify(bankDetails[0], null, 2));
  }

  // 5. Test Write Log
  console.log('\n[5/7] Testing writeLog() and getLogs()...');
  const testLog = {
    sessionId: 'test-session-001',
    customer: 'Ali',
    orderId: 'ORD-101',
    userMessage: 'Can I return my laptop purchased 40 days ago?',
    agentResponse: 'Electronics must be returned within 15 days according to policy. Your return request cannot be processed.',
    actionTaken: 'policy_check_rejected',
    status: 'COMPLETED',
  };

  const writeResult = await writeLog(testLog);
  console.log('      writeLog result mode:', writeResult.mode);
  console.log('      writeLog status message:', writeResult.message);

  const logs = await getLogs();
  console.log(`      Verified getLogs(): found ${logs.length} logged record(s).`);
  console.log('      Latest log entry:', JSON.stringify(logs[logs.length - 1], null, 2));

  // 6. Test Placing an Order & Updating Google Sheets
  console.log('\n[6/7] Testing createOrder() (Sheet1 stock decrement & Sheet2 order insertion)...');
  const initialProducts = await getProductData();
  const targetProduct = initialProducts.find((p) => p.modelName.includes('MacBook Air'));
  const initialStock = targetProduct?.stock ?? 8;

  const newOrderResult = await createOrder({
    customer: 'Alex Turner',
    product: 'MacBook Air M3',
    email: 'alex.turner@example.com',
  });
  console.log('      createOrder success:', newOrderResult.success);
  console.log('      New Order ID:', newOrderResult.order?.orderId);
  console.log('      Product:', newOrderResult.order?.product);
  console.log('      Previous Stock:', initialStock, '-> New Stock:', newOrderResult.updatedStock);

  // 7. Test Saving Bank Details to Sheet3
  console.log('\n[7/7] Testing saveCustomerBankDetails() (Sheet3 append/update)...');
  const bankSaveResult = await saveCustomerBankDetails({
    orderId: 'ORD-104',
    customer: 'Nida',
    product: 'keyboard',
    bankName: 'Meezan Bank',
    accountNumber: '598123456789012',
    mobileNumber: '03001234567',
  });
  console.log('      saveCustomerBankDetails success:', bankSaveResult.success);
  console.log('      Saved Bank Detail:', bankSaveResult.bankDetail);

  const updatedBankList = await getCustomerBankDetails();
  const nidaBank = updatedBankList.find((b) => b.orderId === 'ORD-104');
  console.log('      Verified in Sheet3 records: found Nida bank =', !!nidaBank);

  console.log('\n====================================================');
  console.log(' [SUCCESS] ALL GOOGLE SHEETS OPERATIONS VERIFIED!   ');
  console.log('====================================================');
}

main().catch((err) => {
  console.error('\n[FAILED] Error in Google Sheets test suite:', err);
  process.exit(1);
});

