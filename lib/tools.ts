import {
  getProductData,
  getOrderData,
  getCustomerBankDetails,
  createOrder,
  saveCustomerBankDetails,
  updateOrderStatus,
  writeLog,
  Product,
  Order,
  BankDetail,
} from './sheets';
import {
  sendRefundConfirmationEmail,
  sendOrderConfirmationEmail,
  SendEmailResult,
} from './email';

/**
 * Tool: Look up products by keyword, category, or brand.
 */
export async function lookupProductTool(params: {
  keyword?: string;
  category?: string;
  brand?: string;
  maxPrice?: number;
}): Promise<{
  success: boolean;
  totalFound: number;
  products: Product[];
  message: string;
}> {
  const allProducts = await getProductData();
  const kw = (params.keyword || '').toLowerCase();
  const cat = (params.category || '').toLowerCase();
  const brand = (params.brand || '').toLowerCase();

  const filtered = allProducts.filter((p) => {
    if (cat && !p.category.toLowerCase().includes(cat)) return false;
    if (brand && !p.brand.toLowerCase().includes(brand)) return false;
    if (params.maxPrice && p.price > params.maxPrice) return false;
    if (kw) {
      const haystack = `${p.brand} ${p.modelName} ${p.category} ${p.keySpecifications} ${p.bestFor}`.toLowerCase();
      if (!haystack.includes(kw)) return false;
    }
    return true;
  });

  return {
    success: true,
    totalFound: filtered.length,
    products: filtered,
    message:
      filtered.length > 0
        ? `Found ${filtered.length} product(s) matching your criteria.`
        : 'No products matched your search criteria.',
  };
}

/**
 * Tool: Look up order details and verify purchase dates.
 */
export async function lookupOrderTool(params: {
  orderId?: string;
  customerName?: string;
}): Promise<{
  success: boolean;
  order?: Order & {
    allowedReturnDays: number;
    isReturnWindowOpen: boolean;
    bankDetail?: BankDetail;
  };
  message: string;
}> {
  const [orders, bankDetails] = await Promise.all([
    getOrderData(),
    getCustomerBankDetails(),
  ]);

  const targetOrderId = (params.orderId || '').trim().toUpperCase();
  const targetCustomer = (params.customerName || '').trim().toLowerCase();

  const order = orders.find((o) => {
    if (targetOrderId && o.orderId.toUpperCase() === targetOrderId) return true;
    if (targetCustomer && o.customer.toLowerCase().includes(targetCustomer)) return true;
    return false;
  });

  if (!order) {
    return {
      success: false,
      message: `No order found for ID: "${params.orderId || ''}" / Customer: "${params.customerName || ''}". Please verify the order number.`,
    };
  }

  // Determine policy window: 15 days for electronics, 30 days for others
  const isElectronics =
    order.category.toLowerCase().includes('electronic') ||
    ['laptop', 'phone', 'tablet', 'headphone', 'headphones', 'keyboard', 'mouse', 'monitor'].some(
      (item) => order.product.toLowerCase().includes(item)
    );

  const allowedReturnDays = isElectronics ? 15 : 30;
  const isReturnWindowOpen = order.daysAgo <= allowedReturnDays;

  const bank = bankDetails.find((b) => b.orderId.toUpperCase() === order.orderId.toUpperCase());

  return {
    success: true,
    order: {
      ...order,
      allowedReturnDays,
      isReturnWindowOpen,
      bankDetail: bank,
    },
    message: `Order #${order.orderId} found for customer ${order.customer}. Item: ${order.product} (purchased ${order.daysAgo} days ago). Return window is ${allowedReturnDays} days (${isReturnWindowOpen ? 'ACTIVE' : 'EXPIRED'}).`,
  };
}

/**
 * Tool: Create a new customer order, decrement stock in Sheet1, and record order in Sheet2.
 */
