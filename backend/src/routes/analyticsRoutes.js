@'
const express = require("express");
const { protect } = require("../middleware/auth");
const {
    getSalesAnalytics,
    getOverview,
    getChartData,
    getTopItems,
} = require("../controllers/analyticsController");

const router = express.Router();
router.use(protect);

router.get("/sales",      getSalesAnalytics);
router.get("/overview",   getOverview);
router.get("/weekly",     getChartData);
router.get("/monthly",    getChartData);
router.get("/yearly",     getChartData);
router.get("/top-items",  getTopItems);

module.exports = router;
'@ | Set-Content -Path "src\routes\analyticsRoutes.js" -Encoding UTF8