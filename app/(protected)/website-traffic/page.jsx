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
  Clock,
  MapPin,
  Activity,
  Share2,
  HelpCircle,
  Search,
} from "lucide-react";

const DATE_RANGES = [
  { label: "Last 7 Days", value: "7daysAgo", days: 7 },
  { label: "Last 14 Days", value: "14daysAgo", days: 14 },
  { label: "Last 30 Days", value: "30daysAgo", days: 30 },
  { label: "Last 90 Days", value: "90daysAgo", days: 90 },
  { label: "Last 6 Months", value: "180daysAgo", days: 180 },
  { label: "Last Year", value: "365daysAgo", days: 365 },
];

const SECTION_DESCRIPTIONS = {
  keyMetrics: "Core performance indicators showing user activity, engagement, and content consumption across website",
  trafficTrend: "Visual representation of daily traffic patterns showing how your active users, page views, and sessions trend over time",
  userTypeBreakdown: "Comparison between new and returning visitors to understand audience composition",
  topPages: "Your highest performing pages ranked by traffic, with engagement and bounce rate metrics to identify valuable content",
  landingPages: "First pages where visitors arrive on site - critical for understanding entry points and initial impressions",
  trafficSources: "Where your traffic originates (direct, organic search, social media, referrals, etc)",
  topCountries: "Geographic distribution of visitors by country to understand global audience reach",
  topCities: "City-level breakdown of visitors for localized insights",
  trafficByDevice: "How visitors access site across different device types (Desktop, Mobile, Tablet)",
  browserDistribution: "Browser usage patterns among visitors",
  osDistribution: "Operating system usage to understand technical environment of your audience",
  deviceModels: "Specific device models used by visitors",
  languageDistribution: "Languages configured on visitor devices",
  topReferrers: "External websites and sources sending traffic to you",
  channelEngagement: "Performance metrics grouped by marketing/traffic channel",
  pageEngagement: "Detailed engagement metrics for each page including user actions and time spent",
  hourlyTraffic: "Traffic patterns by hour of day to identify peak usage times",
  dayOfWeekTraffic: "Traffic patterns by day of week to understand weekly trends",
  seo: "Top search queries driving organic traffic to your site, showing clicks, impressions, CTR, and average search position.",
};

const METRIC_DESCRIPTIONS = {
  "Active Users": "Users who engaged with site during this period",
  "Total Users": "All unique visitors to website",
  "New Users": "First-time visitors who haven't visited before",
  "Page Views": "Total number of times pages were viewed",
  "Sessions": "Distinct visits to website (a session resets after 30 min of inactivity)",
  "Bounce Rate": "Percentage of visitors who left without interacting - lower is generally better",
  "Avg Session Duration": "Average time each visitor spent on the site (in seconds)",
  "Engagement Rate": "Percentage of sessions where users took meaningful actions like clicks or scrolls",
  "Sessions Per User": "Average number of times each visitor returns to site",
  "Total Events": "Total tracked user interactions including clicks, form submissions, etc",
};

