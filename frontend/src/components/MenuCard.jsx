import React, { useState } from 'react';
import { useCart } from '../context/CartContext';

const FALLBACK = 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&auto=format&fit=crop';

const MenuCard = ({ item }) => {
  const { items, addItem, increaseQty, decreaseQty } = useCart();
  const [imgErr, setImgErr] = useState(false);

  const cartItem = items.find((i) => i._id === item._id);
  const qty = cartItem?.quantity || 0;

  return (
    <div
      className={`menu-card rounded-2xl overflow-hidden flex flex-col ${!item.available ? 'opacity-50 pointer-events-none' : ''}`}
      style={{
        background: '#f8faee',
        border: '1px solid rgba(214,153,60,0.18)',
        boxShadow: '0 2px 12px rgba(50,88,98,0.07)',
      }}
    >
      {/* Image */}
      <div className="relative h-32 overflow-hidden" style={{ background: '#f4eaa8' }}>
        <img
          src={imgErr ? FALLBACK : (item.image || FALLBACK)}
          alt={item.name}
          onError={() => setImgErr(true)}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 hover:scale-108"
          loading="lazy"
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(36,63,71,0.35) 0%, transparent 60%)' }} />

        {/* Veg badge */}
        <div className="absolute top-2 left-2 bg-white/90 rounded-md p-0.5 shadow-sm">
          {item.veg ? <div className="veg-icon" /> : <div className="nonveg-icon" />}
        </div>
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col flex-1">
        <h3
          className="font-semibold text-sm leading-tight line-clamp-1 mb-0.5"
          style={{ fontFamily: 'Poppins,sans-serif', color: '#1a1a1a' }}
        >
          {item.name}
        </h3>
        {item.description && (
          <p
            className="text-[11px] leading-relaxed line-clamp-2 flex-1 mb-2"
            style={{ color: '#64690c', fontFamily: 'Poppins,sans-serif' }}
          >
            {item.description}
          </p>
        )}

        <div className="flex items-center justify-between mt-auto pt-1.5"
          style={{ borderTop: '1px solid rgba(214,153,60,0.15)' }}>
          <span className="font-black text-sm" style={{ color: '#31603d', fontFamily: 'Poppins,sans-serif' }}>
            ₹{item.price}
          </span>

          {qty === 0 ? (
            <button
              onClick={() => addItem(item)}
              className="text-[11px] font-bold px-4 py-1.5 rounded-full transition-all duration-200 active:scale-95"
              style={{ background: '#940401', color: 'white', fontFamily: 'Poppins,sans-serif' }}
            >
              ADD
            </button>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full px-1 py-0.5"
              style={{ background: '#940901' }}>
              <button onClick={() => decreaseQty(item._id)}
                className="w-6 h-6 rounded-full bg-white font-black flex items-center justify-center text-base active:scale-90 transition-transform"
                style={{ color: '#325862' }}>
                −
              </button>
              <span className="text-white font-bold text-sm min-w-[16px] text-center"
                style={{ fontFamily: 'Poppins,sans-serif' }}>
                {qty}
              </span>
              <button onClick={() => increaseQty(item._id)}
                className="w-6 h-6 rounded-full bg-white font-black flex items-center justify-center text-base active:scale-90 transition-transform"
                style={{ color: '#325862' }}>
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MenuCard;
