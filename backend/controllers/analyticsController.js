// controllers/analyticsController.js
// ─────────────────────────────────────────────────────────────────────────
//  Assumptions about the Order model:
//    order.totalPrice  – Number   (total value of the order)
//    order.status      – String   (cancelled orders are excluded)
//    order.createdAt   – Date
//    order.items[]     – Array of { name: String, quantity: Number, price: Number }
//
//  If your field names differ, adjust the references below.
// ─────────────────────────────────────────────────────────────────────────

const Order = require("../models/Order"); // adjust path if needed

// Orders with these statuses are excluded from every calculation
const EXCLUDED_STATUSES = ["cancelled"];

// ── helper: match filter that excludes cancelled orders ───────────────────
const activeMatch = (extraConditions = {}) => ({
    status: { $nin: EXCLUDED_STATUSES },
    ...extraConditions,
});

// ─────────────────────────────────────────────────────────────────────────
// GET /api/analytics/overview
// Returns: { lifetime, thisMonth, today }
// ─────────────────────────────────────────────────────────────────────────
const getOverview = async (req, res) => {
    try {
        const now = new Date();

        const startOfToday = new Date(now);
        startOfToday.setHours(0, 0, 0, 0);

        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Run three aggregations in parallel
        const [lifetimeAgg, thisMonthAgg, todayAgg] = await Promise.all([
            Order.aggregate([
                { $match: activeMatch() },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: "$totalPrice" },
                        totalOrders:  { $sum: 1 },
                    },
                },
            ]),
            Order.aggregate([
                { $match: activeMatch({ createdAt: { $gte: startOfMonth } }) },
                {
                    $group: {
                        _id: null,
                        revenue: { $sum: "$totalPrice" },
                        orders:  { $sum: 1 },
                    },
                },
            ]),
            Order.aggregate([
                { $match: activeMatch({ createdAt: { $gte: startOfToday } }) },
                {
                    $group: {
                        _id: null,
                        revenue: { $sum: "$totalPrice" },
                        orders:  { $sum: 1 },
                    },
                },
            ]),
        ]);

        const lt = lifetimeAgg[0] || { totalRevenue: 0, totalOrders: 0 };

        res.json({
            lifetime: {
                totalRevenue:  lt.totalRevenue,
                totalOrders:   lt.totalOrders,
                avgOrderValue: lt.totalOrders > 0
                    ? Math.round(lt.totalRevenue / lt.totalOrders)
                    : 0,
            },
            thisMonth: {
                revenue: thisMonthAgg[0]?.revenue ?? 0,
                orders:  thisMonthAgg[0]?.orders  ?? 0,
            },
            today: {
                revenue: todayAgg[0]?.revenue ?? 0,
                orders:  todayAgg[0]?.orders  ?? 0,
            },
        });
    } catch (err) {
        console.error("[getOverview]", err);
        res.status(500).json({ message: "Failed to fetch overview analytics" });
    }
};

// ─────────────────────────────────────────────────────────────────────────
// GET /api/analytics/weekly  → last 7 days
// GET /api/analytics/monthly → months of current year
// GET /api/analytics/yearly  → all years
//
// Returns: Array<{ label: string, revenue: number, orders: number }>
// ─────────────────────────────────────────────────────────────────────────
const getChartData = async (req, res) => {
    // Derive period from the request path (/weekly | /monthly | /yearly)
    const period = req.path.replace("/", ""); // "weekly" | "monthly" | "yearly"

    try {
        const now = new Date();
        let matchCondition = {};
        let groupId = {};
        let labelFn;       // (doc) => string
        let skeleton = []; // ordered labels with zero defaults

        if (period === "weekly") {
            // Last 7 full days (today included)
            const sevenDaysAgo = new Date(now);
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
            sevenDaysAgo.setHours(0, 0, 0, 0);

            matchCondition = { createdAt: { $gte: sevenDaysAgo } };
            groupId = {
                year:  { $year:  "$createdAt" },
                month: { $month: "$createdAt" },
                day:   { $dayOfMonth: "$createdAt" },
            };

            // Build skeleton: last 7 days as "Mon", "Tue" …
            const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
            skeleton = Array.from({ length: 7 }).map((_, i) => {
                const d = new Date(sevenDaysAgo);
                d.setDate(d.getDate() + i);
                return {
                    key: `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`,
                    label: DAY_NAMES[d.getDay()],
                };
            });

            labelFn = (doc) =>
                `${doc._id.year}-${doc._id.month}-${doc._id.day}`;

        } else if (period === "monthly") {
            // All 12 months of the current year
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            matchCondition = { createdAt: { $gte: startOfYear } };
            groupId = {
                year:  { $year:  "$createdAt" },
                month: { $month: "$createdAt" },
            };

            const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun",
                                 "Jul","Aug","Sep","Oct","Nov","Dec"];
            skeleton = MONTH_NAMES.map((label, i) => ({
                key: `${now.getFullYear()}-${i + 1}`,
                label,
            }));

            labelFn = (doc) => `${doc._id.year}-${doc._id.month}`;

        } else {
            // yearly – one bucket per calendar year
            groupId = { year: { $year: "$createdAt" } };

            // Skeleton built after query (dynamic year range)
            labelFn = (doc) => String(doc._id.year);
        }

        const pipeline = [
            { $match: activeMatch(matchCondition) },
            {
                $group: {
                    _id:     groupId,
                    revenue: { $sum: "$totalPrice" },
                    orders:  { $sum: 1 },
                },
            },
            { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
        ];

        const raw = await Order.aggregate(pipeline);

        // Map results by key for O(1) lookup
        const byKey = {};
        raw.forEach((doc) => {
            byKey[labelFn(doc)] = { revenue: doc.revenue, orders: doc.orders };
        });

        let result;

        if (period === "yearly") {
            // Dynamic skeleton: from earliest year to current year
            if (raw.length === 0) {
                result = [];
            } else {
                const minYear = raw[0]._id.year;
                const maxYear = now.getFullYear();
                result = [];
                for (let y = minYear; y <= maxYear; y++) {
                    const entry = byKey[String(y)] || { revenue: 0, orders: 0 };
                    result.push({ label: String(y), ...entry });
                }
            }
        } else {
            result = skeleton.map(({ key, label }) => {
                const entry = byKey[key] || { revenue: 0, orders: 0 };
                return { label, ...entry };
            });
        }

        res.json(result);
    } catch (err) {
        console.error("[getChartData]", err);
        res.status(500).json({ message: "Failed to fetch chart data" });
    }
};

