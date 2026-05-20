// routes/analyticsRoutes.js
// ─────────────────────────────────────────────────────────────────────────
//  Analytics API routes. All endpoints require admin JWT.
// ─────────────────────────────────────────────────────────────────────────

const express = require("express");
const { protect } = require("../middleware/auth");
const {
    getSalesAnalytics,
    getOverview,
    getChartData,
    getTopItems,
} = require("../controllers/analyticsController");

const router = express.Router();

// All analytics routes are admin-protected
router.use(protect);

/**
 * GET /api/analytics/sales
 * Legacy route kept intact.
 */
router.get("/sales", getSalesAnalytics);

/**
 * GET /api/analytics/overview
 * Returns lifetime KPIs + this-month + today summary.
 */
router.get("/overview", getOverview);

/**
 * GET /api/analytics/weekly   → last 7 days  (label = Mon/Tue…)
 * GET /api/analytics/monthly  → months of current year (label = Jan/Feb…)
 * GET /api/analytics/yearly   → one entry per year (label = 2023/2024…)
 * Each item: { label, revenue, orders }
 */
router.get("/weekly",  getChartData);
router.get("/monthly", getChartData);
router.get("/yearly",  getChartData);

/**
 * GET /api/analytics/top-items
 * Returns top 8 items by quantity sold.
 * Each item: { name, totalQty, revenue }
 */
router.get("/top-items", getTopItems);

module.exports = router;
