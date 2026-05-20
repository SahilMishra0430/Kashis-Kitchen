/**
 * routes/analyticsRoutes.js
 *
 * Supports two frontend components:
 *  - AnalyticsPanel.jsx  → /overview, /weekly, /monthly, /yearly, /top-items
 *  - SalesAnalytics.jsx  → /sales?year=YYYY
 *
 * All routes are JWT-protected (admin only).
 * All data comes from the Orders collection via MongoDB aggregation pipelines.
 * Only "completed" orders are counted (not pending/cancelled).
 */

const express  = require('express');
const mongoose = require('mongoose');
const Order    = require('../models/Order');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ── All analytics routes require admin JWT ────────────────────────────────────
router.use(protect);

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — date boundaries
// ─────────────────────────────────────────────────────────────────────────────
const todayBounds = () => {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end   = new Date(); end.setHours(23, 59, 59, 999);
  return { start, end };
};

const monthBounds = () => {
  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
};

// Statuses that count as "revenue" (exclude pending/cancelled)
const COUNTED_STATUSES = ['accepted', 'preparing', 'ready', 'completed'];

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/analytics/overview
// Used by: AnalyticsPanel.jsx
// ─────────────────────────────────────────────────────────────────────────────
router.get('/overview', async (req, res) => {
  try {
    const { start: todayStart, end: todayEnd }   = todayBounds();
    const { start: monthStart, end: monthEnd }   = monthBounds();

    const [lifetime, thisMonth, today] = await Promise.all([
      // Lifetime totals
      Order.aggregate([
        { $match: { status: { $in: COUNTED_STATUSES } } },
        { $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            totalOrders:  { $sum: 1 },
        }},
      ]),

      // This month
      Order.aggregate([
        { $match: {
            status: { $in: COUNTED_STATUSES },
            createdAt: { $gte: monthStart, $lte: monthEnd },
        }},
        { $group: {
            _id: null,
            revenue: { $sum: '$totalAmount' },
            orders:  { $sum: 1 },
        }},
      ]),

      // Today
      Order.aggregate([
        { $match: {
            status: { $in: COUNTED_STATUSES },
            createdAt: { $gte: todayStart, $lte: todayEnd },
        }},
        { $group: {
            _id: null,
            revenue: { $sum: '$totalAmount' },
            orders:  { $sum: 1 },
        }},
      ]),
    ]);

    const lt = lifetime[0] || { totalRevenue: 0, totalOrders: 0 };
    const tm = thisMonth[0] || { revenue: 0, orders: 0 };
    const td = today[0]     || { revenue: 0, orders: 0 };

    res.json({
      lifetime: {
        totalRevenue:  lt.totalRevenue,
        totalOrders:   lt.totalOrders,
        avgOrderValue: lt.totalOrders > 0
          ? Math.round(lt.totalRevenue / lt.totalOrders)
          : 0,
      },
      thisMonth: { revenue: tm.revenue, orders: tm.orders },
      today:     { revenue: td.revenue, orders: td.orders },
    });
  } catch (err) {
    console.error('[analytics/overview]', err.message);
    res.status(500).json({ message: 'Failed to fetch overview.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/analytics/weekly
// Returns revenue + orders for each day of the current week (Mon–Sun)
// Used by: AnalyticsPanel.jsx
// ─────────────────────────────────────────────────────────────────────────────
router.get('/weekly', async (req, res) => {
  try {
    const now       = new Date();
    const dayOfWeek = now.getDay();                    // 0=Sun
    const monday    = new Date(now);
    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const rows = await Order.aggregate([
      { $match: {
          status: { $in: COUNTED_STATUSES },
          createdAt: { $gte: monday, $lte: sunday },
      }},
      { $group: {
          _id: { $dayOfWeek: '$createdAt' }, // 1=Sun, 2=Mon…7=Sat
          revenue: { $sum: '$totalAmount' },
          orders:  { $sum: 1 },
      }},
    ]);

    const DAY_LABELS = ['', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const map = {};
    rows.forEach(r => { map[r._id] = r; });

    // Build Mon–Sun array (indices 2–7, then 1)
    const order = [2, 3, 4, 5, 6, 7, 1];
    const result = order.map(d => ({
      label:   DAY_LABELS[d],
      revenue: map[d]?.revenue || 0,
      orders:  map[d]?.orders  || 0,
    }));

    res.json(result);
  } catch (err) {
    console.error('[analytics/weekly]', err.message);
    res.status(500).json({ message: 'Failed to fetch weekly data.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/analytics/monthly
// Returns revenue + orders for each month of the current year (Jan–Dec)
// Used by: AnalyticsPanel.jsx
// ─────────────────────────────────────────────────────────────────────────────
router.get('/monthly', async (req, res) => {
  try {
    const year  = new Date().getFullYear();
    const start = new Date(year, 0, 1);
    const end   = new Date(year, 11, 31, 23, 59, 59, 999);

    const rows = await Order.aggregate([
      { $match: {
          status: { $in: COUNTED_STATUSES },
          createdAt: { $gte: start, $lte: end },
      }},
      { $group: {
          _id:     { $month: '$createdAt' },
          revenue: { $sum: '$totalAmount' },
          orders:  { $sum: 1 },
      }},
    ]);

    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const map = {};
    rows.forEach(r => { map[r._id] = r; });

    const result = MONTHS.map((label, i) => ({
      label,
      revenue: map[i + 1]?.revenue || 0,
      orders:  map[i + 1]?.orders  || 0,
    }));

    res.json(result);
  } catch (err) {
    console.error('[analytics/monthly]', err.message);
    res.status(500).json({ message: 'Failed to fetch monthly data.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/analytics/yearly
// Returns revenue + orders grouped by year (all time)
// Used by: AnalyticsPanel.jsx
// ─────────────────────────────────────────────────────────────────────────────
router.get('/yearly', async (req, res) => {
  try {
    const rows = await Order.aggregate([
      { $match: { status: { $in: COUNTED_STATUSES } } },
      { $group: {
          _id:     { $year: '$createdAt' },
          revenue: { $sum: '$totalAmount' },
          orders:  { $sum: 1 },
      }},
      { $sort: { _id: 1 } },
    ]);

    const result = rows.map(r => ({
      label:   String(r._id),
      revenue: r.revenue,
      orders:  r.orders,
    }));

    res.json(result);
  } catch (err) {
    console.error('[analytics/yearly]', err.message);
    res.status(500).json({ message: 'Failed to fetch yearly data.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/analytics/top-items
// Returns top 8 best-selling items by quantity across all time
// Used by: AnalyticsPanel.jsx
// ─────────────────────────────────────────────────────────────────────────────
router.get('/top-items', async (req, res) => {
  try {
    const rows = await Order.aggregate([
      { $match: { status: { $in: COUNTED_STATUSES } } },
      { $unwind: '$items' },               // flatten items array
      { $group: {
          _id:      '$items.name',
          totalQty: { $sum: '$items.quantity' },
          revenue:  { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
      }},
      { $sort: { totalQty: -1 } },
      { $limit: 8 },
      { $project: {
          _id:      0,
          name:     '$_id',
          totalQty: 1,
          revenue:  1,
      }},
    ]);

    res.json(rows);
  } catch (err) {
    console.error('[analytics/top-items]', err.message);
    res.status(500).json({ message: 'Failed to fetch top items.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/analytics/sales?year=2025
// Full sales report for a given year
// Used by: SalesAnalytics.jsx
// ─────────────────────────────────────────────────────────────────────────────
router.get('/sales', async (req, res) => {
  try {
    const year  = parseInt(req.query.year) || new Date().getFullYear();
    const start = new Date(year, 0, 1);
    const end   = new Date(year, 11, 31, 23, 59, 59, 999);

    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    const [monthRows, topRows, yearRows] = await Promise.all([

      // Monthly breakdown for selected year
      Order.aggregate([
        { $match: {
            status: { $in: COUNTED_STATUSES },
            createdAt: { $gte: start, $lte: end },
        }},
        { $group: {
            _id:     { $month: '$createdAt' },
            orders:  { $sum: 1 },
            revenue: { $sum: '$totalAmount' },
        }},
        { $sort: { _id: 1 } },
      ]),

      // Top 7 items for selected year
      Order.aggregate([
        { $match: {
            status: { $in: COUNTED_STATUSES },
            createdAt: { $gte: start, $lte: end },
        }},
        { $unwind: '$items' },
        { $group: {
            _id:      '$items.name',
            quantity: { $sum: '$items.quantity' },
            revenue:  { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
        }},
        { $sort: { quantity: -1 } },
        { $limit: 7 },
        { $project: { _id: 0, name: '$_id', quantity: 1, revenue: 1 } },
      ]),

      // Available years (for year picker dropdown)
      Order.aggregate([
        { $match: { status: { $in: COUNTED_STATUSES } } },
        { $group: { _id: { $year: '$createdAt' } } },
        { $sort: { _id: -1 } },
      ]),
    ]);

    // Build full 12-month array (zero-fill months with no orders)
    const monthMap = {};
    monthRows.forEach(r => { monthMap[r._id] = r; });

    const monthlyData = MONTHS.map((month, i) => ({
      month,
      orders:  monthMap[i + 1]?.orders  || 0,
      revenue: monthMap[i + 1]?.revenue || 0,
    }));

    // Summary stats
    const totalOrders  = monthlyData.reduce((s, m) => s + m.orders, 0);
    const totalRevenue = monthlyData.reduce((s, m) => s + m.revenue, 0);
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    // Best month = highest revenue
    const bestMonthObj = [...monthlyData].sort((a, b) => b.revenue - a.revenue)[0];
    const bestMonth    = bestMonthObj?.revenue > 0 ? bestMonthObj.month : null;

    res.json({
      summary: { totalOrders, totalRevenue, avgOrderValue, bestMonth },
      monthlyData,
      topItems:       topRows,
      availableYears: yearRows.map(r => r._id),
    });
  } catch (err) {
    console.error('[analytics/sales]', err.message);
    res.status(500).json({ message: 'Failed to fetch sales analytics.' });
  }
});

module.exports = router;
