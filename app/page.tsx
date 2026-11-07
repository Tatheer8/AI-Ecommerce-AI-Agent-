'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Compass,
  Search,
  Sparkles,
  LayoutGrid,
  Folder,
  ChevronRight,
  ArrowRight,
  RefreshCw,
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Package,
  ShoppingCart,
  CreditCard,
  FileText,
  Database,
  Plus,
  ChevronDown,
  X,
  ExternalLink,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolsExecuted?: Array<{ tool: string; input: any; output: any }>;
  timestamp: string;
}

interface ProductItem {
  category: string;
  brand: string;
  modelName: string;
  keySpecifications: string;
  bestFor: string;
  price: number;
  stock: number;
}

interface OrderItem {
  orderId: string;
  customer: string;
  product: string;
  category: string;
  daysAgo: number;
  status: string;
}

interface BankItem {
  orderId: string;
  customer: string;
  product: string;
  bankName: string;
  accountNumber: string;
  mobileNumber: string;
}

interface LogItem {
  timestamp: string;
  orderId?: string;
  customer?: string;
  actionTaken: string;
  status: string;
  agentResponse?: string;
}

const DEFAULT_PRODUCTS = [
  {
    ticker: 'MACBOOK',
    fullName: 'Apple MacBook Air M3',
    price: '$799.99',
    stock: 8,
    isGreen: true,
    category: 'Laptop',
    specs: '13.6", Apple M3, 16GB RAM, 512GB SSD',
    sparkline: 'M0,25 Q20,28 35,18 T70,22 T105,10 T140,15 T175,8 T200,12',
    iconColor: '#f59e0b',
    symbol: '',
  },
  {
    ticker: 'XPS 15',
    fullName: 'Dell XPS 15 9530',
    price: '$149.99',
    stock: 0,
    isGreen: false,
    category: 'Laptop',
    specs: 'Intel Core i7, RTX 4050, 16GB RAM (Out of stock)',
    sparkline: 'M0,10 Q25,8 45,18 T90,14 T130,26 T165,22 T200,28',
    iconColor: '#3b82f6',
    symbol: 'D',
  },
  {
    ticker: 'LEGION',
    fullName: 'Lenovo Legion Pro 5',
    price: '$499.99',
    stock: 12,
    isGreen: true,
    category: 'Laptop',
    specs: 'Ryzen 9, RTX 4070, 32GB RAM, 240Hz Gaming',
    sparkline: 'M0,24 Q30,22 55,14 T100,18 T145,8 T180,12 T200,6',
    iconColor: '#10b981',
    symbol: 'L',
  },
  {
    ticker: 'SONY XM5',
    fullName: 'Sony WH-1000XM5',
    price: '$59.99',
    stock: 22,
    isGreen: true,
    category: 'Headphones',
    specs: 'Active Noise Canceling, 30hr Battery Life',
    sparkline: 'M0,26 Q25,28 50,16 T95,19 T140,9 T175,14 T200,8',
    iconColor: '#a855f7',
    symbol: 'S',
  },
  {
    ticker: 'SPECTRE',
    fullName: 'HP Spectre x360 14',
    price: '$329.99',
    stock: 4,
    isGreen: true,
    category: 'Laptop',
    specs: 'Core Ultra 7, OLED 2-in-1 Touchscreen',
    sparkline: 'M0,22 Q30,24 60,15 T110,16 T150,11 T185,15 T200,9',
    iconColor: '#06b6d4',
    symbol: 'HP',
  },
];

