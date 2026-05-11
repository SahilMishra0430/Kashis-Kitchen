// components/SalesAnalytics.jsx
// ─────────────────────────────────────────────────────────────────────────
//  Professional sales analytics panel for the Diesel Café admin dashboard.
//
//  Design system: matches existing AdminDashboard exactly —
//    bg-espresso/60, border-gold/10, font-heading, text-mist, text-gold,
//    bg-roast, rounded-2xl, font-body patterns.
//
//  Dependencies: recharts (npm install recharts)
// ─────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import {
  LineChart, Line,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import api from "../api/axios";
import toast from "react-hot-toast";

// ─────────────────────────────────────────────────────────────────────────
//  SHARED CHART THEME — keeps charts consistent with the café palette
// ─────────────────────────────────────────────────────────────────────────
const CHART_COLORS = {
  gold:        "#C8A96E",
  goldLight:   "#D4B87A",
  cream:       "#E8D5B7",
  muted:       "rgba(245,236,215,0.12)",
  gridLine:    "rgba(200,169,110,0.08)",
  tooltipBg:   "#2C1810",
  tooltipBorder: "rgba(200,169,110,0.25)",
};

// ─────────────────────────────────────────────────────────────────────────
//  CUSTOM TOOLTIP — used by both charts
// ─────────────────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl px-4 py-3 text-sm font-body shadow-2xl"
      style={{
        background: CHART_COLORS.tooltipBg,
        border: `1px solid ${CHART_COLORS.tooltipBorder}`,
      }}
    >
      <p className="text-gold font-semibold mb-1.5">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }} className="text-xs">
          {entry.name === "revenue"
            ? `Revenue: ₹${entry.value.toLocaleString("en-IN")}`
            : `Orders: ${entry.value}`}
        </p>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
