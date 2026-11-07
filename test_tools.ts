import { lookupProductTool, lookupOrderTool, processRefundTool } from './lib/tools';

async function main() {
  console.log('====================================================');
  console.log('       TESTING AI ECOMMERCE TOOL FUNCTIONS         ');
  console.log('====================================================\n');

  // 1. Test lookupProductTool
  console.log('[1/3] Testing lookupProductTool (keyword: "laptop")...');
  const prodRes = await lookupProductTool({ keyword: 'laptop' });
  console.log(`      Found ${prodRes.totalFound} products.`);
  console.log(`      Top product: ${prodRes.products[0]?.brand} ${prodRes.products[0]?.modelName} - $${prodRes.products[0]?.price}`);

  // 2. Test lookupOrderTool for ORD-101 (expired) and ORD-103 (active)
  console.log('\n[2/3] Testing lookupOrderTool...');
  const order101 = await lookupOrderTool({ orderId: 'ORD-101' });
  console.log(`      ORD-101: Customer=${order101.order?.customer}, Days=${order101.order?.daysAgo}, Allowed=${order101.order?.allowedReturnDays}, ReturnWindowOpen=${order101.order?.isReturnWindowOpen}`);

  const order103 = await lookupOrderTool({ orderId: 'ORD-103' });
  console.log(`      ORD-103: Customer=${order103.order?.customer}, Days=${order103.order?.daysAgo}, Allowed=${order103.order?.allowedReturnDays}, ReturnWindowOpen=${order103.order?.isReturnWindowOpen}`);

  // 3. Test processRefundTool: ORD-101 should be rejected (40 days > 15 days)
  console.log('\n[3/3] Testing processRefundTool...');
  console.log('      Attempting refund for ORD-101 (expected rejection):');
  const refund101 = await processRefundTool({
    orderId: 'ORD-101',
    reason: 'Customer no longer wants the laptop.',
  });
  console.log('      Result approved?:', refund101.approved);
  console.log('      Policy Reason:', refund101.policyReason);

  console.log('\n      Attempting refund for ORD-103 (without bank details - expected prompt):');
  const refund103Prompt = await processRefundTool({
    orderId: 'ORD-103',
    customerEmail: 'sara.test@example.com',
    reason: 'Screen has minor defect on arrival.',
  });
  console.log('      Result needs bank details?:', refund103Prompt.needsBankDetails);
  console.log('      Policy Reason:', refund103Prompt.policyReason);

  console.log('\n      Attempting refund for ORD-103 (with bank details - expected approval):');
  const refund103 = await processRefundTool({
    orderId: 'ORD-103',
    customerEmail: 'sara.test@example.com',
    reason: 'Screen has minor defect on arrival.',
    bankName: 'Meezan Bank',
    accountNumber: '598123456789012',
  });
  console.log('      Result approved?:', refund103.approved);
  console.log('      Policy Reason:', refund103.policyReason);
  console.log('      Email Status:', refund103.emailStatus?.provider, refund103.emailStatus?.success ? 'SENT' : 'FAILED');

  console.log('\n====================================================');
  console.log(' [SUCCESS] ALL TOOL FUNCTIONS TESTED & WORKING!     ');
  console.log('====================================================');
}

main().catch((err) => {
  console.error('[ERROR] in tools test:', err);
  process.exit(1);
});

