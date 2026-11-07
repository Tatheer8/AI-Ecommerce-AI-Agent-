import { getPolicyText, getPolicyHtml, getParsedPolicy, resolvePolicyPath } from './lib/policy';

async function main() {
  console.log('--- Resolved Policy Path ---');
  const resolved = resolvePolicyPath();
  console.log('Path:', resolved);

  console.log('\n--- Testing getPolicyText() ---');
  const text = await getPolicyText();
  console.log('Policy text length:', text.length);
  console.log('Policy preview (first 180 chars):\n' + text.slice(0, 180));

  console.log('\n--- Testing getParsedPolicy() ---');
  const parsed = await getParsedPolicy();
  console.log('Detected section keys:', Object.keys(parsed.sections));
  console.log('Return Policy sample:', parsed.sections['RETURN POLICY']);

  console.log('\n--- Testing getPolicyHtml() ---');
  const html = await getPolicyHtml();
  console.log('HTML snippet:\n' + html.slice(0, 150));
  
  console.log('\n[SUCCESS] lib/policy.ts tests passed successfully!');
}

main().catch((err) => {
  console.error('[ERROR] in policy test:', err);
  process.exit(1);
});