export default function AppHome() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [mode, setMode] = useState('Policy Engine');
  const [activeModal, setActiveModal] = useState<'none' | 'catalog' | 'orders' | 'bankDetails' | 'policy' | 'logs'>('none');
  
  // Live sheets data state
  const [liveProducts, setLiveProducts] = useState<ProductItem[]>([]);
  const [liveOrders, setLiveOrders] = useState<OrderItem[]>([]);
  const [liveBankDetails, setLiveBankDetails] = useState<BankItem[]>([]);
  const [liveLogs, setLiveLogs] = useState<LogItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch live sheets data from /api/data
  const fetchLiveData = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        const data = await res.json();
        if (data.products && Array.isArray(data.products)) setLiveProducts(data.products);
        if (data.orders && Array.isArray(data.orders)) setLiveOrders(data.orders);
        if (data.bankDetails && Array.isArray(data.bankDetails)) setLiveBankDetails(data.bankDetails);
        if (data.logs && Array.isArray(data.logs)) setLiveLogs(data.logs);
      }
    } catch (e) {
      console.warn('Failed to refresh sheets data:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const sId = localStorage.getItem('nexustech_session_id') || `sess-${Date.now()}`;
    localStorage.setItem('nexustech_session_id', sId);
    setSessionId(sId);
    fetchLiveData();
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleSend = async (overrideText?: string) => {
    const textToSend = overrideText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!overrideText) setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend.trim(),
          sessionId,
          customerEmail: customerEmail.trim() || undefined,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get AI response');

      const assistantMessage: ChatMessage = {
        id: `ast-${Date.now()}`,
        role: 'assistant',
        content: data.response || 'No response returned.',
        toolsExecuted: data.toolsExecuted || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Automatically refresh live data if any tool altered sheets (createOrder, saveBankDetails, processRefund)
      if (data.toolsExecuted && data.toolsExecuted.length > 0) {
        setTimeout(() => fetchLiveData(), 800);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ Error: ${err.message || 'Unable to connect to AI server.'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Merge live stock count into bottom 5 cards
  const displayCards = DEFAULT_PRODUCTS.map((prod) => {
    const match = liveProducts.find((p) => p.modelName.toLowerCase().includes(prod.fullName.toLowerCase()) || prod.fullName.toLowerCase().includes(p.modelName.toLowerCase()));
    if (match) {
      return {
        ...prod,
        stock: match.stock,
        price: `$${match.price}`,
        isGreen: match.stock > 0,
      };
    }
    return prod;
  });

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0e0e11',
        color: '#f4f4f6',
        fontFamily: "'Inter', sans-serif",
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 1. Left Floating Sidebar Dock (Matches Screenshot) */}
      <div
        style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        {/* Top Logo Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            onClick={() => setActiveModal('none')}
            title="NexusTech AI"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: '#15151a',
              border: '1.5px solid #d946ef',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f472b6',
              fontWeight: 800,
              fontSize: '15px',
              boxShadow: '0 0 12px rgba(217, 70, 239, 0.3)',
              cursor: 'pointer',
            }}
          >
            A
          </div>
          <button
            onClick={() => setActiveModal('policy')}
            style={{
              background: 'none',
              border: 'none',
              color: '#71717a',
              cursor: 'pointer',
              display: 'flex',
              padding: '2px',
            }}
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Vertical Icon Rail */}
        <div
          style={{
            background: '#141418',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '8px 5px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
          }}
        >
          <button
            onClick={() => setActiveModal('none')}
            title="Assistant Home"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              border: 'none',
              background: activeModal === 'none' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              color: activeModal === 'none' ? '#ffffff' : '#71717a',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s',
            }}
          >
            <Compass size={17} />
          </button>

          <button
            onClick={() => setActiveModal('catalog')}
            title={`Store Catalog Sheet1 (${liveProducts.length > 0 ? liveProducts.length : 20} items)`}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              border: 'none',
              background: activeModal === 'catalog' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              color: activeModal === 'catalog' ? '#a855f7' : '#71717a',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LayoutGrid size={17} />
          </button>

          <button
            onClick={() => setActiveModal('orders')}
            title={`Orders Feed Sheet2 (${liveOrders.length} orders)`}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              border: 'none',
              background: activeModal === 'orders' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              color: activeModal === 'orders' ? '#3b82f6' : '#71717a',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <Folder size={17} />
            {liveOrders.length > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#10b981',
                }}
              />
            )}
          </button>

          <button
            onClick={() => setActiveModal('bankDetails')}
            title={`Bank Details Sheet3 (${liveBankDetails.length} recorded)`}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              border: 'none',
              background: activeModal === 'bankDetails' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              color: activeModal === 'bankDetails' ? '#c084fc' : '#71717a',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CreditCard size={17} />
          </button>

          <button
            onClick={() => setActiveModal('logs')}
            title="Google Sheets & Agent Audit Logs"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              border: 'none',
              background: activeModal === 'logs' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              color: activeModal === 'logs' ? '#10b981' : '#71717a',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Database size={16} />
          </button>
        </div>
      </div>

      {/* 2. Top Right Header Controls */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          right: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          zIndex: 100,
        }}
      >
        <button
          onClick={fetchLiveData}
          title="Refresh data from Google Sheets"
          style={{
            background: 'none',
            border: 'none',
            color: '#a1a1aa',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '6px',
          }}
        >
          <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
          <span>Sync Sheets</span>
        </button>

        <button
          onClick={() => setActiveModal('catalog')}
          title="View Products (Sheet1)"
          style={{
            background: 'none',
            border: 'none',
            color: activeModal === 'catalog' ? '#ffffff' : '#a1a1aa',
            cursor: 'pointer',
            display: 'flex',
          }}
        >
          <LayoutGrid size={15} />
        </button>

        <button
          onClick={() => setActiveModal('orders')}
          title="View Orders (Sheet2)"
          style={{
            background: 'none',
            border: 'none',
            color: activeModal === 'orders' ? '#ffffff' : '#a1a1aa',
            cursor: 'pointer',
            display: 'flex',
            position: 'relative',
          }}
        >
          <Bell size={15} />
          {liveOrders.length > 5 && (
            <span
              style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#10b981',
              }}
            />
          )}
        </button>
      </div>

      {/* 3. Center Screen Content Area */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: messages.length === 0 ? 'center' : 'flex-start',
          padding: '80px 20px 40px',
          maxWidth: '820px',
          margin: '0 auto',
          width: '100%',
        }}
      >
        {/* Title Headline (Matches Screenshot) */}
        {messages.length === 0 && (
          <h1
            style={{
              fontSize: '36px',
              fontWeight: 400,
              color: '#f4f4f6',
              letterSpacing: '-0.02em',
              marginBottom: '32px',
              textAlign: 'center',
            }}
          >
            What's up with you today?
          </h1>
        )}

        {/* Conversation Stream (When Chatting) */}
        {messages.length > 0 && (
          <div
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              marginBottom: '24px',
            }}
          >
            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: m.role === 'user' ? 'flex-end' : 'flex-start',
                  width: '100%',
                }}
              >
                {/* Tool Execution Badges */}
                {m.toolsExecuted && m.toolsExecuted.length > 0 && (
                  <div style={{ width: '100%', maxWidth: '90%', marginBottom: '8px' }}>
                    {m.toolsExecuted.map((t, idx) => {
                      const isRefund = t.tool === 'processRefund';
                      const isOrder = t.tool === 'lookupOrder';
                      const isProduct = t.tool === 'lookupProduct';
                      const isCreateOrder = t.tool === 'createOrder';
                      const isBankDetails = t.tool === 'saveBankDetails';
                      const approved = t.output?.approved;

                      return (
                        <div
                          key={idx}
                          style={{
                            background: '#18181d',
                            border: `1px solid ${
                              isCreateOrder
                                ? 'rgba(16, 185, 129, 0.4)'
                                : isBankDetails
                                ? 'rgba(168, 85, 247, 0.4)'
                                : isRefund
                                ? approved
                                  ? 'rgba(16, 185, 129, 0.4)'
                                  : 'rgba(239, 68, 68, 0.4)'
                                : 'rgba(255, 255, 255, 0.1)'
                            }`,
                            borderRadius: '12px',
                            padding: '12px 14px',
                            fontSize: '12px',
                            color: '#e4e4e7',
                            marginBottom: '6px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                              {isCreateOrder && <ShoppingCart size={14} color="#10b981" />}
                              {isBankDetails && <CreditCard size={14} color="#c084fc" />}
                              {isRefund && (approved ? <CheckCircle2 size={14} color="#10b981" /> : <Clock size={14} color="#f59e0b" />)}
                              {isOrder && <Package size={14} color="#60a5fa" />}
                              {isProduct && <LayoutGrid size={14} color="#c084fc" />}

                              <span>
                                {isCreateOrder && `Sheet1 & Sheet2: Order #${t.output?.order?.orderId || 'New'} Placed`}
                                {isBankDetails && `Sheet3: Bank Details Recorded (#${t.output?.orderId || ''})`}
                                {isRefund && (approved ? 'Refund Policy Approved' : 'Bank Details Required for Refund')}
                                {isOrder && `Sheet2 Verification: ${t.input?.orderId || t.input?.customerName || 'Order'}`}
                                {isProduct && `Inventory Catalog: ${t.output?.count || t.output?.products?.length || 0} items found`}
                              </span>
                            </div>

                            <span style={{ fontSize: '10px', color: '#71717a', fontFamily: 'monospace' }}>
                              google_sheets_v4
                            </span>
                          </div>

                          <div style={{ fontSize: '11px', color: '#a1a1aa', lineHeight: '1.4' }}>
                            {t.output?.message || JSON.stringify(t.output)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  style={{
                    maxWidth: '85%',
                    padding: '12px 18px',
                    borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: m.role === 'user' ? '#27272f' : '#18181d',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#f4f4f6',
                    fontSize: '14px',
                    lineHeight: '1.55',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {m.content}
                </div>

                <span style={{ fontSize: '10px', color: '#52525b', marginTop: '4px', padding: '0 4px' }}>
                  {m.timestamp}
                </span>
              </div>
            ))}

            {isLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#71717a', fontSize: '12px' }}>
                <RefreshCw size={14} className="animate-spin" />
                <span>Processing with Google Sheets & Policy Engine...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Central Command / Chat Input Card (Matches Screenshot Box) */}
        <div
          style={{
            width: '100%',
            maxWidth: '680px',
            background: '#18181d',
            border: '1px solid #27272f',
            borderRadius: '16px',
            padding: '16px 18px',
            boxShadow: '0 15px 35px -5px rgba(0, 0, 0, 0.5)',
            marginBottom: '18px',
          }}
        >
          {/* Top Label / Placeholder */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', minHeight: '52px' }}>
            <span style={{ color: '#52525b', fontSize: '15px', fontWeight: 500, marginTop: '2px' }}>To</span>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask about products, order an item, or process a return & refund..."
              rows={2}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#f4f4f6',
                fontSize: '14px',
                lineHeight: '1.5',
                resize: 'none',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Bottom Toolbar inside Card (Matches Screenshot) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '10px',
              paddingTop: '10px',
              borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            {/* Left Controls: [+] and [Legacy mode ▾] */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => {
                  const email = prompt('Enter recipient email for order/refund confirmations:', customerEmail);
                  if (email !== null) setCustomerEmail(email);
                }}
                title="Attach confirmation email"
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '6px',
                  background: '#23232a',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: customerEmail ? '#34d399' : '#9ca3af',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <Plus size={14} />
              </button>

              <div
                onClick={() => setActiveModal('policy')}
                title="Click to view policy rules"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background: '#23232a',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#9ca3af',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                <span>{mode}</span>
                <ChevronDown size={12} />
              </div>
            </div>

            {/* Right Controls: Send and (→) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#71717a' }}>Send</span>
              <button
                onClick={() => handleSend()}
                disabled={isLoading || !input.trim()}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: input.trim() ? '#ffffff' : '#23232a',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: input.trim() ? '#0e0e11' : '#71717a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: input.trim() ? 'pointer' : 'default',
                  transition: 'all 0.15s',
                }}
              >
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Suggested Prompt Chips (Matches Screenshot Pills) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '36px',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px' }}>
            <button
              onClick={() => handleSend('I want to buy an Apple MacBook Air M3, my name is Alex')}
              style={{
                fontSize: '12px',
                color: '#34d399',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '6px 14px',
                borderRadius: '999px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <ShoppingCart size={12} color="#34d399" />
              <span>buy MacBook Air M3 (Name: Alex)</span>
            </button>

            <button
              onClick={() => handleSend('my name is nida and i want to return my product')}
              style={{
                fontSize: '12px',
                color: '#a1a1aa',
                background: '#18181d',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '6px 14px',
                borderRadius: '999px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Sparkles size={12} color="#a1a1aa" />
              <span>return product (Nida ORD-104)</span>
            </button>

            <button
              onClick={() => handleSend('Here are my bank details: Meezan Bank, Account 5981234567890, Mobile 03001234567')}
              style={{
                fontSize: '12px',
                color: '#c084fc',
                background: 'rgba(168, 85, 247, 0.1)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                padding: '6px 14px',
                borderRadius: '999px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <CreditCard size={12} color="#c084fc" />
              <span>provide bank details (Meezan Bank)</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px' }}>
            <button
              onClick={() => handleSend('Can I return order ORD-101?')}
              style={{
                fontSize: '12px',
                color: '#a1a1aa',
                background: '#18181d',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '6px 14px',
                borderRadius: '999px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Sparkles size={12} color="#a1a1aa" />
              <span>check order ORD-101 (expired policy)</span>
            </button>

            <button
              onClick={() => handleSend('What is the return policy for electronics?')}
              style={{
                fontSize: '12px',
                color: '#a1a1aa',
                background: '#18181d',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '6px 14px',
                borderRadius: '999px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Sparkles size={12} color="#a1a1aa" />
              <span>what is the 15-day return policy?</span>
            </button>
          </div>
        </div>

        {/* 5 Bottom Asset Cards (Matches Screenshot 5 Crypto Cards Style) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '12px',
            width: '100%',
            maxWidth: '680px',
          }}
        >
          {displayCards.map((p, idx) => (
            <div
              key={idx}
              onClick={() => handleSend(`Can you check stock and details for ${p.fullName}?`)}
              style={{
                background: '#18181d',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '14px',
                padding: '14px 10px 8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'transform 0.15s, border-color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)')}
            >
              {/* Circular Icon */}
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: p.iconColor,
                  marginBottom: '8px',
                }}
              >
                {p.symbol}
              </div>

              {/* Ticker & Price */}
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#f4f4f6', letterSpacing: '0.02em' }}>
                {p.ticker}
              </span>
              <span style={{ fontSize: '11px', color: '#71717a', margin: '2px 0 6px' }}>
                {p.price}
              </span>

              {/* Mini Sparkline SVG Graph */}
              <svg width="100%" height="24" viewBox="0 0 200 35" style={{ overflow: 'visible' }}>
                <path
                  d={p.sparkline}
                  fill="none"
                  stroke={p.isGreen ? '#10b981' : '#ef4444'}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          ))}
        </div>
      </main>

      {/* Slide-out Data Drawers (Catalog, Orders, Bank Details, Policy, Logs) */}
      {activeModal !== 'none' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setActiveModal('none')}
        >
          <div
            style={{
              background: '#141418',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '20px',
              maxWidth: '820px',
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '28px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {activeModal === 'catalog' && <LayoutGrid size={20} color="#a855f7" />}
                {activeModal === 'orders' && <Folder size={20} color="#3b82f6" />}
                {activeModal === 'bankDetails' && <CreditCard size={20} color="#c084fc" />}
                {activeModal === 'policy' && <FileText size={20} color="#10b981" />}
                {activeModal === 'logs' && <Database size={20} color="#10b981" />}

                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
                    {activeModal === 'catalog' && `Product Catalog (Sheet1 - ${liveProducts.length} items)`}
                    {activeModal === 'orders' && `Customer Orders (Sheet2 - ${liveOrders.length} orders)`}
                    {activeModal === 'bankDetails' && `Customer Bank Details (Sheet3 - ${liveBankDetails.length} accounts)`}
                    {activeModal === 'policy' && 'Store Policy Rules (Mammoth Extracted)'}
                    {activeModal === 'logs' && `Audit Trail & Sheets Activity (${liveLogs.length} logs)`}
                  </h2>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#71717a' }}>
                    Synced with local workbook & Google Sheets API
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={fetchLiveData}
                  title="Refresh"
                  style={{
                    background: '#23232a',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#a1a1aa',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                  }}
                >
                  <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>

                <button
                  onClick={() => setActiveModal('none')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#71717a',
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Content: Catalog (Sheet1) */}
            {activeModal === 'catalog' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {liveProducts.map((prod, i) => (
                  <div
                    key={i}
                    style={{
                      background: '#18181d',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '12px',
                      padding: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, color: '#ffffff' }}>
                          {prod.brand} {prod.modelName}
                        </span>
                        <span style={{ fontSize: '10px', color: '#71717a', textTransform: 'uppercase' }}>
                          [{prod.category}]
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: prod.stock > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: prod.stock > 0 ? '#34d399' : '#f87171',
                            fontWeight: 600,
                          }}
                        >
                          {prod.stock > 0 ? `${prod.stock} in stock` : 'Out of stock'}
                        </span>
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#71717a' }}>
                        {prod.keySpecifications || prod.bestFor}
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: '#f4f4f6' }}>
                        ${prod.price}
                      </span>
                      <button
                        onClick={() => {
                          setActiveModal('none');
                          handleSend(`I want to order ${prod.brand} ${prod.modelName}`);
                        }}
                        style={{
                          background: prod.stock > 0 ? '#10b981' : '#23232a',
                          border: 'none',
                          color: '#ffffff',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          cursor: prod.stock > 0 ? 'pointer' : 'default',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <ShoppingCart size={12} />
                        <span>Order</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Modal Content: Orders (Sheet2) */}
            {activeModal === 'orders' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {liveOrders.map((ord, i) => {
                  const isElec = (ord.category || '').toLowerCase().includes('elec') || ['laptop', 'headphones', 'keyboard', 'tablet', 'phone'].some((k) => (ord.product || '').toLowerCase().includes(k));
                  const windowDays = isElec ? 15 : 30;
                  const isEligible = ord.daysAgo <= windowDays;

                  return (
                    <div
                      key={i}
                      style={{
                        background: '#18181d',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: '12px',
                        padding: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, color: '#ffffff', fontFamily: 'monospace' }}>
                            #{ord.orderId}
                          </span>
                          <span style={{ color: '#a1a1aa', fontSize: '13px' }}>
                            {ord.customer} — {ord.product}
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background:
                                ord.status === 'Refund approved'
                                  ? 'rgba(168, 85, 247, 0.2)'
                                  : ord.status === 'Confirmed'
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : isEligible
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : 'rgba(239, 68, 68, 0.15)',
                              color:
                                ord.status === 'Refund approved'
                                  ? '#c084fc'
                                  : ord.status === 'Confirmed'
                                  ? '#34d399'
                                  : isEligible
                                  ? '#34d399'
                                  : '#f87171',
                              fontWeight: 600,
                            }}
                          >
                            {ord.status.toUpperCase()}
                          </span>
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#71717a' }}>
                          Purchased {ord.daysAgo} days ago • Policy limit: {windowDays} days ({isEligible ? 'Eligible for return' : 'Return window expired'})
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setActiveModal('none');
                          handleSend(`I want to return order ${ord.orderId}`);
                        }}
                        style={{
                          background: ord.status === 'Refund approved' ? '#23232a' : isEligible ? '#3b82f6' : '#23232a',
                          border: 'none',
                          color: '#ffffff',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        {ord.status === 'Refund approved' ? 'Refunded' : isEligible ? 'Return & Refund' : 'Check Policy'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Modal Content: Bank Details (Sheet3) */}
            {activeModal === 'bankDetails' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.2)', borderRadius: '10px', padding: '12px', fontSize: '12px', color: '#c084fc' }}>
                  ℹ️ These bank accounts were collected directly from customers via chat for approved returns and saved to <strong>Sheet3 (BankDetails)</strong> in Google Sheets.
                </div>

                {liveBankDetails.map((b, i) => (
                  <div
                    key={i}
                    style={{
                      background: '#18181d',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '12px',
                      padding: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, color: '#ffffff', fontFamily: 'monospace' }}>
                          #{b.orderId}
                        </span>
                        <span style={{ color: '#a1a1aa', fontSize: '13px' }}>
                          {b.customer} ({b.product})
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'rgba(168, 85, 247, 0.15)',
                            color: '#c084fc',
                            fontWeight: 600,
                          }}
                        >
                          {b.bankName}
                        </span>
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#e4e4e7', fontFamily: 'monospace' }}>
                        Account / IBAN: {b.accountNumber} {b.mobileNumber ? `• Mobile: ${b.mobileNumber}` : ''}
                      </p>
                    </div>

                    <span style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={13} />
                      <span>Ready for Transfer</span>
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Modal Content: Policy */}
            {activeModal === 'policy' && (
              <div style={{ fontSize: '13px', color: '#a1a1aa', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ background: '#18181d', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <h4 style={{ color: '#ffffff', marginBottom: '4px' }}>1. Return Policy</h4>
                  <p>Customers may return items within 30 days of purchase. Electronics such as laptops, phones, and tablets must be returned within <strong>15 days</strong> in original packaging. Items marked Final Sale cannot be returned.</p>
                </div>
                <div style={{ background: '#18181d', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <h4 style={{ color: '#ffffff', marginBottom: '4px' }}>2. Refund Policy & Bank Details</h4>
                  <p>Refunds are processed within <strong>5 business days</strong> after the returned item is authorized. The customer must provide their <strong>Bank Name</strong>, <strong>Account Number / IBAN</strong>, and mobile contact to receive funds.</p>
                </div>
                <div style={{ background: '#18181d', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <h4 style={{ color: '#ffffff', marginBottom: '4px' }}>3. Shipping & Warranty</h4>
                  <p>Standard shipping takes 3–5 business days ($4.99 or free over $50). All electronics come with a 1-year manufacturer hardware defect warranty.</p>
                </div>
              </div>
            )}

            {/* Modal Content: Audit Logs */}
            {activeModal === 'logs' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {liveLogs.map((log, i) => (
                  <div
                    key={i}
                    style={{
                      background: '#18181d',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      fontSize: '11px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: '#34d399', fontWeight: 600 }}>{log.actionTaken}</span>
                      <span style={{ color: '#52525b', fontFamily: 'monospace' }}>
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div style={{ color: '#a1a1aa' }}>
                      {log.orderId ? `Order #${log.orderId} • ` : ''}{log.customer ? `Customer: ${log.customer} • ` : ''}{log.agentResponse}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