// ─────────────────────────────────────────────────────────────────────────
// GET /api/analytics/top-items
// Returns top 8 items by quantity sold (all time).
// Array<{ name: string, totalQty: number, revenue: number }>
// ─────────────────────────────────────────────────────────────────────────
const getTopItems = async (req, res) => {
    try {
        const topItems = await Order.aggregate([
            { $match: activeMatch() },
            { $unwind: "$items" },
            {
                $group: {
                    _id:      "$items.name",
                    totalQty: { $sum: "$items.quantity" },
                    revenue:  { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
                },
            },
            { $sort: { totalQty: -1 } },
            { $limit: 8 },
            {
                $project: {
                    _id:      0,
                    name:     "$_id",
                    totalQty: 1,
                    revenue:  1,
                },
            },
        ]);

        res.json(topItems);
    } catch (err) {
        console.error("[getTopItems]", err);
        res.status(500).json({ message: "Failed to fetch top items" });
    }
};

// ─────────────────────────────────────────────────────────────────────────
// Existing controller — kept intact
// ─────────────────────────────────────────────────────────────────────────
const getSalesAnalytics = async (req, res) => {
    try {
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const startOfYear = new Date(year, 0, 1);
        const endOfYear   = new Date(year + 1, 0, 1);

        const [summary, monthlyData, topItems, availableYears] = await Promise.all([
            // Summary KPIs for the year
            Order.aggregate([
                { $match: activeMatch({ createdAt: { $gte: startOfYear, $lt: endOfYear } }) },
                {
                    $group: {
                        _id:          null,
                        totalRevenue: { $sum: "$totalPrice" },
                        totalOrders:  { $sum: 1 },
                    },
                },
            ]),
            // Monthly breakdown
            Order.aggregate([
                { $match: activeMatch({ createdAt: { $gte: startOfYear, $lt: endOfYear } }) },
                {
                    $group: {
                        _id:     { month: { $month: "$createdAt" } },
                        revenue: { $sum: "$totalPrice" },
                        orders:  { $sum: 1 },
                    },
                },
                { $sort: { "_id.month": 1 } },
            ]),
            // Top items for the year
            Order.aggregate([
                { $match: activeMatch({ createdAt: { $gte: startOfYear, $lt: endOfYear } }) },
                { $unwind: "$items" },
                {
                    $group: {
                        _id:      "$items.name",
                        totalQty: { $sum: "$items.quantity" },
                        revenue:  { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
                    },
                },
                { $sort: { totalQty: -1 } },
                { $limit: 10 },
            ]),
            // Available years
            Order.aggregate([
                { $match: activeMatch() },
                { $group: { _id: { $year: "$createdAt" } } },
                { $sort: { _id: -1 } },
            ]),
        ]);

        const kpis = summary[0] || { totalRevenue: 0, totalOrders: 0 };

        res.json({
            summary: {
                totalRevenue:  kpis.totalRevenue,
                totalOrders:   kpis.totalOrders,
                avgOrderValue: kpis.totalOrders > 0
                    ? Math.round(kpis.totalRevenue / kpis.totalOrders)
                    : 0,
            },
            monthlyData,
            topItems,
            availableYears: availableYears.map((y) => y._id),
        });
    } catch (err) {
        console.error("[getSalesAnalytics]", err);
        res.status(500).json({ message: "Failed to fetch sales analytics" });
    }
};

module.exports = { getSalesAnalytics, getOverview, getChartData, getTopItems };
