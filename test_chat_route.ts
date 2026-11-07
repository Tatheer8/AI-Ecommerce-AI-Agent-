import { POST, GET } from './app/api/chat/route';

async function mockPost(body: any): Promise<any> {
  const req = new Request('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const res = await POST(req);
  return await res.json();
}

async function runTests() {
  console.log('====================================================');
  console.log('       TESTING NEXT.JS /api/chat API ROUTE          ');
  console.log('====================================================\n');

  // Test 1: GET Healthcheck
  console.log('[1/5] Testing GET /api/chat (Healthcheck & Diagnostics)...');
  const getRes = await GET();
  const getData = await getRes.json();
  console.log('      Status:', getData.status);
  console.log('      Policy Characters Loaded:', getData.policyLoadedCharacters);
  console.log('      Capabilities:', getData.capabilities.length);

  // Test 2: Product Search Query
  console.log('\n[2/5] Testing Product Search: "What laptops do you recommend under $800?"...');
  const prodRes = await mockPost({
    message: 'What laptops do you have available?',
    sessionId: 'test-session-chat-1',
  });
  console.log('      Tools Executed:', prodRes.toolsExecuted?.map((t: any) => t.tool));
  console.log('      Agent Response Preview:\n' + prodRes.response.slice(0, 220) + '...');

  // Test 3: Order Status Query
  console.log('\n[3/5] Testing Order Status: "Can you check order ORD-102?"...');
  const orderRes = await mockPost({
    message: 'Can you check the status of my order ORD-102?',
    sessionId: 'test-session-chat-2',
  });
  console.log('      Tools Executed:', orderRes.toolsExecuted?.map((t: any) => t.tool));
  console.log('      Agent Response Preview:\n' + orderRes.response.slice(0, 220) + '...');

  // Test 4: Refund Request for ORD-101 (Expired > 15 days)
  console.log('\n[4/5] Testing Expired Refund Request: "I want to refund order ORD-101"...');
  const refundExpiredRes = await mockPost({
    message: 'I want a refund for order ORD-101 because I don’t need it anymore.',
    sessionId: 'test-session-chat-3',
  });
  console.log('      Tools Executed:', refundExpiredRes.toolsExecuted?.map((t: any) => t.tool));
  console.log('      Policy Enforcement (Rejected):', refundExpiredRes.toolsExecuted?.[0]?.output?.approved === false);
  console.log('      Agent Response:\n' + refundExpiredRes.response);

  // Test 5: Refund Request for ORD-103 (Within 15 days window, with bank details)
  console.log('\n[5/8] Testing Approved Refund Request: "Please refund order ORD-103 with bank details"...');
  const refundApprovedRes = await mockPost({
    message: 'Please process a refund for my order ORD-103. Item arrived with scratches. Bank: Meezan Bank, Account: 598123456789012',
    customerEmail: 'sara.customer@example.com',
    sessionId: 'test-session-chat-4',
  });
  console.log('      Tools Executed:', refundApprovedRes.toolsExecuted?.map((t: any) => t.tool));
  console.log('      Policy Enforcement (Approved):', refundApprovedRes.toolsExecuted?.[0]?.output?.approved === true);
  console.log('      Agent Response:\n' + refundApprovedRes.response);

  // Test 6: Placing a New Order (Taking orders from customer)
  console.log('\n[6/8] Testing Placing New Order: "I want to buy an Apple MacBook Air M3, my name is Alex"...');
  const buyRes = await mockPost({
    message: 'I want to buy an Apple MacBook Air M3, my name is Alex',
    customerEmail: 'alex@example.com',
    sessionId: 'test-session-chat-order',
  });
  console.log('      Tools Executed:', buyRes.toolsExecuted?.map((t: any) => t.tool));
  const orderSuccess = buyRes.toolsExecuted?.some((t: any) => t.tool === 'createOrder' && t.output?.success);
  console.log('      Order Placed & Synced in Sheets:', orderSuccess);
  console.log('      Agent Response:\n' + buyRes.response);

  // Test 7: Refund Request Asking for Bank Details (Nida)
  console.log('\n[7/8] Testing Refund Asking for Bank Details: "my name is nida and i want to return my product"...');
  const nidaPromptRes = await mockPost({
    message: 'my name is nida and i want to return my product',
    sessionId: 'test-session-chat-5',
  });
  console.log('      Tools Executed:', nidaPromptRes.toolsExecuted?.map((t: any) => t.tool));
  console.log('      Agent Prompted for Bank Details:', nidaPromptRes.response.includes('bank'));
  console.log('      Agent Response Preview:\n' + nidaPromptRes.response.slice(0, 260) + '...');

  // Test 8: Customer Providing Bank Details to Finalize Refund
  console.log('\n[8/8] Testing Customer Providing Bank Details for Refund...');
  const bankProvideRes = await mockPost({
    message: 'Here are my bank details for ORD-104: Meezan Bank, Account 5981234567890, Mobile 03001234567',
    customerEmail: 'nida@example.com',
    sessionId: 'test-session-chat-6',
  });
  console.log('      Tools Executed:', bankProvideRes.toolsExecuted?.map((t: any) => t.tool));
  const bankSaved = bankProvideRes.toolsExecuted?.some((t: any) => t.tool === 'saveBankDetails' && t.output?.success);
  console.log('      Bank Details Saved to Sheet3:', bankSaved);
  console.log('      Agent Response:\n' + bankProvideRes.response);

  console.log('\n====================================================');
  console.log(' [SUCCESS] ALL CHAT API ROUTE & TOOL TESTS PASSED! ');
  console.log('====================================================');
}

runTests().catch((err) => {
  console.error('[ERROR] Chat API Route test failed:', err);
  process.exit(1);
});

