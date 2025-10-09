"use client"
import React from "react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table"

const PortfolioMetrics = ({ portfolios }) => {
  const performanceMetrics = [
    { label: "Annualized Return (CAGR)", key: "Annualized Return (CAGR)" },
    { label: "Standard Deviation (annualized)", key: "Standard Deviation (annualized)" },
    { label: "Best Year", key: "Best Year" },
    { label: "Best Year Return", key: "Best Year Return" },
    { label: "Worst Year", key: "Worst Year" },
    { label: "Worst Year Return", key: "Worst Year Return" },
    { label: "Maximum Drawdown", key: "Maximum Drawdown" },
  ]

  const riskReturnMetrics = [
    { label: "Standard Deviation (annualized)", key: "Standard Deviation (annualized)" },
    { label: "Maximum Drawdown", key: "Maximum Drawdown" },
    { label: "Beta", key: "Beta" },
    { label: "Alpha (annualized)", key: "Alpha (annualized)" },
    { label: "Sharpe Ratio", key: "Sharpe Ratio" },
    { label: "Sortino Ratio", key: "Sortino Ratio" },
    { label: "Treynor Ratio (%)", key: "Treynor Ratio (%)" },
    { label: "Calmar Ratio", key: "Calmar Ratio" },
  ]

  const getMetricValue = (portfolio, key) =>
    portfolio?.result?.additional_risk_return_metrics?.[key]

  const formatValue = (value, key) => {
    if (value == null || isNaN(value)) return "-"

    if (key === "Best Year" || key === "Worst Year") {
      return Math.round(value).toString()
    }

    const percentageMetrics = [
      "Annualized Return (CAGR)",
      "Best Year Return",
      "Worst Year Return",
      "Standard Deviation (annualized)",
      "Maximum Drawdown",
      "Treynor Ratio (%)",
    ]

    if (percentageMetrics.includes(key)) {
      return `${(value * 100).toFixed(2)}%`
    }

    return value.toFixed(2)
  }

  const MetricsTable = ({ title, metrics }) => (
    <Card className="mb-6 shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-primary text-white">
              <TableRow>
                <TableHead className="bg-primary text-white">Metric</TableHead>
                {portfolios.map((_, index) => (
                  <TableHead key={index} className="text-center bg-primary text-white">
                    Portfolio {index + 1}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.map(({ label, key }) => (
                <TableRow key={key}>
                  <TableCell>{label}</TableCell>
                  {portfolios.map((portfolio, idx) => {
                    const value = getMetricValue(portfolio, key)
                    return (
                      <TableCell key={idx} className="text-center">
                        {formatValue(value, key)}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="mt-6 space-y-6">
      <MetricsTable title="Performance Summary" metrics={performanceMetrics} />
      <MetricsTable title="Risk and Return Metrics" metrics={riskReturnMetrics} />
    </div>
  )
}

export default PortfolioMetrics
