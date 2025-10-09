"use client"
import React, { useState, useEffect } from "react"
import HighchartsReact from "highcharts-react-official"
import Highcharts from "highcharts"
import { calculateDaysBetween } from "@/utils/dateUtils"

import DonutChart from "@/components/DonutChart"
import AnnualReturnsChart from "@/components/AnnualReturnsChart"
import TrailingReturnsTable from "@/components/TrailingReturnsTable"
import RollingReturnsTable from "@/components/RollingReturnsTable"
import AnnualMetricsTable from "@/components/AnnualReturns"
import MonthlyPLTable from "@/components/MonthlyPLTable"
import ChartColorManager from "@/components/ChartColorManager"
import PortfolioReportGenerator from "@/components/PortfolioReportGenerator"

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table"


// --------------------- Metrics Arrays ---------------------
const performanceMetrics = [
  { label: "Alpha (annualized)", key: "Alpha (annualized)" },
  { label: "Annualized Return (CAGR)", key: "Annualized Return (CAGR)" },
  { label: "Average Days in Drawdown", key: "Average Days in Drawdown" },
  { label: "Average Drawdown", key: "Average Drawdown" },
  { label: "Best Year", key: "Best Year" },
  { label: "Best Year Return", key: "Best Year Return" },
  { label: "Beta", key: "Beta" },
  { label: "Calmar Ratio", key: "Calmar Ratio" },
  { label: "Max Gain/Day (%)", key: "Max Gain/Day" },
  { label: "Max Loss/Day (%)", key: "Max Loss/Day" },
  { label: "Maximum Drawdown", key: "Maximum Drawdown" },
  { label: "Sharpe Ratio", key: "Sharpe Ratio" },
  { label: "Sortino Ratio", key: "Sortino Ratio" },
  { label: "Standard Deviation (annualized)", key: "Standard Deviation (annualized)" },
  { label: "Treynor Ratio (%)", key: "Treynor Ratio" },
  { label: "Worst Year", key: "Worst Year" },
  { label: "Worst Year Return", key: "Worst Year Return" },
  { label: "Max Drawdown Start Date", key: "Max Drawdown Start Date" }
];

const DEFAULT_COLORS = [
  "#81b17b", // light green
  "#4e8e75", // teal green
  "#417f70", // darker teal
  "#7cb484", // soft green
  "#0a1d1e"  // very dark green/black
];


const riskReturnMetrics = [
  { label: "Standard Deviation (annualized)", key: "Standard Deviation (annualized)" },
  { label: "Average Drawdown", key: "Average Drawdown" },
  { label: "Average Days in Drawdown", key: "Average Days in Drawdown" },
  { label: "Maximum Drawdown", key: "Maximum Drawdown" },
  { label: "Benchmark Correlation", key: "Benchmark Correlation" },
  { label: "Sharpe Ratio", key: "Sharpe Ratio" },
  { label: "Sortino Ratio", key: "Sortino Ratio" },
];



// CSV Download utility (same as before) ...
// MetricsDownloadButtons => use <div className="flex flex-wrap gap-2"> instead of Row/Col