//  KPI CARD — reusable stat card matching existing Section/card styling
// ─────────────────────────────────────────────────────────────────────────
const KpiCard = ({ icon, label, value, sub, highlight }) => (
  <div
    className={`bg-espresso/60 border rounded-2xl p-5 flex flex-col gap-2 transition-all
                hover:border-gold/25
                ${highlight ? "border-gold/30" : "border-gold/10"}`}
  >
    <div className="flex items-center justify-between">
      <span className="text-2xl">{icon}</span>
      {highlight && (
        <span className="text-[10px] font-body font-semibold text-gold/70 uppercase tracking-widest
                         bg-gold/10 border border-gold/20 px-2 py-0.5 rounded-full">
          Top
        </span>
      )}
    </div>
    <div>
      <p className="font-body text-xs text-mist/40 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="font-heading text-2xl text-mist leading-tight">{value}</p>
      {sub && <p className="font-body text-xs text-mist/40 mt-0.5">{sub}</p>}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────
//  SKELETON LOADER — matches existing animate-pulse pattern
// ─────────────────────────────────────────────────────────────────────────
const Skeleton = ({ className }) => (
  <div className={`bg-espresso/40 animate-pulse rounded-2xl ${className}`} />
);

const AnalyticsSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
    </div>
    <Skeleton className="h-72" />
    <div className="grid md:grid-cols-2 gap-4">
      <Skeleton className="h-64" />
      <Skeleton className="h-64" />
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────
const SalesAnalytics = () => {
  const currentYear               = new Date().getFullYear();
  const [year, setYear]           = useState(currentYear);
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [activeChart, setActive]  = useState("revenue"); // "revenue" | "orders"

  // ── Fetch analytics from backend ─────────────────────────────────────────
  const fetchAnalytics = useCallback(async (selectedYear) => {
    setLoading(true);
    setError(null);
    try {
      const { data: res } = await api.get(`/analytics/sales?year=${selectedYear}`);
      setData(res);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to load analytics";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics(year);
  }, [year, fetchAnalytics]);

  // ── Format helpers ────────────────────────────────────────────────────────
  const fmt = (n) =>
    n >= 100000
      ? `₹${(n / 100000).toFixed(1)}L`
      : n >= 1000
      ? `₹${(n / 1000).toFixed(1)}K`
      : `₹${n}`;

  // ── Empty state ───────────────────────────────────────────────────────────
  const isEmpty = data && data.summary.totalOrders === 0;

  return (
    <div>
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-7">
        <div>
          <h2 className="font-heading text-3xl text-mist">Analytics</h2>
          <p className="font-body text-mist/40 text-sm mt-0.5">
            Sales performance · served orders only
          </p>
        </div>

        {/* Year Picker + Refresh */}
        <div className="flex items-center gap-2">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="bg-roast border border-gold/20 text-mist font-body text-sm
                       rounded-xl px-3 py-2 focus:outline-none focus:border-gold/50
                       transition-colors cursor-pointer"
          >
            {/* Always show last 3 years + any years that have data */}
            {Array.from(
              new Set([
                currentYear,
                currentYear - 1,
                currentYear - 2,
                ...(data?.availableYears || []),
              ])
            )
              .sort((a, b) => b - a)
              .map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
          </select>

          <button
            onClick={() => fetchAnalytics(year)}
            disabled={loading}
            className="text-xs font-body text-mist/40 hover:text-mist border border-gold/20
                       px-3 py-2 rounded-xl transition-colors disabled:opacity-40"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* ── Loading State ────────────────────────────────────────────────── */}
      {loading && <AnalyticsSkeleton />}

      {/* ── Error State ──────────────────────────────────────────────────── */}
      {error && !loading && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
          <p className="font-body text-red-400 text-sm">{error}</p>
          <button
            onClick={() => fetchAnalytics(year)}
            className="mt-3 text-xs font-body text-mist/50 hover:text-mist transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {/* ── Empty State ──────────────────────────────────────────────────── */}
      {isEmpty && !loading && (
        <div className="bg-espresso/60 border border-gold/10 rounded-2xl p-12 text-center">
          <p className="text-4xl mb-3">📊</p>
          <p className="font-heading text-mist text-xl mb-1">No data for {year}</p>
          <p className="font-body text-mist/40 text-sm">
            Served orders will appear here once placed.
          </p>
        </div>
      )}

      {/* ── Analytics Content ─────────────────────────────────────────────── */}
      {data && !loading && !isEmpty && (
        <div className="space-y-6">

          {/* ── KPI Cards ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              icon="₹"
              label="Yearly Revenue"
              value={fmt(data.summary.totalRevenue)}
              sub={`₹${data.summary.totalRevenue.toLocaleString("en-IN")} total`}
              highlight
            />
            <KpiCard
              icon="🧾"
              label="Total Orders"
              value={data.summary.totalOrders.toLocaleString("en-IN")}
              sub="Served orders"
            />
            <KpiCard
              icon="📈"
              label="Avg Order Value"
              value={fmt(data.summary.avgOrderValue)}
              sub="Per served order"
            />
            <KpiCard
              icon="🏆"
              label="Best Month"
              value={data.summary.bestMonth}
              sub={`${fmt(data.summary.bestMonthRevenue)} revenue`}
            />
          </div>

          {/* ── Monthly Line Chart ───────────────────────────────────────── */}
          <div className="bg-espresso/60 border border-gold/10 rounded-2xl p-6">
            {/* Chart header with metric toggle */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <h3 className="font-heading text-xl text-mist">Monthly Trend</h3>
                <p className="font-body text-xs text-mist/40 mt-0.5">{year} · Jan – Dec</p>
              </div>
              <div className="flex gap-1.5">
                {["revenue", "orders"].map((metric) => (
                  <button
                    key={metric}
                    onClick={() => setActive(metric)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-body font-semibold
                                border transition-all capitalize
                                ${activeChart === metric
                                  ? "bg-gold/20 text-gold border-gold/30"
                                  : "border-gold/10 text-mist/40 hover:border-gold/20 hover:text-mist/60"
                                }`}
                  >
                    {metric}
                  </button>
                ))}
              </div>
            </div>

            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data.monthlyData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={CHART_COLORS.gridLine}
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "rgba(245,236,215,0.35)", fontSize: 11, fontFamily: "Poppins" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "rgba(245,236,215,0.35)", fontSize: 11, fontFamily: "Poppins" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) =>
                    activeChart === "revenue"
                      ? v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v
                      : v
                  }
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: CHART_COLORS.goldLight, strokeWidth: 1, strokeDasharray: "4 4" }} />
                <Line
                  type="monotone"
                  dataKey={activeChart}
                  stroke={CHART_COLORS.gold}
                  strokeWidth={2.5}
                  dot={{ fill: CHART_COLORS.gold, r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: CHART_COLORS.goldLight, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* ── Bottom Row: Weekly Chart + Top Items ─────────────────────── */}
          <div className="grid md:grid-cols-2 gap-4">

            {/* Weekly Bar Chart */}
            <div className="bg-espresso/60 border border-gold/10 rounded-2xl p-6">
              <div className="mb-5">
                <h3 className="font-heading text-xl text-mist">Weekly Pattern</h3>
                <p className="font-body text-xs text-mist/40 mt-0.5">Average by day of week</p>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={data.weeklyData}
                  margin={{ top: 4, right: 4, left: -18, bottom: 0 }}
                  barSize={18}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={CHART_COLORS.gridLine}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: "rgba(245,236,215,0.35)", fontSize: 11, fontFamily: "Poppins" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "rgba(245,236,215,0.35)", fontSize: 11, fontFamily: "Poppins" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v)}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: CHART_COLORS.muted }} />
                  <Bar
                    dataKey="revenue"
                    fill={CHART_COLORS.gold}
                    radius={[6, 6, 0, 0]}
                    opacity={0.85}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top Items */}
            <div className="bg-espresso/60 border border-gold/10 rounded-2xl p-6">
              <div className="mb-5">
                <h3 className="font-heading text-xl text-mist">Top Items</h3>
                <p className="font-body text-xs text-mist/40 mt-0.5">By quantity sold · {year}</p>
              </div>

              {data.topItems.length === 0 ? (
                <p className="font-body text-mist/30 text-sm text-center py-8">No item data</p>
              ) : (
                <div className="space-y-3">
                  {data.topItems.map((item, idx) => {
                    // Progress bar width relative to top item
                    const maxQty  = data.topItems[0]?.quantity || 1;
                    const pct     = Math.round((item.quantity / maxQty) * 100);

                    return (
                      <div key={item.name}>
                        {/* Row: rank + name + stats */}
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center
                                          text-[10px] font-body font-bold
                                          ${idx === 0
                                            ? "bg-gold text-espresso"
                                            : "bg-gold/10 text-gold/60"
                                          }`}
                            >
                              {idx + 1}
                            </span>
                            <span className="font-body text-sm text-mist truncate">
                              {item.name}
                            </span>
                          </div>
                          <div className="flex-shrink-0 text-right ml-3">
                            <span className="font-body text-xs text-mist/50">
                              {item.quantity} sold ·{" "}
                            </span>
                            <span className="font-body text-xs text-gold">
                              ₹{item.revenue.toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="h-1 bg-roast rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${pct}%`,
                              background:
                                idx === 0
                                  ? CHART_COLORS.gold
                                  : `rgba(200,169,110,${0.55 - idx * 0.08})`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Monthly Summary Table ────────────────────────────────────── */}
          <div className="bg-espresso/60 border border-gold/10 rounded-2xl p-6">
            <h3 className="font-heading text-xl text-mist mb-5">Monthly Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-body">
                <thead>
                  <tr className="text-left border-b border-gold/10">
                    <th className="pb-3 text-mist/40 text-xs uppercase tracking-wider font-semibold">Month</th>
                    <th className="pb-3 text-mist/40 text-xs uppercase tracking-wider font-semibold text-right">Orders</th>
                    <th className="pb-3 text-mist/40 text-xs uppercase tracking-wider font-semibold text-right">Revenue</th>
                    <th className="pb-3 text-mist/40 text-xs uppercase tracking-wider font-semibold text-right">Avg/Order</th>
                    <th className="pb-3 text-mist/40 text-xs uppercase tracking-wider font-semibold w-24">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gold/5">
                  {data.monthlyData.map((m) => {
                    const avg   = m.orders > 0 ? Math.round(m.revenue / m.orders) : 0;
                    const share = data.summary.totalRevenue > 0
                      ? ((m.revenue / data.summary.totalRevenue) * 100).toFixed(1)
                      : "0.0";
                    const isActive = m.month === data.summary.bestMonth;

                    return (
                      <tr key={m.month}
                          className={`transition-colors ${isActive ? "bg-gold/5" : "hover:bg-white/2"}`}>
                        <td className={`py-3 font-semibold ${isActive ? "text-gold" : "text-mist/70"}`}>
                          {m.month}
                          {isActive && (
                            <span className="ml-2 text-[10px] text-gold/60 uppercase tracking-wider">
                              best
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-right text-mist/60">
                          {m.orders > 0 ? m.orders : <span className="text-mist/20">—</span>}
                        </td>
                        <td className="py-3 text-right text-mist">
                          {m.revenue > 0
                            ? `₹${m.revenue.toLocaleString("en-IN")}`
                            : <span className="text-mist/20">—</span>}
                        </td>
                        <td className="py-3 text-right text-mist/50">
                          {avg > 0 ? `₹${avg}` : <span className="text-mist/20">—</span>}
                        </td>
                        <td className="py-3">
                          {m.revenue > 0 ? (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1 bg-roast rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${share}%`, background: CHART_COLORS.gold }}
                                />
                              </div>
                              <span className="text-mist/40 text-xs w-8 text-right">{share}%</span>
                            </div>
                          ) : (
                            <span className="text-mist/15">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Totals row */}
                <tfoot>
                  <tr className="border-t border-gold/20">
                    <td className="pt-3 font-semibold text-mist">Total</td>
                    <td className="pt-3 text-right font-semibold text-mist">
                      {data.summary.totalOrders}
                    </td>
                    <td className="pt-3 text-right font-semibold text-gold">
                      ₹{data.summary.totalRevenue.toLocaleString("en-IN")}
                    </td>
                    <td className="pt-3 text-right text-mist/50">
                      ₹{data.summary.avgOrderValue}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default SalesAnalytics;
