import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import MenuCard from '../components/MenuCard';
import Cart from '../components/Cart';
import OrderModal from '../components/OrderModal';
import WelcomeModal from '../components/WelcomeModal';
import { useCart } from '../context/CartContext';
import api from '../api/axios';

const SUPER_CATEGORIES = ['All Items', 'Meals', 'Snacks', 'Salad & Soup', 'Beverages'];

const CustomerMenu = () => {
  const [searchParams] = useSearchParams();
  const tableFromQR = searchParams.get('table') || '';

  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSuperCat, setActiveSuperCat] = useState('All Items');
  const [activeSubCat, setActiveSubCat] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [shopClosed, setShopClosed] = useState(false);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const { toggleCart, totalItems, totalAmount } = useCart();

  useEffect(() => { fetchMenu(); }, []);

  const fetchMenu = async () => {
    try {
      setLoading(true);
      const res = await api.get('/menu');
      setMenuItems(res.data);
    } catch (err) {
      if (err.response?.status === 403) {
        setShopClosed(true);
      } else {
        setError('Failed to load menu. Please refresh.');
      }
    } finally {
      setLoading(false);
    }
  };

  const subCategories = useCallback(() => {
    const pool = activeSuperCat === 'All Items'
      ? menuItems
      : menuItems.filter((i) => i.superCategory === activeSuperCat);
    return ['All', ...new Set(pool.map((i) => i.subCategory))];
  }, [menuItems, activeSuperCat]);

  useEffect(() => { setActiveSubCat('All'); }, [activeSuperCat]);

  const filteredItems = useCallback(() => {
    let items = menuItems.filter((i) => i.available);
    if (activeSuperCat !== 'All Items') items = items.filter((i) => i.superCategory === activeSuperCat);
    if (activeSubCat !== 'All') items = items.filter((i) => i.subCategory === activeSubCat);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((i) =>
        i.name.toLowerCase().includes(q) ||
        (i.description || '').toLowerCase().includes(q) ||
        i.subCategory.toLowerCase().includes(q)
      );
    }
    return items;
  }, [menuItems, activeSuperCat, activeSubCat, searchQuery]);

  const groupedItems = useCallback(() => {
    const groups = {};
    filteredItems().forEach((item) => {
      if (!groups[item.subCategory]) groups[item.subCategory] = [];
      groups[item.subCategory].push(item);
    });
    return groups;
  }, [filteredItems]);

  const subs = subCategories();
  const groups = groupedItems();
  const hasItems = Object.keys(groups).length > 0;

  return (
    <div className="min-h-screen font-poppins" style={{ background: '#f8eecb' }}>

      {/* ✅ ADD THIS BLOCK — shop closed screen */}
      {shopClosed && (
        <div
          className="min-h-screen flex flex-col items-center justify-center text-center px-6"
          style={{ background: '#f8eecb' }}
        >
          <div className="text-6xl mb-5">🔒</div>
          <p
            className="font-black text-xl mb-2"
            style={{ fontFamily: 'Playfair Display, serif', color: '#982829' }}
          >
            We're Closed Right Now
          </p>
          <p
            className="text-sm font-medium"
            style={{ fontFamily: 'Poppins, sans-serif', color: '#6b6b4a' }}
          >
            Shop is currently closed. Please visit later.
          </p>
        </div>
      )}

      {/* ✅ STEP 2 — Wrap ALL your existing content in this */}
      {!shopClosed && (
        <> {/* Welcome modal — shows once per session */}
          <WelcomeModal tableNo={tableFromQR ? `Table ${tableFromQR}` : ''} />

          <Navbar onCartClick={toggleCart} />

          {/* QR Table banner */}
          {tableFromQR && (
            <div className="text-center py-2 px-4 text-xs font-semibold tracking-widest uppercase"
              style={{ background: 'linear-gradient(90deg,#982829,#d6993c)', color: 'white' }}>
              📍 Table {tableFromQR} — Ordering from your table
            </div>
          )}

          {/* Search */}
          <div className="sticky top-16 z-30 shadow-sm px-4 py-2.5"
            style={{ background: '#', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(214,153,60,0.2)' }}>
            <div className="max-w-lg mx-auto">
              <div className="relative">
                <svg viewBox="0 0 24 24" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ fill: '#325862', opacity: 0.5 }}>
                  <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search dishes…"
                  className="w-full rounded-full pl-10 pr-10 py-2.5 text-sm font-medium focus:outline-none transition-all"
                  style={{
                    background: 'white',
                    border: '1.5px solid rgba(214,153,60,0.3)',
                    color: '#1a1a1a',
                    fontFamily: 'Poppins, sans-serif',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#325862'; e.target.style.boxShadow = '0 0 0 3px rgba(50,88,98,0.12)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'rgba(214,153,60,0.3)'; e.target.style.boxShadow = 'none'; }}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: '#325862', opacity: 0.5 }}>
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Super Category Tabs */}
          {!searchQuery && (
            <div className="sticky top-[125px] z-20 shadow-md"
              style={{ background: '#940901' }}>
              <div className="max-w-lg mx-auto">
                <div className="flex overflow-x-auto no-scrollbar px-3 py-2.5 gap-1.5">
                  {SUPER_CATEGORIES.map((cat) => {
                    const active = activeSuperCat === cat;
                    const count = cat === 'All Items'
                      ? menuItems.filter((i) => i.available).length
                      : menuItems.filter((i) => i.superCategory === cat && i.available).length;
                    return (
                      <button key={cat} onClick={() => setActiveSuperCat(cat)}
                        className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-250 flex items-center gap-1.5"
                        style={{
                          fontFamily: 'Poppins, sans-serif',
                          background: active ? '#ffeb5b' : 'transparent',
                          color: active ? '#1a1a1a' : 'rgba(244,234,168,0.75)',
                          boxShadow: active ? '0 2px 10px rgba(0, 0, 0, 0.45)' : 'none',
                          border: active ? 'none' : '1px solid #dbc5ae',
                        }}
                      >
                        {cat}
                        {count > 0 && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                            style={{ background: active ? 'rgba(0,0,0,0.15)' : 'rgba(214,153,60,0.3)', color: active ? '#1a1a1a' : '#d6993c' }}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Sub Category Pills */}
          {!searchQuery && subs.length > 2 && (
            <div className="sticky top-[178px] z-40" style={{ background: '#d50801', borderBottom: '1px solid rgba(214,153,60,0.15)' }}>
              <div className="max-w-lg mx-auto">
                <div className="flex overflow-x-auto no-scrollbar px-3 py-2 gap-1.5">
                  {subs.map((sub) => {
                    const active = activeSubCat === sub;
                    return (
                      <button key={sub} onClick={() => setActiveSubCat(sub)}
                        className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-200"
                        style={{
                          fontFamily: 'Poppins, sans-serif',
                          background: active ? '#4e2c21' : '#d89d5d',
                          color: active ? 'white' : '#4e2c21',
                          borderColor: active ? '#dbc5ae' : 'rgba(229, 229, 229, 0.25)',
                        }}
                      >
                        {sub}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Main content */}
          <main className="max-w-lg mx-auto px-4 pb-28">
            {loading ? (
              <div className="py-20 flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-gray-200 rounded-full spin" style={{ borderTopColor: '#d6993c' }} />
                <p className="text-sm font-medium" style={{ color: '#325862', fontFamily: 'Poppins,sans-serif' }}>Loading menu…</p>
              </div>
            ) : error ? (
              <div className="py-16 text-center">
                <p className="font-medium mb-3 text-red-600">{error}</p>
                <button onClick={fetchMenu} className="btn-primary px-6 py-2 rounded-full text-sm">Retry</button>
              </div>
            ) : !hasItems ? (
              <div className="py-20 text-center">
                <div className="text-5xl mb-3">🍽️</div>
                <p className="font-bold text-lg" style={{ color: '#325862', fontFamily: 'Playfair Display,serif' }}>Nothing here</p>
                <p className="text-sm mt-1" style={{ color: '#6b6b4a' }}>
                  {searchQuery ? 'Try a different search' : 'Check back soon'}
                </p>
              </div>
            ) : (
              <div className="bg-black bg-menu-section rounded-full mt-4 p-3 space-y-6" style={{ background: '#d89d5d' }}>
                {Object.entries(groups).map(([subCat, items]) => (
                  <div key={subCat}>
                    {/* Section header */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg,black,transparent)' }} />
                      <h2 className="text-xs uppercase tracking-[0.25em] px-2 font-bold"
                        style={{ fontFamily: 'Poppins,sans-serif', color: '#000000' }}>
                        {subCat}
                      </h2>
                      <div className="h-px flex-1" style={{ background: 'linear-gradient(270deg,black,transparent)' }} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {items.map((item) => <MenuCard key={item._id} item={item} />)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>

          {/* Floating cart bar */}
          {totalItems > 0 && (
            <div className="fixed bottom-5 left-0 right-0 flex justify-center z-30 px-4">
              <button onClick={toggleCart}
                className="text-white rounded-2xl py-3.5 px-5 flex items-center gap-3 active:scale-[0.98] transition-all max-w-sm w-full shadow-gold-lg"
                style={{ background: 'linear-gradient(135deg,#982829,#d6993c)', fontFamily: 'Poppins,sans-serif' }}>
                <div className="bg-white rounded-xl w-8 h-8 flex items-center justify-center font-black text-sm flex-shrink-0"
                  style={{ color: '#982829' }}>
                  {totalItems}
                </div>
                <span className="font-bold tracking-widest text-sm uppercase flex-1 text-center">View Cart</span>
                <span className="font-black text-sm opacity-90">₹{totalAmount}</span>
              </button>
            </div>
          )}

          <Cart onCheckout={() => setOrderModalOpen(true)} />
          <OrderModal
            isOpen={orderModalOpen}
            onClose={() => setOrderModalOpen(false)}
            tableFromQR={tableFromQR}
          />
        </>
      )}
    </div>
  );


};

export default CustomerMenu;