function CombinedPortfolioResults({ portfolios }) {
  const COLORS = [
    "#945c39"
  ];

  const [navChartOptions, setNavChartOptions] = useState({
    title: { text: null },
    chart: {
      backgroundColor: "#FCF9EB",
      zoomType: "x",
      height: 600,
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
          })} ${date.getFullYear()}`;
        },
        style: { fontSize: "12px" },
      },
    },
    yAxis: {
      title: { text: "NAV", style: { fontSize: "14px" } },
      min: null,
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
      split: false,
      formatter: function () {
        let tooltipHtml = `<b>${Highcharts.dateFormat("%Y-%m-%d", this.x)}</b><br/>`;
        this.points.forEach((point) => {
          const value = Highcharts.numberFormat(point.y, 0);
          tooltipHtml += `<span style="color:${point.series.color}">\u25CF</span> ${point.series.name}: <b>${value}</b><br/>`;
        });
        return tooltipHtml;
      },
    },
    plotOptions: { series: { lineWidth: 2, animation: { duration: 1500 } } },
    series: [], // your dynamic data goes here, each can have a `color` property
    credits: { enabled: false },
  });

  // --------------------- Drawdown Chart Options ---------------------
  const [drawdownChartOptions, setDrawdownChartOptions] = useState({
    title: { text: null },
    chart: {
      backgroundColor: "#FCF9EB",
      zoomType: "x",
      type: "line",
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
          })} ${date.getFullYear()}`;
        },
        style: { fontSize: "12px" },
      },
    },
    yAxis: {
      title: {
        text: "Drawdown (%)",
        style: { fontSize: "14px" },
      },
      min: -50, // Set the y-axis limit to -50%
      max: 0,
      labels: {
        style: { fontSize: "12px" },
        formatter: function () {
          return `- ${Highcharts.numberFormat(Math.abs(this.value), 1)}%`;
        },
      },
      gridLineWidth: 1,
    },
    legend: {
      enabled: true,
      itemStyle: { fontSize: "12px" },
    },
    tooltip: {
      shared: true,
      split: false,
      formatter: function () {
        let tooltipHtml = `<b>${Highcharts.dateFormat("%Y-%m-%d", this.x)}</b><br/>`;
        this.points.forEach((point) => {
          const value = `${Highcharts.numberFormat(Math.abs(point.y), 1)}%`;
          tooltipHtml += `<span style="color:${point.series.color}">\u25CF</span> ${point.series.name}: <b> - ${value}</b><br/>`;
        });
        return tooltipHtml;
      },
    },
    plotOptions: {
      series: {
        lineWidth: 2,
        dashStyle: "Solid",  // Ensure solid line
        animation: { duration: 1500 },
        marker: {
          enabled: false
        },
        states: {
          hover: {
            lineWidth: 2
          }
        }
      }
    },
    series: [], // Data series will be dynamically updated
    credits: { enabled: false },
  });

  useEffect(() => {
    if (!portfolios?.length) return

    // NAV chart setup (same as before)
    const navSeries = portfolios
      .map((portfolio, index) => {
        if (portfolio.result?.equity_curve_data) {
          const chartData = portfolio.result.equity_curve_data.map((point) => {
            const [day, month, year] = point.date.split("-")
            const dateUTC = Date.UTC(+year, +month - 1, +day)
            return [dateUTC, point.NAV]
          })

          return {
            name: `${portfolio.portfolio_name} NAV`,
            data: chartData,
            color: DEFAULT_COLORS[index % DEFAULT_COLORS.length],
          }
        }
        return null
      })
      .filter(Boolean)

    setNavChartOptions((prev) => ({ ...prev, series: navSeries }))

    let maxDrawdown = 0;
    portfolios.forEach(p => {
      if (p.result?.drawdown_data) {
        p.result.drawdown_data.forEach(pt => {
          // ensure negatives; clamp any tiny positive noise to 0
          const v = pt.Drawdown <= 0 ? pt.Drawdown : 0;
          maxDrawdown = Math.min(maxDrawdown, v);
        });
      }
    });

    const drawdownSeries = portfolios
      .map((portfolio, index) => {
        if (!portfolio.result?.drawdown_data) return null;

        const drawdownData = portfolio.result.drawdown_data.map((point, i) => {
          const [day, month, year] = point.date.split("-");
          const dateUTC = Date.UTC(+year, +month - 1, +day);
          // clamp to <= 0; force first point to 0
          const v = i === 0 ? 0 : (point.Drawdown <= 0 ? point.Drawdown : 0);
          return [dateUTC, v];
        });

        return {
          name: `${portfolio.portfolio_name || `Portfolio ${index + 1}`} Drawdown`,
          data: drawdownData,
          color: DEFAULT_COLORS[index % DEFAULT_COLORS.length],
          lineWidth: 2,
          marker: { enabled: false }
        };
      })
      .filter(Boolean);

    // Safe lower bound (5% buffer) but do not go above 0 at the top
    const lower = maxDrawdown * 1.05; // e.g. -27% -> -28.35%
    setDrawdownChartOptions(prev => ({
      ...prev,
      yAxis: {
        ...prev.yAxis,
        max: 0,                 // hard cap at zero (top)
        softMax: 0,             // keep Highcharts from nudging above 0
        ceiling: 0,             // hard ceiling
        startOnTick: true,
        endOnTick: true,
        min: Number.isFinite(lower) && lower < 0 ? lower : -5, // fallback
        tickInterval: Math.abs((Number.isFinite(lower) && lower < 0 ? lower : -5)) / 6,
      },
      series: drawdownSeries,
    }));

  }, [portfolios])

  const renderDrawdownsComparison = () => {
    if (!portfolios?.length) return null
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {portfolios.map((portfolio, i) => (
          <Card key={i} className="shadow">
            <CardHeader>
              <CardTitle>
                {portfolio.portfolio_name || `Portfolio ${i + 1}`} - Top Drawdowns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center bg-primary text-white">DD (%)</TableHead>
                    <TableHead className="text-center bg-primary text-white">Peak</TableHead>
                    <TableHead className="text-center bg-primary text-white">Bottom</TableHead>
                    <TableHead className="text-center bg-primary text-white">Recovery</TableHead>
                    <TableHead className="text-center bg-primary text-white">Days</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {portfolio.result?.top_10_worst_drawdowns
                    ?.slice(0, 5)
                    .map((dd, idx) => (
                      <TableRow key={idx}>
                        <TableCell
                          className={`text-center ${
                            dd.Drawdown < 0 ? "text-red-600" : ""
                          }`}
                        >
                          {dd.Drawdown.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">{dd.Peak_date}</TableCell>
                        <TableCell className="text-center">{dd.Drawdown_date}</TableCell>
                        <TableCell className="text-center">{dd.Recovery_date}</TableCell>
                        <TableCell className="text-center">
                          {dd.Recovery_date !== "Not Recovered"
                            ? calculateDaysBetween(dd.Peak_date, dd.Recovery_date)
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const getMetricValue = (portfolio, key) =>
    portfolio?.result?.additional_risk_return_metrics?.[key]

  const formatValue = (value, key) => {
    if (typeof value === "string") return value
    if (value == null || isNaN(value)) return "-"
    if (key === "Best Year" || key === "Worst Year") return Math.round(value).toString()
    const percentageMetrics = [
      "Annualized Return (CAGR)",
      "Best Year Return",
      "Worst Year Return",
      "Standard Deviation (annualized)",
      "Maximum Drawdown",
      "Treynor Ratio (%)",
    ]
    return percentageMetrics.includes(key)
      ? `${(value * 100).toFixed(2)}%`
      : value.toFixed(2)
  }

  const MetricsTable = ({ title, metrics }) => (
    <Card className="shadow">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader className="bg-primary text-white">
            <TableRow className="bg-primary text-white">
              <TableHead className="bg-primary text-white">Metric</TableHead>
              {portfolios.map((p, idx) => (
                <TableHead key={idx} className="bg-primary text-white">
                  {p.portfolio_name || `Portfolio ${idx + 1}`}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {metrics.map(({ label, key }) => (
              <TableRow key={key}>
                <TableCell>{label}</TableCell>
                {portfolios.map((portfolio, idx) => (
                  <TableCell key={idx}>
                    {formatValue(getMetricValue(portfolio, key), key)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">
          Risk Free Rate is assumed as 6.5%
        </p>
      </CardFooter>
    </Card>
  )

  return (
    <div className="container mx-auto px-4 pb-10">
      {/* Report generator */}
      <div className="my-4">
        <PortfolioReportGenerator portfolios={portfolios} />
      </div>

      {/* Donut charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {portfolios.map((portfolio, i) => {
          const systems = portfolio.selected_systems || []
          if (!systems.length) return null
          const data = systems.map((s) => ({ name: s.system, y: s.weightage }))
          return (
            <DonutChart
              key={i}
              data={data}
              title={`${portfolio.portfolio_name || `Portfolio ${i + 1}`} - Systems Weightage`}
            />
          )
        })}
      </div>

      <MetricsTable title="Performance Summary" metrics={performanceMetrics} />

      {/* Charts */}
      <Card className="shadow my-6">
        <CardHeader className="flex justify-between items-center">
          <CardTitle>Portfolio NAV</CardTitle>
          <ChartColorManager
            chartOptions={navChartOptions}
            setChartOptions={setNavChartOptions}
          />
        </CardHeader>
        <CardContent>
          <HighchartsReact highcharts={Highcharts} options={navChartOptions} />
        </CardContent>
      </Card>

      <Card className="shadow my-6">
        <CardHeader className="flex justify-between items-center">
          <CardTitle>Portfolio Drawdowns</CardTitle>
          <ChartColorManager
            chartOptions={drawdownChartOptions}
            setChartOptions={setDrawdownChartOptions}
          />
        </CardHeader>
        <CardContent>
          <HighchartsReact
            highcharts={Highcharts}
            options={drawdownChartOptions}
            containerProps={{ style: { height: "400px", width: "100%" } }}
          />
        </CardContent>
      </Card>

      <div className="my-6">
        <AnnualReturnsChart portfolios={portfolios} />
      </div>

      <div className="my-6">
        <TrailingReturnsTable portfolios={portfolios} separateTables />
      </div>
      <div className="my-6">
        <RollingReturnsTable portfolios={portfolios} />
      </div>
      <div className="my-6">
        <AnnualMetricsTable portfolios={portfolios} />
      </div>

      <div className="my-6">
        <MonthlyPLTable portfolios={portfolios} />
      </div>

      {renderDrawdownsComparison()}
    </div>
  )
}

export default CombinedPortfolioResults