export async function createOrderTool(params: {
  customer: string;
  product: string;
  category?: string;
  email?: string;
  sessionId?: string;
}): Promise<{
  success: boolean;
  order?: Order;
  product?: Product;
  updatedStock?: number;
  message: string;
  emailStatus?: SendEmailResult;
}> {
  const result = await createOrder({
    customer: params.customer,
    product: params.product,
    category: params.category,
    email: params.email,
  });

  if (!result.success || !result.order || !result.product) {
    return {
      success: false,
      message: result.message,
    };
  }

  // Send order confirmation email
  const targetEmail =
    params.email ||
    `${params.customer.toLowerCase().replace(/[^a-z0-9]/g, '')}@example.com`;

  const emailStatus = await sendOrderConfirmationEmail({
    toEmail: targetEmail,
    customerName: params.customer,
    orderId: result.order.orderId,
    productName: `${result.product.brand} ${result.product.modelName}`,
    amount: result.product.price,
    status: result.order.status,
  });

  return {
    success: true,
    order: result.order,
    product: result.product,
    updatedStock: result.updatedStock,
    message: `Order #${result.order.orderId} successfully placed for ${params.customer}! Product: ${result.product.brand} ${result.product.modelName} ($${result.product.price}). Order added to Google Sheet (Sheet2) and remaining stock updated to ${result.updatedStock} (Sheet1). Confirmation receipt sent to ${targetEmail}.`,
    emailStatus,
  };
}

/**
 * Tool: Saves customer bank account details to Sheet3 for refund processing.
 */
export async function saveBankDetailsTool(params: {
  orderId: string;
  customer?: string;
  bankName: string;
  accountNumber: string;
  mobileNumber?: string;
  customerEmail?: string;
  sessionId?: string;
}): Promise<{
  success: boolean;
  orderId: string;
  bankDetail?: BankDetail;
  message: string;
  emailStatus?: SendEmailResult;
}> {
  const orderLookup = await lookupOrderTool({ orderId: params.orderId });
  const customerName = params.customer || orderLookup.order?.customer || 'Valued Customer';
  const productName = orderLookup.order?.product || 'Product';

  const res = await saveCustomerBankDetails({
    orderId: params.orderId,
    customer: customerName,
    product: productName,
    bankName: params.bankName,
    accountNumber: params.accountNumber,
    mobileNumber: params.mobileNumber || '',
  });

  // Also send refund confirmation email now that bank details are attached
  const targetEmail =
    params.customerEmail ||
    `${customerName.toLowerCase().replace(/[^a-z0-9]/g, '')}@example.com`;

  const emailResult = await sendRefundConfirmationEmail({
    toEmail: targetEmail,
    customerName,
    orderId: params.orderId,
    productName,
    amount: 'Full Order Value',
    bankDetails: {
      bankName: params.bankName,
      accountNumber: params.accountNumber,
      mobileNumber: params.mobileNumber,
    },
  });

  return {
    success: true,
    orderId: params.orderId,
    bankDetail: res.bankDetail,
    message: `Bank details for Order #${params.orderId} (Bank: ${params.bankName}, Account: ${params.accountNumber}) have been securely registered to Google Sheet (Sheet3). Refund status updated to "Refund approved" and confirmation email dispatched to ${targetEmail}!`,
    emailStatus: emailResult,
  };
}

/**
 * Tool: Process refunds, enforce return policy, check/request bank details, send email confirmation, and log audit trail.
 */
