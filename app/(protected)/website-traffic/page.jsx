"use client";

import { useState, useEffect } from "react";
import HighchartsReact from "highcharts-react-official";
import Highcharts from "highcharts";
import {
  TrendingUp,
  Users,
  Eye,
  Smartphone,
  Globe,
  BarChart3,
  Navigation,
  Loader2,
  RefreshCw,
  Calendar,
} from "lucide-react";

const DATE_RANGES = [
  { label: "Last 7 Days", value: "7daysAgo", days: 7 },
  { label: "Last 14 Days", value: "14daysAgo", days: 14 },
  { label: "Last 30 Days", value: "30daysAgo", days: 30 },
  { label: "Last 90 Days", value: "90daysAgo", days: 90 },
  { label: "Last 6 Months", value: "180daysAgo", days: 180 },
  { label: "Last Year", value: "365daysAgo", days: 365 },
];

export default function AnalyticsDashboard() {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedRange, setSelectedRange] = useState("30daysAgo");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [chartOptions, setChartOptions] = useState({
    title: { text: null },
    chart: {
      backgroundColor: "transparent",
      zoomType: "x",
      height: 400,
      spacingRight: 15,
      spacingLeft: 15,
      spacingBottom: 15,
      spacingTop: 15,
      style: {
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      },
    },
    xAxis: {
      type: "datetime",
      labels: {
        formatter: function () {
          const date = new Date(this.value);
          return `${date.toLocaleString("default", {
            month: "short",
            day: "numeric",
          })}`;
        },
        style: { fontSize: "12px" },
      },
    },
    yAxis: {
      title: { text: "Count", style: { fontSize: "14px" } },
      labels: {
        style: { fontSize: "12px" },
        formatter: function () {
          return Highcharts.numberFormat(this.value, 0);
        },
      },
      gridLineWidth: 1,
    },
    legend: { enabled: true, itemStyle: { fontSize: "12px" } },
    tooltip: {
      shared: true,
      formatter: function () {
        let tooltipHtml = `<b>${Highcharts.dateFormat("%Y-%m-%d", this.x)}</b><br/>`;
        this.points.forEach((point) => {
          const value = Highcharts.numberFormat(point.y, 0);
          tooltipHtml += `<span style="color:${point.series.color}">●</span> ${point.series.name}: <b>${value}</b><br/>`;
        });
        return tooltipHtml;
      },
    },
    plotOptions: { series: { lineWidth: 2, animation: { duration: 1000 } } },
    series: [],
    credits: { enabled: false },
  });

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async (dateRangeParam = null, startDateParam = null, endDateParam = null) => {
    setRefreshing(true);
    try {
      let params = new URLSearchParams();
      
      if (startDateParam && endDateParam) {
        params.append("startDate", startDateParam);
        params.append("endDate", endDateParam);
      } else if (dateRangeParam) {
        params.append("dateRange", dateRangeParam);
      } else {
        params.append("dateRange", selectedRange);
      }

      const res = await fetch(`/api/analytics?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch analytics");
      const data = await res.json();
      setAnalyticsData(data);

      // Set up chart data
      if (data.trafficByDate?.length > 0) {
        const chartData = data.trafficByDate.map((point) => {
          // Parse YYYYMMDD format (e.g., "20250929")
          const dateStr = point.date.toString();
          const year = parseInt(dateStr.substring(0, 4));
          const month = parseInt(dateStr.substring(4, 6));
          const day = parseInt(dateStr.substring(6, 8));
          const dateUTC = Date.UTC(year, month - 1, day);
          return [dateUTC, parseInt(point.users)];
        });

        setChartOptions((prev) => ({
          ...prev,
          series: [
            {
              name: "Active Users",
              data: chartData,
              color: "#81b17b",
              lineWidth: 2,
            },
            {
              name: "Page Views",
              data: data.trafficByDate.map((point) => {
                const dateStr = point.date.toString();
                const year = parseInt(dateStr.substring(0, 4));
                const month = parseInt(dateStr.substring(4, 6));
                const day = parseInt(dateStr.substring(6, 8));
                const dateUTC = Date.UTC(year, month - 1, day);
                return [dateUTC, parseInt(point.pageViews)];
              }),
              color: "#4e8e75",
              lineWidth: 2,
            },
          ],
        }));
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    }
    setRefreshing(false);
    setLoading(false);
  };

  const handleDateRangeChange = async (rangeValue) => {
    setSelectedRange(rangeValue);
    setShowCustomDate(false);
    setCustomStartDate("");
    setCustomEndDate("");
    await fetchAnalytics(rangeValue);
  };

  const handleCustomDateSubmit = async () => {
    if (customStartDate && customEndDate) {
      await fetchAnalytics(null, customStartDate, customEndDate);
      setShowCustomDate(false);
    }
  };

  const getSelectedRangeLabel = () => {
    if (customStartDate && customEndDate) {
      return `${customStartDate} to ${customEndDate}`;
    }
    const range = DATE_RANGES.find(r => r.value === selectedRange);
    return range?.label || "Last 30 Days";
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
      >
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-lg">Loading analytics...</span>
        </div>
      </div>
    );
  }

  const MetricCard = ({ icon: Icon, label, value, change }) => (
    <div
      className="p-5 rounded-lg border-2 flex items-start gap-4"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--card)",
      }}
    >
      <div
        className="p-3 rounded-lg flex-shrink-0"
        style={{ backgroundColor: "rgba(129, 177, 123, 0.1)" }}
      >
        <Icon className="w-6 h-6" style={{ color: "#81b17b" }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm opacity-75 mb-1">{label}</p>
        <p className="text-3xl font-bold">{value}</p>
        {change && (
          <p className="text-xs opacity-60 mt-1">
            <span style={{ color: change > 0 ? "#22c55e" : "#ef4444" }}>
              {change > 0 ? "↑" : "↓"} {Math.abs(change)}% from last period
            </span>
          </p>
        )}
      </div>
    </div>
  );

  const DataTable = ({ title, headers, rows, icon: Icon }) => (
    <div
      className="rounded-lg border-2 overflow-hidden"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--card)",
      }}
    >
      <div className="flex items-center gap-3 p-6 border-b" style={{ borderColor: "var(--border)" }}>
        {Icon && <Icon className="w-5 h-5" style={{ color: "#81b17b" }} />}
        <h3 className="text-lg font-bold">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead
            style={{
              backgroundColor: "rgba(129, 177, 123, 0.1)",
              borderBottom: "2px solid var(--border)",
            }}
          >
            <tr>
              {headers.map((header) => (
                <th
                  key={header}
                  className="px-6 py-3 text-left text-sm font-semibold"
                  style={{ color: "#81b17b" }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows?.length === 0 ? (
              <tr>
                <td
                  colSpan={headers.length}
                  className="px-6 py-8 text-center opacity-50"
                >
                  No data available
                </td>
              </tr>
            ) : (
              rows?.map((row, idx) => (
                <tr
                  key={idx}
                  style={{
                    borderBottom: idx < rows.length - 1 ? "1px solid var(--border)" : "none",
                    backgroundColor: idx % 2 === 0 ? "transparent" : "rgba(129, 177, 123, 0.02)",
                  }}
                >
                  {Object.values(row).map((value, cidx) => (
                    <td key={cidx} className="px-6 py-3 text-sm">
                      {typeof value === "number" && !Number.isInteger(value)
                        ? value.toFixed(2)
                        : value}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const handleRefresh = async () => {
    if (customStartDate && customEndDate) {
      await fetchAnalytics(null, customStartDate, customEndDate);
    } else {
      await fetchAnalytics(selectedRange);
    }
  };

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
      }}
    >
      {/* Header */}
      <div className="border-b sticky bg-primary-foreground top-0 z-30" style={{ borderColor: "var(--border)" }}>
        <div className="mx-auto px-6 py-3">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold">Website Analytics</h1>
              <p className="text-xs opacity-60">Real-time traffic insights and performance metrics</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all hover:shadow-lg active:scale-95 disabled:opacity-50 flex-shrink-0"
              style={{
                backgroundColor: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Updating..." : "Refresh"}
            </button>
          </div>

          {/* Date Range Filters */}
          <div className="mb-2">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4" style={{ color: "#81b17b" }} />
              <span className="text-md font-medium">Period:</span>
              <span className="text-md opacity-60">{getSelectedRangeLabel()}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {DATE_RANGES.map((range) => (
                <button
                  key={range.value}
                  onClick={() => handleDateRangeChange(range.value)}
                  className={`px-3 py-1 rounded  text-md font-medium transition-all ${
                    selectedRange === range.value && !showCustomDate
                      ? "opacity-100"
                      : "opacity-60 hover:opacity-80"
                  }`}
                  style={{
                    backgroundColor:
                      selectedRange === range.value && !showCustomDate
                        ? "var(--primary)"
                        : "transparent",
                    color:
                      selectedRange === range.value && !showCustomDate
                        ? "var(--primary-foreground)"
                        : "var(--foreground)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {range.label}
                </button>
              ))}
              <button
                onClick={() => setShowCustomDate(!showCustomDate)}
                className={`px-3 py-1 rounded text-md font-medium transition-all border flex items-center gap-1 ${
                  showCustomDate ? "opacity-100" : "opacity-60 hover:opacity-80"
                }`}
                style={{
                  backgroundColor: showCustomDate ? "var(--primary)" : "transparent",
                  color: showCustomDate ? "var(--primary-foreground)" : "var(--foreground)",
                  borderColor: "var(--border)",
                }}
              >
                <Calendar className="w-3 h-3" />
                Custom
              </button>
            </div>

            {/* Custom Date Picker */}
            {showCustomDate && (
              <div className="mt-2 p-3 rounded border" style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-medium mb-1">Start Date</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full px-2 py-1 rounded text-sm border outline-none"
                      style={{
                        borderColor: "var(--border)",
                        backgroundColor: "var(--background)",
                        color: "var(--foreground)",
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">End Date</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full px-2 py-1 rounded text-sm border outline-none"
                      style={{
                        borderColor: "var(--border)",
                        backgroundColor: "var(--background)",
                        color: "var(--foreground)",
                      }}
                    />
                  </div>
                  <div className="flex items-end gap-1">
                    <button
                      onClick={handleCustomDateSubmit}
                      disabled={!customStartDate || !customEndDate}
                      className="flex-1 px-2 py-1 rounded text-sm font-medium transition-all disabled:opacity-50"
                      style={{
                        backgroundColor: "var(--primary)",
                        color: "var(--primary-foreground)",
                      }}
                    >
                      Apply
                    </button>
                    <button
                      onClick={() => setShowCustomDate(false)}
                      className="flex-1 px-2 py-1 rounded text-sm font-medium transition-all border"
                      style={{
                        borderColor: "var(--border)",
                        color: "var(--foreground)",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 flex-wrap">
            {["overview", "traffic", "sources", "devices"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 rounded text-xs font-medium transition-all capitalize ${
                  activeTab === tab
                    ? "opacity-100"
                    : "opacity-60 hover:opacity-80"
                }`}
                style={{
                  backgroundColor:
                    activeTab === tab ? "var(--primary)" : "transparent",
                  color:
                    activeTab === tab
                      ? "var(--primary-foreground)"
                      : "var(--foreground)",
                  borderBottom:
                    activeTab === tab ? "none" : "1px solid var(--border)",
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto px-6 py-8">
        {/* Last Updated */}
        <div className="mb-6 text-sm opacity-60">
          Last updated: {new Date(analyticsData?.lastUpdated).toLocaleString()}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Summary Metrics */}
            <div>
              <h2 className="text-2xl font-bold mb-6">Key Metrics ({getSelectedRangeLabel()})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <MetricCard
                  icon={Users}
                  label="Active Users"
                  value={analyticsData?.summary?.activeUsers?.toLocaleString() || "0"}
                />
                <MetricCard
                  icon={Users}
                  label="Total Users"
                  value={analyticsData?.summary?.totalUsers?.toLocaleString() || "0"}
                />
                <MetricCard
                  icon={TrendingUp}
                  label="New Users"
                  value={analyticsData?.summary?.newUsers?.toLocaleString() || "0"}
                />
                <MetricCard
                  icon={Eye}
                  label="Page Views"
                  value={analyticsData?.summary?.pageViews?.toLocaleString() || "0"}
                />
                <MetricCard
                  icon={BarChart3}
                  label="Sessions"
                  value={analyticsData?.summary?.sessions?.toLocaleString() || "0"}
                />
                <MetricCard
                  icon={TrendingUp}
                  label="Bounce Rate"
                  value={`${analyticsData?.summary?.bounceRate || "0"}%`}
                />
                <MetricCard
                  icon={TrendingUp}
                  label="Avg Session Duration"
                  value={`${analyticsData?.summary?.avgSessionDuration || "0"}s`}
                />
                <MetricCard
                  icon={TrendingUp}
                  label="Engagement Rate"
                  value={`${analyticsData?.summary?.engagementRate || "0"}%`}
                />
                <MetricCard
                  icon={TrendingUp}
                  label="Sessions Per User"
                  value={analyticsData?.summary?.sessionsPerUser || "0"}
                />
              </div>
            </div>

            {/* Traffic Chart */}
            <div
              className="rounded-lg border-2 p-6 overflow-hidden"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--card)",
              }}
            >
              <h2 className="text-2xl font-bold mb-2">Traffic Trend (Daily)</h2>
              <p className="text-sm opacity-75 mb-4">Active Users and Page Views over {getSelectedRangeLabel().toLowerCase()}</p>
              <HighchartsReact
                highcharts={Highcharts}
                options={chartOptions}
                containerProps={{ style: { height: "400px", width: "100%" } }}
              />
            </div>

            {/* User Type Breakdown */}
            <DataTable
              title="User Type Breakdown"
              icon={Users}
              headers={["Type", "Users", "Page Views", "Sessions", "Bounce Rate"]}
              rows={analyticsData?.userType?.map((item) => ({
                Type: item.type,
                Users: item.users.toLocaleString(),
                "Page Views": item.pageViews.toLocaleString(),
                Sessions: item.sessions.toLocaleString(),
                "Bounce Rate": `${item.bounceRate}%`,
              }))}
            />
          </div>
        )}

        {/* Traffic Tab */}
        {activeTab === "traffic" && (
          <div className="space-y-8">
            {/* Top Pages */}
            <DataTable
              title="Top Performing Pages"
              icon={Eye}
              headers={["Page Title", "Path", "Views", "Users", "Bounce Rate", "Avg Duration"]}
              rows={analyticsData?.topPages?.map((item) => ({
                "Page Title": item.title,
                Path: item.path,
                Views: item.pageViews.toLocaleString(),
                Users: item.users.toLocaleString(),
                "Bounce Rate": `${item.bounceRate}%`,
                "Avg Duration": `${item.avgSessionDuration}s`,
              }))}
            />

            {/* Traffic Sources */}
            <DataTable
              title="Traffic Sources"
              icon={Navigation}
              headers={["Source", "Users", "Page Views", "Sessions"]}
              rows={analyticsData?.trafficSources?.map((item) => ({
                Source: item.source,
                Users: item.users.toLocaleString(),
                "Page Views": item.pageViews.toLocaleString(),
                Sessions: item.sessions.toLocaleString(),
              }))}
            />
          </div>
        )}

        {/* Devices Tab */}
        {activeTab === "devices" && (
          <div className="space-y-8">
            <DataTable
              title="Traffic by Device"
              icon={Smartphone}
              headers={["Device", "Users", "Page Views", "Sessions", "Bounce Rate", "Avg Duration"]}
              rows={analyticsData?.trafficByDevice?.map((item) => ({
                Device: item.device,
                Users: item.users.toLocaleString(),
                "Page Views": item.pageViews.toLocaleString(),
                Sessions: item.sessions.toLocaleString(),
                "Bounce Rate": `${item.bounceRate}%`,
                "Avg Duration": `${item.avgSessionDuration}s`,
              }))}
            />
          </div>
        )}

        {/* Sources Tab */}
        {activeTab === "sources" && (
          <div className="space-y-8">
            {/* Traffic by Country */}
            <DataTable
              title="Top Countries"
              icon={Globe}
              headers={["Country", "Users", "Page Views", "Sessions"]}
              rows={analyticsData?.trafficByCountry?.map((item) => ({
                Country: item.country,
                Users: item.users.toLocaleString(),
                "Page Views": item.pageViews.toLocaleString(),
                Sessions: item.sessions.toLocaleString(),
              }))}
            />
          </div>
        )}
      </div>
    </div>
  );
}