const SectionHeader = ({ title, description }) => (
  <div className="mb-6">
    <h2 className="text-2xl font-bold mb-2">{title}</h2>
    {description && (
      <p className="text-sm opacity-60 flex items-start gap-2">
        <HelpCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>{description}</span>
      </p>
    )}
  </div>
);

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
      if (data.traffic?.trafficByDate?.length > 0) {
        const trafficByDate = data.traffic.trafficByDate;
        const chartDataUsers = trafficByDate.map((point) => {
          const dateStr = point.date.toString();
          const year = parseInt(dateStr.substring(0, 4));
          const month = parseInt(dateStr.substring(4, 6));
          const day = parseInt(dateStr.substring(6, 8));
          const dateUTC = Date.UTC(year, month - 1, day);
          return [dateUTC, parseInt(point.users)];
        });

        const chartDataViews = trafficByDate.map((point) => {
          const dateStr = point.date.toString();
          const year = parseInt(dateStr.substring(0, 4));
          const month = parseInt(dateStr.substring(4, 6));
          const day = parseInt(dateStr.substring(6, 8));
          const dateUTC = Date.UTC(year, month - 1, day);
          return [dateUTC, parseInt(point.pageViews)];
        });

        const chartDataSessions = trafficByDate.map((point) => {
          const dateStr = point.date.toString();
          const year = parseInt(dateStr.substring(0, 4));
          const month = parseInt(dateStr.substring(4, 6));
          const day = parseInt(dateStr.substring(6, 8));
          const dateUTC = Date.UTC(year, month - 1, day);
          return [dateUTC, parseInt(point.sessions)];
        });

        setChartOptions((prev) => ({
          ...prev,
          series: [
            {
              name: "Active Users",
              data: chartDataUsers,
              color: "#81b17b",
              lineWidth: 2,
            },
            {
              name: "Page Views",
              data: chartDataViews,
              color: "#4e8e75",
              lineWidth: 2,
            },
            {
              name: "Sessions",
              data: chartDataSessions,
              color: "#2d5a4a",
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

  const MetricCard = ({ icon: Icon, label, value, change }) => {
    const description = METRIC_DESCRIPTIONS[label];
    return (
      <div
        className="p-5 rounded-lg border-2 flex flex-col gap-3"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--card)",
        }}
      >
        <div className="flex items-start gap-4">
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
        {description && (
          <p className="text-xs opacity-50 border-t pt-2" style={{ borderColor: "var(--border)" }}>
            💡 {description}
          </p>
        )}
      </div>
    );
  };

  const DataTable = ({ title, headers, rows, icon: Icon, description }) => (
    <div
      className="rounded-lg border-2 overflow-hidden"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--card)",
      }}
    >
      <div className="p-6 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3 mb-2">
          {Icon && <Icon className="w-5 h-5" style={{ color: "#81b17b" }} />}
          <h3 className="text-lg font-bold">{title}</h3>
        </div>
        {description && (
          <p className="text-xs opacity-60 flex items-start gap-2 ml-8">
            <span>{description}</span>
          </p>
        )}
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

  const { summary, geography, traffic, pages, users, deviceAnalytics, referrals, engagement, seo } = analyticsData || {};

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
                  className={`px-3 py-1 rounded  text-md font-medium transition-all ${selectedRange === range.value && !showCustomDate
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
                className={`px-3 py-1 rounded text-md font-medium transition-all border flex items-center gap-1 ${showCustomDate ? "opacity-100" : "opacity-60 hover:opacity-80"
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
            {["overview", "traffic", "sources", "devices", "engagement"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 rounded text-xs font-medium transition-all capitalize ${activeTab === tab
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
              <SectionHeader
                title={`Key Metrics (${getSelectedRangeLabel()})`}
                description={SECTION_DESCRIPTIONS.keyMetrics}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <MetricCard
                  icon={Users}
                  label="Active Users"
                  value={summary?.activeUsers?.toLocaleString() || "0"}
                />
                <MetricCard
                  icon={Users}
                  label="Total Users"
                  value={summary?.totalUsers?.toLocaleString() || "0"}
                />
                <MetricCard
                  icon={TrendingUp}
                  label="New Users"
                  value={summary?.newUsers?.toLocaleString() || "0"}
                />
                <MetricCard
                  icon={Eye}
                  label="Page Views"
                  value={summary?.pageViews?.toLocaleString() || "0"}
                />
                <MetricCard
                  icon={BarChart3}
                  label="Sessions"
                  value={summary?.sessions?.toLocaleString() || "0"}
                />
                <MetricCard
                  icon={TrendingUp}
                  label="Bounce Rate"
                  value={`${summary?.bounceRate || "0"}%`}
                />
                <MetricCard
                  icon={Clock}
                  label="Avg Session Duration"
                  value={`${summary?.avgSessionDuration || "0"}s`}
                />
                <MetricCard
                  icon={Activity}
                  label="Engagement Rate"
                  value={`${summary?.engagementRate || "0"}%`}
                />
                <MetricCard
                  icon={BarChart3}
                  label="Sessions Per User"
                  value={summary?.sessionsPerUser || "0"}
                />
                <MetricCard
                  icon={Activity}
                  label="Total Events"
                  value={summary?.totalEvents?.toLocaleString() || "0"}
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
              <SectionHeader
                title="Traffic Trend (Daily)"
                description={SECTION_DESCRIPTIONS.trafficTrend}
              />
              <p className="text-sm opacity-75 mb-4">Active Users, Page Views, and Sessions over {getSelectedRangeLabel().toLowerCase()}</p>
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
              description={SECTION_DESCRIPTIONS.userTypeBreakdown}
              headers={["Type", "Users", "Page Views", "Sessions", "Bounce Rate", "Avg Duration"]}
              rows={users?.userType
                ?.sort((a, b) => b.users - a.users)
                ?.map((item) => ({
                  Type: item.type,
                  Users: item.users.toLocaleString(),
                  "Page Views": item.pageViews.toLocaleString(),
                  Sessions: item.sessions.toLocaleString(),
                  "Bounce Rate": `${item.bounceRate}%`,
                  "Avg Duration": `${item.avgSessionDuration}s`,
                }))}
            />
          </div>
        )}

        {/* Traffic Tab */}
        {activeTab === "traffic" && (
          <div className="space-y-8">

                        {/* Landing Pages */}
            <DataTable
              title="Top Performing Pages"
              icon={Navigation}
              description={SECTION_DESCRIPTIONS.topPages}
              headers={["Landing Page", "Views", "Users", "Bounce Rate", "Avg Duration", "Sessions"]}
              rows={pages?.landingPages
                ?.sort((a, b) => b.pageViews - a.pageViews)
                ?.map((item) => ({
                  "Landing Page": item.landingPage,
                  Views: item.pageViews.toLocaleString(),
                  Users: item.users.toLocaleString(),
                  "Bounce Rate": `${item.bounceRate}%`,
                  "Avg Duration": `${item.avgSessionDuration}s`,
                  Sessions: item.sessions.toLocaleString(),
                }))}
            />

            {/* Top Pages */}
            {/* <DataTable
              
              icon={Eye}
              description={SECTION_DESCRIPTIONS.topPages}
              headers={["Page Title", "Path", "Views", "Users", "Bounce Rate", "Avg Duration", "Engagement Rate", "Sessions"]}
              rows={pages?.topPages
                ?.sort((a, b) => b.pageViews - a.pageViews)
                ?.map((item) => ({
                  "Page Title": item.title,
                  Path: item.path,
                  Views: item.pageViews.toLocaleString(),
                  Users: item.users.toLocaleString(),
                  "Bounce Rate": `${item.bounceRate}%`,
                  "Avg Duration": `${item.avgSessionDuration}s`,
                  "Engagement Rate": `${item.engagementRate}%`,
                  Sessions: item.sessions.toLocaleString(),
                }))}
            /> */}


            {/* Traffic Sources */}
            <DataTable
              title="Traffic Sources"
              icon={Share2}
              description={SECTION_DESCRIPTIONS.trafficSources}
              headers={["Source", "Users", "Page Views", "Sessions", "Bounce Rate", "Avg Duration"]}
              rows={traffic?.trafficSources
                ?.sort((a, b) => b.users - a.users)
                ?.map((item) => ({
                  Source: item.source,
                  Users: item.users.toLocaleString(),
                  "Page Views": item.pageViews.toLocaleString(),
                  Sessions: item.sessions.toLocaleString(),
                  "Bounce Rate": `${item.bounceRate}%`,
                  "Avg Duration": `${item.avgSessionDuration}s`,
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
              description={SECTION_DESCRIPTIONS.trafficByDevice}
              headers={["Device", "Users", "Page Views", "Sessions", "Bounce Rate", "Avg Duration"]}
              rows={traffic?.trafficByDevice
                ?.sort((a, b) => b.users - a.users)
                ?.map((item) => ({
                  Device: item.device,
                  Users: item.users.toLocaleString(),
                  "Page Views": item.pageViews.toLocaleString(),
                  Sessions: item.sessions.toLocaleString(),
                  "Bounce Rate": `${item.bounceRate}%`,
                  "Avg Duration": `${item.avgSessionDuration}s`,
                }))}
            />

            {/* Browser Distribution */}
            <DataTable
              title="Browser Distribution"
              icon={Eye}
              description={SECTION_DESCRIPTIONS.browserDistribution}
              headers={["Browser", "Users", "Page Views", "Sessions", "Bounce Rate"]}
              rows={deviceAnalytics?.byBrowser
                ?.sort((a, b) => b.users - a.users)
                ?.map((item) => ({
                  Browser: item.browser,
                  Users: item.users.toLocaleString(),
                  "Page Views": item.pageViews.toLocaleString(),
                  Sessions: item.sessions.toLocaleString(),
                  "Bounce Rate": `${item.bounceRate}%`,
                }))}
            />

            {/* Operating System Distribution */}
            <DataTable
              title="Operating System Distribution"
              icon={Smartphone}
              description={SECTION_DESCRIPTIONS.osDistribution}
              headers={["OS", "Users", "Page Views", "Sessions", "Bounce Rate"]}
              rows={deviceAnalytics?.byOperatingSystem
                ?.sort((a, b) => b.users - a.users)
                ?.map((item) => ({
                  OS: item.os,
                  Users: item.users.toLocaleString(),
                  "Page Views": item.pageViews.toLocaleString(),
                  Sessions: item.sessions.toLocaleString(),
                  "Bounce Rate": `${item.bounceRate}%`,
                }))}
            />

            {/* Device Models */}
            <DataTable
              title="Device Model Distribution"
              icon={Smartphone}
              description={SECTION_DESCRIPTIONS.deviceModels}
              headers={["Model", "Users", "Page Views", "Sessions"]}
              rows={deviceAnalytics?.byDeviceModel
                ?.sort((a, b) => b.users - a.users)
                ?.map((item) => ({
                  Model: item.model,
                  Users: item.users.toLocaleString(),
                  "Page Views": item.pageViews.toLocaleString(),
                  Sessions: item.sessions.toLocaleString(),
                }))}
            />

            {/* Languages */}
            <DataTable
              title="Language Distribution"
              icon={Globe}
              description={SECTION_DESCRIPTIONS.languageDistribution}
              headers={["Language", "Users", "Page Views", "Sessions"]}
              rows={deviceAnalytics?.byLanguage
                ?.sort((a, b) => b.users - a.users)
                ?.map((item) => ({
                  Language: item.language,
                  Users: item.users.toLocaleString(),
                  "Page Views": item.pageViews.toLocaleString(),
                  Sessions: item.sessions.toLocaleString(),
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
              description={SECTION_DESCRIPTIONS.topCountries}
              headers={["Country", "Users", "Page Views", "Sessions", "Bounce Rate"]}
              rows={geography?.trafficByCountry
                ?.sort((a, b) => b.users - a.users)
                ?.map((item) => ({
                  Country: item.country,
                  Users: item.users.toLocaleString(),
                  "Page Views": item.pageViews.toLocaleString(),
                  Sessions: item.sessions.toLocaleString(),
                  "Bounce Rate": `${item.bounceRate}%`,
                }))}
            />

            {/* Traffic by City */}
            <DataTable
              title="Top Cities"
              icon={MapPin}
              description={SECTION_DESCRIPTIONS.topCities}
              headers={["City", "Users", "Page Views", "Sessions", "Bounce Rate", "Avg Duration"]}
              rows={geography?.trafficByCity
                ?.sort((a, b) => b.users - a.users)
                ?.map((item) => ({
                  City: item.city,
                  Users: item.users.toLocaleString(),
                  "Page Views": item.pageViews.toLocaleString(),
                  Sessions: item.sessions.toLocaleString(),
                  "Bounce Rate": `${item.bounceRate}%`,
                  "Avg Duration": `${item.avgSessionDuration}s`,
                }))}
            />

            {/* Traffic by Region */}
            <DataTable
              title="Top Regions"
              icon={MapPin}
              headers={["Region", "Users", "Page Views", "Sessions"]}
              rows={geography?.trafficByRegion
                ?.sort((a, b) => b.users - a.users)
                ?.map((item) => ({
                  Region: item.region,
                  Users: item.users.toLocaleString(),
                  "Page Views": item.pageViews.toLocaleString(),
                  Sessions: item.sessions.toLocaleString(),
                }))}
            />

            {/* Traffic by Continent */}
            <DataTable
              title="Traffic by Continent"
              icon={Globe}
              headers={["Continent", "Users", "Page Views", "Sessions"]}
              rows={geography?.trafficByContinent
                ?.sort((a, b) => b.users - a.users)
                ?.map((item) => ({
                  Continent: item.continent,
                  Users: item.users.toLocaleString(),
                  "Page Views": item.pageViews.toLocaleString(),
                  Sessions: item.sessions.toLocaleString(),
                }))}
            />

            {/* Referrers */}
            <DataTable
              title="Top Referrers"
              icon={Share2}
              description={SECTION_DESCRIPTIONS.topReferrers}
              headers={["Referrer", "Users", "Page Views", "Sessions", "Bounce Rate"]}
              rows={referrals?.byReferrer
                ?.sort((a, b) => b.users - a.users)
                ?.map((item) => ({
                  Referrer: item.referrer,
                  Users: item.users.toLocaleString(),
                  "Page Views": item.pageViews.toLocaleString(),
                  Sessions: item.sessions.toLocaleString(),
                  "Bounce Rate": `${item.bounceRate}%`,
                }))}
            />
          </div>
        )}

        {/* Engagement Tab */}
        {activeTab === "engagement" && (
          <div className="space-y-8">
            {/* Page Performance */}
            <DataTable
              title="Page Performance"
              icon={Eye}
              description={SECTION_DESCRIPTIONS.pageEngagement}
              headers={["Path", "Title", "Views", "Users", "Engagement Rate", "Avg Duration", "Sessions", "Bounce Rate", "Events"]}
              rows={engagement?.pageEngagement
                ?.sort((a, b) => b.pageViews - a.pageViews)
                ?.map((item) => ({
                  Path: item.path,
                  Title: item.title,
                  Views: item.pageViews.toLocaleString(),
                  Users: item.users.toLocaleString(),
                  "Engagement Rate": `${item.engagementRate}%`,
                  "Avg Duration": `${item.avgSessionDuration}s`,
                  Sessions: item.sessions.toLocaleString(),
                  "Bounce Rate": `${item.bounceRate}%`,
                  Events: item.events.toLocaleString(),
                }))}
            />

            {/* Channel Group Engagement */}
            <DataTable
              title="Channel Group Engagement"
              icon={Share2}
              description={SECTION_DESCRIPTIONS.channelEngagement}
              headers={["Channel Group", "Users", "Engagement Rate", "Avg Duration", "Sessions", "Bounce Rate", "Events"]}
              rows={referrals?.byChannelGroup
                ?.sort((a, b) => b.users - a.users)
                ?.map((item) => ({
                  "Channel Group": item.channelGroup,
                  Users: item.users.toLocaleString(),
                  "Engagement Rate": `${item.engagementRate}%`,
                  "Avg Duration": `${item.avgSessionDuration}s`,
                  Sessions: item.sessions.toLocaleString(),
                  "Bounce Rate": `${item.bounceRate}%`,
                  Events: item.events.toLocaleString(),
                }))}
            />

            {/* Hourly Traffic */}
            <DataTable
              title="Hourly Traffic Breakdown"
              icon={Clock}
              description={SECTION_DESCRIPTIONS.hourlyTraffic}
              headers={["Hour", "Users", "Page Views", "Sessions"]}
              rows={traffic?.trafficByHour
                ?.sort((a, b) => a.hour - b.hour)
                ?.map((item) => ({
                  Hour: item.hour,
                  Users: item.users.toLocaleString(),
                  "Page Views": item.pageViews.toLocaleString(),
                  Sessions: item.sessions.toLocaleString(),
                }))}
            />

            {/* Day of Week Traffic */}
            <DataTable
              title="Day of Week Traffic"
              icon={Calendar}
              description={SECTION_DESCRIPTIONS.dayOfWeekTraffic}
              headers={["Day", "Users", "Page Views", "Sessions", "Bounce Rate", "Avg Duration"]}
              rows={traffic?.trafficByDayOfWeek
                ?.sort((a, b) => {
                  const dayOrder = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
                  return dayOrder[a.day] - dayOrder[b.day];
                })
                ?.map((item) => ({
                  Day: item.day,
                  Users: item.users.toLocaleString(),
                  "Page Views": item.pageViews.toLocaleString(),
                  Sessions: item.sessions.toLocaleString(),
                  "Bounce Rate": `${item.bounceRate}%`,
                  "Avg Duration": `${item.avgSessionDuration}s`,
                }))}
            />
          </div>
        )}

        {/* SEO Tab */}
        {activeTab === "seo" && (
          <div className="space-y-8">
            <DataTable
              title="Top Organic Search Queries"
              icon={Search}
              description={SECTION_DESCRIPTIONS.seo}
              headers={["Query", "Clicks", "Impressions", "CTR", "Avg Position"]}
              rows={seo?.topOrganicQueries
                ?.sort((a, b) => b.clicks - a.clicks)
                ?.map((item) => ({
                  Query: item.query,
                  Clicks: item.clicks.toLocaleString(),
                  Impressions: item.impressions.toLocaleString(),
                  CTR: `${(item.ctr * 100).toFixed(2)}%`,
                  "Avg Position": item.position.toFixed(1),
                }))}
            />
          </div>
        )}
      </div>
    </div>
  );
}