export async function processRefundTool(params: {
  orderId: string;
  customerEmail?: string;
  reason?: string;
  bankName?: string;
  accountNumber?: string;
  mobileNumber?: string;
  sessionId?: string;
}): Promise<{
  success: boolean;
  approved: boolean;
  needsBankDetails?: boolean;
  orderId: string;
  customer: string;
  product: string;
  message: string;
  policyReason: string;
  bankDetail?: BankDetail;
  emailStatus?: SendEmailResult;
}> {
  const orderLookup = await lookupOrderTool({ orderId: params.orderId });

  if (!orderLookup.success || !orderLookup.order) {
    await writeLog({
      sessionId: params.sessionId,
      orderId: params.orderId,
      actionTaken: 'refund_lookup_failed',
      status: 'FAILED',
      userMessage: `Attempted refund for non-existent order ${params.orderId}. Reason: ${params.reason || 'Not provided'}`,
      agentResponse: orderLookup.message,
    });

    return {
      success: false,
      approved: false,
      orderId: params.orderId,
      customer: 'Unknown',
      product: 'Unknown',
      message: orderLookup.message,
      policyReason: 'Order does not exist in the database.',
    };
  }

  const order = orderLookup.order;
  const daysAgo = order.daysAgo;
  const allowedDays = order.allowedReturnDays;

  // Check Policy Compliance
  if (daysAgo > allowedDays) {
    const policyReason = `Per NexusTech policy, ${order.allowedReturnDays === 15 ? 'electronics must be returned within 15 days' : 'items must be returned within 30 days'}. This order was placed ${daysAgo} days ago (${daysAgo - allowedDays} days past policy limit).`;

    await writeLog({
      sessionId: params.sessionId,
      customer: order.customer,
      orderId: order.orderId,
      actionTaken: 'refund_rejected_policy_exceeded',
      status: 'REJECTED',
      userMessage: `Requested refund for order ${order.orderId} (${order.product}). Customer reason: ${params.reason || 'None provided'}`,
      agentResponse: policyReason,
    });

    return {
      success: true,
      approved: false,
      orderId: order.orderId,
      customer: order.customer,
      product: order.product,
      message: `Refund rejected for order #${order.orderId}. ${policyReason}`,
      policyReason,
    };
  }

  // If bank details are provided in this call, save them to Sheet3 and proceed with approval
  let activeBank = order.bankDetail;

  if (params.bankName && params.accountNumber) {
    const saved = await saveCustomerBankDetails({
      orderId: order.orderId,
      customer: order.customer,
      product: order.product,
      bankName: params.bankName,
      accountNumber: params.accountNumber,
      mobileNumber: params.mobileNumber || '',
    });
    activeBank = saved.bankDetail;
  } else {
    // Bank details NOT provided in this request -> ALWAYS prompt customer for their bank details!
    const policyNotice = `Order #${order.orderId} was placed ${daysAgo} days ago (within our ${allowedDays}-day return window) and is ELIGIBLE for return and refund.`;

    return {
      success: true,
      approved: false,
      needsBankDetails: true,
      orderId: order.orderId,
      customer: order.customer,
      product: order.product,
      policyReason: policyNotice,
      message: `Hello ${order.customer}! Your return request for order #${order.orderId} (${order.product}) is APPROVED under our policy! To finalize your refund payment and record it in our Google Sheet, please provide your bank transfer details:\n\n1. **Bank Name** (e.g., Meezan Bank, Chase, HBL, UBL)\n2. **Account Number / IBAN**\n3. **Account Holder Name / Mobile Number**\n\nOnce you reply with these details, we will register them in Sheet3 and initiate your payout.`,
    };
  }

  // Mark status as 'Refund approved' in Sheet2
  await updateOrderStatus(order.orderId, 'Refund approved');

  // Approved with Bank Details!
  const approvalReason = `Order #${order.orderId} was placed ${daysAgo} days ago, well within our ${allowedDays}-day return window. Item is eligible for return and full refund.`;

  // Send automated email confirmation
  const targetEmail =
    params.customerEmail ||
    `${order.customer.toLowerCase().replace(/[^a-z0-9]/g, '')}@example.com`;

  const emailResult = await sendRefundConfirmationEmail({
    toEmail: targetEmail,
    customerName: order.customer,
    orderId: order.orderId,
    productName: order.product,
    amount: 'Full Order Value',
    refundMethod: activeBank ? `${activeBank.bankName} (Acc: ...${activeBank.accountNumber.slice(-4)})` : 'Bank Transfer',
    bankDetails: activeBank
      ? {
          bankName: activeBank.bankName,
          accountNumber: activeBank.accountNumber,
          mobileNumber: activeBank.mobileNumber,
        }
      : undefined,
    notes: params.reason,
  });

  // Log to Google Sheets
  await writeLog({
    sessionId: params.sessionId,
    customer: order.customer,
    orderId: order.orderId,
    actionTaken: 'refund_approved',
    status: 'APPROVED',
    userMessage: `Requested refund for ${order.orderId} (${order.product}). Payout destination: ${activeBank?.bankName || 'Bank'} ${activeBank?.accountNumber || ''}. Reason: ${params.reason || 'Customer request'}`,
    agentResponse: `Refund APPROVED. Saved to Sheet3. Confirmation email dispatched. Policy window: ${daysAgo}/${allowedDays} days.`,
  });

  return {
    success: true,
    approved: true,
    needsBankDetails: false,
    orderId: order.orderId,
    customer: order.customer,
    product: order.product,
    policyReason: approvalReason,
    bankDetail: activeBank,
    message: `Refund APPROVED for Order #${order.orderId}! Your bank details (${activeBank?.bankName}, Account: ${activeBank?.accountNumber}) are recorded in Google Sheets (Sheet3). A confirmation email has been sent to ${targetEmail}. Funds will be transferred within 5 business days.`,
    emailStatus: emailResult,
  };
}

