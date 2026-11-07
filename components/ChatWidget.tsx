'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Bot,
  User,
  Sparkles,
  RefreshCw,
  ShoppingBag,
  Package,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  ShieldCheck,
  Mail,
  ChevronRight,
  Minimize2,
  FileText,
  CreditCard,
} from 'lucide-react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolsExecuted?: Array<{ tool: string; input: any; output: any }>;
  timestamp: string;
}

const QUICK_ACTIONS = [
  { label: 'Check ORD-103 (Eligible)', prompt: 'Check refund status for order ORD-103', icon: ShieldCheck, color: '#10b981' },
  { label: 'Check ORD-101 (Expired)', prompt: 'Can I return order ORD-101?', icon: ShieldAlert, color: '#f43f5e' },
  { label: 'Laptops under $800', prompt: 'What laptops do you recommend under $800?', icon: ShoppingBag, color: '#6366f1' },
  { label: 'Electronics Policy', prompt: 'What is your return policy for electronics?', icon: FileText, color: '#06b6d4' },
];

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const existingSession = localStorage.getItem('nexustech_chat_session') || `session-${Date.now()}`;
    localStorage.setItem('nexustech_chat_session', existingSession);
    setSessionId(existingSession);

    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `Welcome to **NexusTech Support AI**! ⚡

I am connected to your live **Google Sheets** database and store policy engine.
- 🔍 **Live Products**: Search specifications, prices, and stock
- 📦 **Order Tracking**: Check purchase dates & delivery status
- 🔄 **Automated Refunds**: Enforce 15-day electronics return rules & send email confirmations

How can I help you today?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }

    const handleTriggerChat = (e: CustomEvent<{ message: string; autoSend?: boolean }>) => {
      setIsOpen(true);
      if (e.detail.autoSend) {
        handleSendMessage(e.detail.message);
      } else {
        setInput(e.detail.message);
      }
    };

    window.addEventListener('trigger-ai-chat' as any, handleTriggerChat);
    return () => window.removeEventListener('trigger-ai-chat' as any, handleTriggerChat);
  }, []);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  const handleSendMessage = async (customMessage?: string) => {
    const textToSend = customMessage || input;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customMessage) setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend.trim(),
          sessionId,
          customerEmail: customerEmail.trim() || undefined,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch agent response');
      }

      const assistantMsg: ChatMessage = {
        id: `ast-${Date.now()}`,
        role: 'assistant',
        content: data.response || 'No response received.',
        toolsExecuted: data.toolsExecuted || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ Connection notice: ${err.message || 'Unable to connect to support server.'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    const newSession = `session-${Date.now()}`;
    localStorage.setItem('nexustech_chat_session', newSession);
    setSessionId(newSession);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: `Session cleared. Ready for your next product search, order check, or refund request!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div style={{ position: 'fixed', bottom: '28px', right: '28px', zIndex: 9999 }}>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '9999px',
            padding: '12px 22px 12px 16px',
            boxShadow: '0 12px 35px -4px rgba(79, 70, 229, 0.5), 0 0 20px 0 rgba(124, 58, 237, 0.3)',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 700,
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          className="animate-float"
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <Bot size={18} />
            <span
              style={{
                position: 'absolute',
                top: '-1px',
                right: '-1px',
                width: '9px',
                height: '9px',
                backgroundColor: '#10b981',
                borderRadius: '50%',
                border: '2px solid #0f172a',
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
            <span style={{ lineHeight: 1.2 }}>NexusAI Agent</span>
            <span style={{ fontSize: '10px', color: '#c7d2fe', fontWeight: 500 }}>Online • Policy Active</span>
          </div>
        </button>
      )}

      {/* Main Glassmorphic Chat Window */}
      {isOpen && (
        <div
          style={{
            width: '420px',
            maxWidth: 'calc(100vw - 32px)',
            height: '640px',
            maxHeight: 'calc(100vh - 48px)',
            background: 'rgba(11, 15, 25, 0.94)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.7), 0 0 40px -10px rgba(99, 102, 241, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
          className="animate-fade-in"
        >
          {/* Top Bar Header */}
          <div
            style={{
              padding: '16px 20px',
              background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.6) 100%)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)',
                }}
              >
                <Bot size={22} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#f8fafc', margin: 0, letterSpacing: '-0.01em' }}>
                    NexusAI Support
                  </h3>
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#34d399',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      fontWeight: 600,
                    }}
                  >
                    Sheets v4
                  </span>
                </div>
                <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94a3b8' }}>
                  Policy Enforced • Auto Refund & Logs
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                onClick={clearChat}
                title="Reset Session"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '7px',
                  borderRadius: '8px',
                  display: 'flex',
                  transition: 'all 0.2s',
                }}
              >
                <RefreshCw size={14} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Minimize Chat"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '7px',
                  borderRadius: '8px',
                  display: 'flex',
                  transition: 'all 0.2s',
                }}
              >
                <Minimize2 size={14} />
              </button>
            </div>
          </div>

          {/* Quick Prompts Horizontal Rail */}
          <div
            style={{
              padding: '10px 14px',
              background: 'rgba(15, 23, 42, 0.6)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
              whiteSpace: 'nowrap',
            }}
          >
            {QUICK_ACTIONS.map((action, idx) => {
              const IconComponent = action.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(action.prompt)}
                  disabled={isLoading}
                  style={{
                    fontSize: '11px',
                    padding: '6px 12px',
                    borderRadius: '999px',
                    background: 'rgba(30, 41, 59, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#e2e8f0',
                    cursor: 'pointer',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s',
                    flexShrink: 0,
                  }}
                >
                  <IconComponent size={12} color={action.color} />
                  {action.label}
                </button>
              );
            })}
          </div>

          {/* Messages Feed */}
          <div
            style={{
              flex: 1,
              padding: '16px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              background: 'transparent',
            }}
          >
            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: m.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                {/* Visual Tool Execution Cards */}
                {m.toolsExecuted && m.toolsExecuted.length > 0 && (
                  <div style={{ width: '100%', maxWidth: '92%', marginBottom: '8px' }}>
                    {m.toolsExecuted.map((t, idx) => {
                      const isRefund = t.tool === 'processRefund';
                      const isOrder = t.tool === 'lookupOrder';
                      const isProduct = t.tool === 'lookupProduct';
                      const approved = t.output?.approved;

                      return (
                        <div
                          key={idx}
                          style={{
                            borderRadius: '12px',
                            padding: '12px 14px',
                            marginBottom: '6px',
                            background: isRefund
                              ? approved
                                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 78, 59, 0.3) 100%)'
                                : 'linear-gradient(135deg, rgba(244, 63, 94, 0.15) 0%, rgba(136, 19, 55, 0.3) 100%)'
                              : 'rgba(30, 41, 59, 0.6)',
                            border: `1px solid ${
                              isRefund
                                ? approved
                                  ? 'rgba(16, 185, 129, 0.4)'
                                  : 'rgba(244, 63, 94, 0.4)'
                                : 'rgba(99, 102, 241, 0.3)'
                            }`,
                            fontSize: '12px',
                          }}
                        >
                          {/* Tool Header */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                              {isRefund && (approved ? <ShieldCheck size={15} color="#10b981" /> : <ShieldAlert size={15} color="#f43f5e" />)}
                              {isOrder && <Package size={15} color="#6366f1" />}
                              {isProduct && <ShoppingBag size={15} color="#06b6d4" />}
                              <span style={{ color: isRefund ? (approved ? '#34d399' : '#fb7185') : '#818cf8' }}>
                                {isRefund && (approved ? 'Refund Decision: APPROVED' : 'Refund Decision: REJECTED')}
                                {isOrder && `Order Verified: #${t.input?.orderId || 'Active'}`}
                                {isProduct && `Inventory Queried: ${t.output?.totalFound || 0} Products`}
                              </span>
                            </div>
                            <span
                              style={{
                                fontSize: '10px',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background: 'rgba(255, 255, 255, 0.08)',
                                color: '#94a3b8',
                                fontFamily: 'var(--font-mono)',
                              }}
                            >
                              tool_call
                            </span>
                          </div>

                          {/* Tool Content Details */}
                          {isRefund && (
                            <div style={{ color: '#cbd5e1', lineHeight: 1.4 }}>
                              <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#94a3b8' }}>
                                Order: <strong style={{ color: '#ffffff' }}>#{t.output?.orderId}</strong> • Item: {t.output?.product}
                              </p>
                              <p style={{ margin: '0 0 6px', fontStyle: 'italic', fontSize: '11px' }}>
                                "{t.output?.policyReason}"
                              </p>
                              {approved && (
                                <div
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '11px',
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    background: 'rgba(16, 185, 129, 0.2)',
                                    color: '#6ee7b7',
                                    border: '1px solid rgba(16, 185, 129, 0.3)',
                                  }}
                                >
                                  <Mail size={12} /> Email Receipt Dispatched
                                </div>
                              )}
                            </div>
                          )}

                          {isOrder && t.output?.order && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '11px', color: '#94a3b8' }}>
                              <span>Customer: <strong style={{ color: '#ffffff' }}>{t.output.order.customer}</strong></span>
                              <span>Item: <strong style={{ color: '#ffffff' }}>{t.output.order.product}</strong></span>
                              <span>Age: <strong style={{ color: '#ffffff' }}>{t.output.order.daysAgo} days ago</strong></span>
                              <span>
                                Policy: <strong style={{ color: t.output.order.isReturnWindowOpen ? '#34d399' : '#fb7185' }}>
                                  {t.output.order.allowedReturnDays}d ({t.output.order.isReturnWindowOpen ? 'Eligible' : 'Expired'})
                                </strong>
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  style={{
                    maxWidth: '86%',
                    padding: '12px 16px',
                    borderRadius:
                      m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background:
                      m.role === 'user'
                        ? 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)'
                        : 'rgba(22, 29, 47, 0.85)',
                    color: '#ffffff',
                    fontSize: '13px',
                    lineHeight: '1.55',
                    border:
                      m.role === 'user'
                        ? '1px solid rgba(255, 255, 255, 0.15)'
                        : '1px solid rgba(255, 255, 255, 0.07)',
                    boxShadow:
                      m.role === 'user'
                        ? '0 6px 20px -4px rgba(79, 70, 229, 0.4)'
                        : '0 4px 15px -2px rgba(0, 0, 0, 0.3)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {m.content}
                </div>

                <span style={{ fontSize: '10px', color: '#64748b', marginTop: '4px', padding: '0 4px' }}>
                  {m.timestamp}
                </span>
              </div>
            ))}

            {/* Pulsing AI Execution Indicator */}
            {isLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '10px',
                    background: 'rgba(99, 102, 241, 0.15)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#818cf8',
                  }}
                >
                  <Bot size={18} />
                </div>
                <div
                  style={{
                    padding: '10px 16px',
                    background: 'rgba(22, 29, 47, 0.85)',
                    borderRadius: '16px 16px 16px 4px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#6366f1',
                      animation: 'pulseGlow 1.2s infinite ease-in-out',
                    }}
                  />
                  <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>
                    Evaluating policy & verifying Google Sheets...
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Email Recipient Collapsible Bar */}
          <div
            style={{
              padding: '6px 14px',
              background: 'rgba(15, 23, 42, 0.8)',
              borderTop: '1px solid rgba(255, 255, 255, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Mail size={12} color="#94a3b8" />
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                {customerEmail ? `Recipient: ${customerEmail}` : 'Refund email receipts (optional)'}
              </span>
            </div>
            <button
              onClick={() => setShowEmailInput(!showEmailInput)}
              style={{
                background: 'none',
                border: 'none',
                color: '#818cf8',
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {showEmailInput ? 'Hide' : customerEmail ? 'Edit' : '+ Set Email'}
            </button>
          </div>

          {showEmailInput && (
            <div
              style={{
                padding: '6px 14px 10px',
                background: 'rgba(15, 23, 42, 0.8)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              <input
                type="email"
                placeholder="customer@example.com (for automated refund confirmation)"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                style={{
                  width: '100%',
                  fontSize: '12px',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  background: 'rgba(30, 41, 59, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#ffffff',
                  outline: 'none',
                }}
              />
            </div>
          )}

          {/* Bottom Input Area */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            style={{
              padding: '12px 16px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'rgba(11, 15, 25, 0.98)',
            }}
          >
            <input
              type="text"
              placeholder="Ask about items, order ORD-101, or return request..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              style={{
                flex: 1,
                fontSize: '13px',
                padding: '12px 18px',
                borderRadius: '999px',
                background: 'rgba(22, 29, 47, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'rgba(99, 102, 241, 0.6)')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)')}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: input.trim()
                  ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'
                  : 'rgba(30, 41, 59, 0.8)',
                color: '#ffffff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: input.trim() ? 'pointer' : 'default',
                transition: 'all 0.2s',
                boxShadow: input.trim() ? '0 0 15px rgba(99, 102, 241, 0.5)' : 'none',
                flexShrink: 0,
              }}
            >
              <Send size={17} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
