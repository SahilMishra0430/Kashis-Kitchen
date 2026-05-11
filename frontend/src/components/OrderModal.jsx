import React, { useState, useEffect, useRef } from 'react';
import { useCart } from '../context/CartContext';
import api from '../api/axios';
import toast from 'react-hot-toast';

const OrderModal = ({ isOpen, onClose, tableFromQR }) => {
  const { items, totalAmount, clearCart } = useCart();
  const [step, setStep] = useState('form');
  const [name, setName] = useState('');
  const [table, setTable] = useState(tableFromQR || '');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderId, setOrderId] = useState(null);
  const [orderStatus, setOrderStatus] = useState('pending');
  const [savedTotal, setSavedTotal] = useState(0);
  const pollRef = useRef(null);
  const prevStatusRef = useRef('pending');

  useEffect(() => {
    if (tableFromQR) setTable(tableFromQR);
  }, [tableFromQR]);

  // ── Real-time polling every 3 seconds ──────────────────────────────────────
  useEffect(() => {
    if (step !== 'success' || !orderId) return;

    const STATUS_TOASTS = {
      accepted:  { msg: '✅ Order accepted by the kitchen!', icon: '🍳' },
      preparing: { msg: '👨‍🍳 Chef is now preparing your food!', icon: '🔥' },
      ready:     { msg: '🎉 Your food is ready — enjoy!',    icon: '🍽️' },
      completed: { msg: '🙏 Thanks for dining with us!',     icon: '☕' },
    };

    const poll = async () => {
      try {
        const res = await api.get(`/orders/track/${orderId}`);
        const newStatus = res.data.status;
        if (newStatus !== prevStatusRef.current) {
          prevStatusRef.current = newStatus;
          setOrderStatus(newStatus);
          if (STATUS_TOASTS[newStatus]) {
            toast.success(STATUS_TOASTS[newStatus].msg, {
              duration: 5000,
              icon: STATUS_TOASTS[newStatus].icon,
            });
          }
          if (['ready', 'completed'].includes(newStatus)) {
            clearInterval(pollRef.current);
          }
        }
      } catch (_) {}
    };

    poll(); // immediate first check
    pollRef.current = setInterval(poll, 3000);
    return () => clearInterval(pollRef.current);
  }, [step, orderId]);

  const handleClose = () => {
    setStep('form');
    setName('');
    setTable(tableFromQR || '');
    setNote('');
    setError('');
    setOrderId(null);
    setOrderStatus('pending');
    prevStatusRef.current = 'pending';
    clearInterval(pollRef.current);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setError('Please enter your name.');
    if (!table.trim()) return setError('Please enter your table number.');
    if (items.length === 0) return setError('Your cart is empty.');

    setLoading(true);
    setError('');

    try {
      const payload = {
        customerName: name.trim(),
        tableNumber: table.trim(),
        note: note.trim(),
        items: items.map((i) => ({
          menuItem: i._id,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          veg: i.veg,
        })),
      };

      const res = await api.post('/orders', payload);
      setSavedTotal(totalAmount);
      setOrderId(res.data._id);
      setStep('success');
      clearCart();
      toast.success('Order placed! Kitchen notified.', { icon: '🛎️', duration: 4000 });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const statusConfig = {
    pending:   { label: 'Order Received',  icon: '⏳', color: '#ffeb5e', bg: '#fef3c7', desc: 'Waiting for kitchen confirmation…' },
    accepted:  { label: 'Order Accepted!', icon: '✅', color: '#0f742fd0', bg: '#d1fae5', desc: 'Your order is confirmed and being prepared.' },
    preparing: { label: 'Preparing…',      icon: '👨‍🍳', color: '#d8ebab', bg: '#dbeafe', desc: "Chef is cooking your food. Won't be long!" },
    ready:     { label: 'Ready to Serve!', icon: '🎉', color: '#0d571f', bg: '#ecfdf5', desc: "Your food is ready! We'll bring it to your table." },
    completed: { label: 'Completed',       icon: '🍽️', color: '#6b7280', bg: '#f3f4f6', desc: 'Thank you for dining with Diesel Café!' },
  };

  const status = statusConfig[orderStatus] || statusConfig.pending;
  const statusSteps = ['pending', 'accepted', 'preparing', 'ready'];
  const currentIdx = statusSteps.indexOf(orderStatus);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-50 fade-in"
        onClick={handleClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 left-0 right-0 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-md w-full z-50 slide-up">
        <div
          className="rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto"
          style={{ background: '#ae7b45' }}
        >
          {/* Pull handle */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-10 h-1 rounded-full" style={{ background: '#ffffff' }} />
          </div>

          {/* ── FORM STEP ──────────────────────────────────────────── */}
          {step === 'form' && (
            <>
              <div className="px-6 pt-5 pb-2">
                <h2 className="font-black text-xl tracking-wide" style={{ color: '#ffffff' }}>
                  PLACE ORDER
                </h2>
                <p className="text-gray-100 text-sm mt-1">
                  {items.length} item(s) &nbsp;·&nbsp; ₹{totalAmount}
                </p>
              </div>

              {/* Order summary */}
              <div className="mx-6 bg-white my-3 rounded-2xl p-3 border border-gray-300 space-y-1.5 max-h-36 overflow-y-auto" style={{ background: '#f6eee5' }} >
                {items.map((item) => (
                  <div key={item._id} className="flex justify-between text-sm">
                    <span className="text-gray-700 font-medium">
                      {item.name}{' '}
                      <span className="text-gray-800 font-normal">×{item.quantity}</span>
                    </span>
                    <span className="font-bold" style={{ color: '#31603D' }}>
                      ₹{item.price * item.quantity}
                    </span>
                  </div>
                ))}
                <div className="border-t border-gray-100 pt-2 flex justify-between">
                  <span className="font-black text-gray-800 text-sm">Total</span>
                  <span className="font-black" style={{ color: '#31603D' }}>
                    ₹{totalAmount}
                  </span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
                <div>
                  <label className="block font-bold text-sm mb-1.5 text-gray-100">
                    Your Name <span style={{ color: 'white' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="input-base"
                    maxLength={50}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block font-bold text-sm mb-1.5 text-gray-100">
                    Table Number <span style={{ color: 'white' }}>*</span>
                  </label>
                  <input
                    type="number"
                    value={table}
                    onChange={(e) => setTable(e.target.value)}
                    placeholder="e.g. Table 5"
                    className="input-base"
                    readOnly={!!tableFromQR}
                    style={tableFromQR ? { background: '#f9fafb', color: '#6b7280' } : {}}
                    maxLength={20}
                  />
                  {tableFromQR && (
                    <p className="text-gray-00 text-xs mt-1 flex items-center gap-1">
                      <span>📍</span> Auto-detected from QR code
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-sm mb-1.5 text-gray-100">
                    Special Note{' '}
                    <span className="text-gray-100 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Allergies or special requests?"
                    rows={2}
                    className="input-base resize-none"
                    maxLength={200}
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm font-medium">
                    ⚠️ {error}
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 border-2 border-gray-600 text-gray-500 font-bold py-3 rounded-2xl text-sm hover:bg-gray-100 active:scale-[0.98] transition-all" style={{background: '#f6eee5', borderColor: '#940901', color: '#940901'}}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary flex-1 py-3 rounded-2xl text-sm tracking-widest uppercase disabled:opacity-20 disabled:cursor-not-allowed" style={{background:'#940901'}}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full spin inline-block" />
                        Placing…
                      </span>
                    ) : (
                      'CONFIRM'
                    )}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ── SUCCESS / TRACKING STEP ────────────────────────────── */}
          {step === 'success' && (
            <div className="px-6 py-8 text-center">
              {/* Status icon */}
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl pop-in"
                style={{ background: status.bg }}
              >
                {status.icon}
              </div>

              <h2 className="font-black text-2xl mb-2" style={{ color: status.color }}>
                {status.label}
              </h2>
              <p className="text-gray-200 text-sm leading-relaxed mb-5">{status.desc}</p>

              {/* Order detail card */}
              <div className="bg-white rounded-2xl p-4 border border-gray-100 text-left mb-5 shadow-sm">
                <p className="text-[10px] font-black text-black uppercase tracking-widest mb-3">
                  Order Summary
                </p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-black">Name</span>
                    <span className="font-bold text-black">{name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black">Table</span>
                    <span className="font-bold text-black">{table}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-50 pt-1.5 mt-1.5">
                    <span className="text-black">Total Paid</span>
                    <span className="font-black" style={{ color: '#31603D' }}>₹{savedTotal}</span>
                  </div>
                </div>
              </div>

              {/* Progress timeline */}
              <div className="bg-white rounded-2xl p-4 mb-5 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  {statusSteps.map((s, idx) => (
                    <React.Fragment key={s}>
                      <div className="flex flex-col items-center gap-1">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-500"
                          style={{
                            background: idx <= currentIdx ? '#940901' : '#f3f4f6',
                            color: idx <= currentIdx ? 'white' : '#9ca3af',
                            transform: idx === currentIdx ? 'scale(1.15)' : 'scale(1)',
                            boxShadow: idx === currentIdx ? '0 0 0 4px #94080161' : 'none',
                          }}
                        >
                          {idx < currentIdx ? '✓' : idx + 1}
                        </div>
                      </div>
                      {idx < statusSteps.length - 1 && (
                        <div
                          className="flex-1 h-1 mx-1 rounded-full transition-all duration-700"
                          style={{ background: idx < currentIdx ? '#940901' : '#940901' }}
                        />
                      )}
                    </React.Fragment>
                  ))}
                </div>
                <div className="flex justify-between px-0.5">
                  {['Received', 'Accepted', 'Cooking', 'Ready'].map((l, i) => (
                    <span
                      key={l}
                      className="text-[9px] font-bold"
                      style={{ color: i <= currentIdx ? '#940901' : '#838587' }}
                    >
                      {l}
                    </span>
                  ))}
                </div>
              </div>

              {/* Live indicator */}
              {!['ready', 'completed'].includes(orderStatus) && (
                <p className="text-gray-100 text-xs mb-5 flex items-center justify-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full bg-green-400 inline-block"
                    style={{ animation: 'pulse 1.4s ease-in-out infinite', color: '#ffffff' }}
                  />
                  Updating every 3 seconds
                </p>
              )}

              <button
                onClick={handleClose}
                className="btn-primary w-full py-3.5 rounded-2xl text-sm tracking-widest uppercase" style={{background: '#940801a8'}}
              >
                Back to Menu
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default OrderModal;