/**
 * Tool metadata schema declarations for AI model tool calling (Gemini & OpenAI format).
 */
export const AI_TOOLS_DECLARATIONS = [
  {
    name: 'lookupProduct',
    description: 'Search store inventory and check product specifications, prices, and stock levels.',
    parameters: {
      type: 'object',
      properties: {
        keyword: {
          type: 'string',
          description: 'Keyword to search across product name, category, or specs (e.g., "laptop", "Apple", "gaming")',
        },
        category: {
          type: 'string',
          description: 'Product category (e.g., "Laptop", "Headphones", "Mobile")',
        },
        brand: {
          type: 'string',
          description: 'Brand name (e.g., "Apple", "Dell", "Sony", "Lenovo")',
        },
        maxPrice: {
          type: 'number',
          description: 'Maximum budget or price filter in USD',
        },
      },
    },
  },
  {
    name: 'lookupOrder',
    description: 'Lookup customer order details, purchase timeframe (days ago), and check if the return window is open.',
    parameters: {
      type: 'object',
      properties: {
        orderId: {
          type: 'string',
          description: 'The order identifier, e.g. "ORD-101", "ORD-102", "ORD-103"',
        },
        customerName: {
          type: 'string',
          description: 'The customer name if order ID is unknown',
        },
      },
    },
  },
  {
    name: 'createOrder',
    description: 'Place a new purchase order for a customer. Decrements product stock in Sheet1 and records the new order in Sheet2.',
    parameters: {
      type: 'object',
      properties: {
        customer: {
          type: 'string',
          description: 'Customer full name',
        },
        product: {
          type: 'string',
          description: 'The product or model name the customer wants to buy (e.g., "MacBook Air M3", "Lenovo Legion")',
        },
        category: {
          type: 'string',
          description: 'Category of item, e.g. "electronics"',
        },
        email: {
          type: 'string',
          description: 'Optional customer email address for receipt',
        },
      },
      required: ['customer', 'product'],
    },
  },
  {
    name: 'saveBankDetails',
    description: 'Record customer bank account details in Google Sheets (Sheet3) to process a refund payout.',
    parameters: {
      type: 'object',
      properties: {
        orderId: {
          type: 'string',
          description: 'Order ID, e.g. "ORD-104"',
        },
        customer: {
          type: 'string',
          description: 'Customer name',
        },
        bankName: {
          type: 'string',
          description: 'Name of the bank, e.g. "Meezan Bank", "Chase", "HBL"',
        },
        accountNumber: {
          type: 'string',
          description: 'Bank account number or IBAN',
        },
        mobileNumber: {
          type: 'string',
          description: 'Customer mobile or contact number',
        },
      },
      required: ['orderId', 'bankName', 'accountNumber'],
    },
  },
  {
    name: 'processRefund',
    description: 'Process a return or refund for an order. Checks policy window, verifies/records bank details in Sheet3, and sends email notification.',
    parameters: {
      type: 'object',
      properties: {
        orderId: {
          type: 'string',
          description: 'The order identifier to process refund for, e.g. "ORD-101"',
        },
        bankName: {
          type: 'string',
          description: 'Bank name if customer provides it for payout',
        },
        accountNumber: {
          type: 'string',
          description: 'Account number or IBAN if customer provides it for payout',
        },
        mobileNumber: {
          type: 'string',
          description: 'Mobile number associated with bank account',
        },
        customerEmail: {
          type: 'string',
          description: 'The customer email to send confirmation notice to',
        },
        reason: {
          type: 'string',
          description: 'The reason provided by the customer for requesting a return or refund',
        },
      },
      required: ['orderId'],
    },
  },
];

