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

const AnnualMetricsTable = ({ portfolios }) => {
  const extractAnnualMetrics = (portfolio) => {
    const metrics = portfolio.result?.additional_risk_return_metrics?.annual_metrics
    if (!metrics) return []

    return Object.keys(metrics).map((year) => ({
      year: parseInt(year, 10),
      return: metrics[year].return_percentage || 0,
      balance: metrics[year].end_balance || 0,
    }))
  }

  const allMetrics = portfolios.map((p) => extractAnnualMetrics(p))

  const allYears = Array.from(
    new Set(allMetrics.flatMap((metrics) => metrics.map((m) => m.year)))
  ).sort((a, b) => a - b)

  return (
    <Card className="shadow">
      <CardHeader>
        <CardTitle>Annual Metrics Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center align-middle">
                
              </TableHead>
              {portfolios.map((portfolio, index) => (
                <TableHead
                  key={index}
                  colSpan={2}
                  className="text-center font-semibold"
                >
                  {portfolio.portfolio_name || `Portfolio ${index + 1}`}
                </TableHead>
              ))}
            </TableRow>
            <TableRow>
              
              <TableHead className="text-center align-middle bg-primary text-white">
                Year
              </TableHead>
              {portfolios.map((_, index) => (
                <React.Fragment key={index}>
                  <TableHead className="text-center bg-primary text-white">Return (%)</TableHead>
                  <TableHead className="text-center bg-primary text-white">Balance</TableHead>
                </React.Fragment>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {allYears.map((year) => (
              <TableRow key={year}>
                <TableCell className="text-center font-medium">{year}</TableCell>
                {allMetrics.map((metrics, idx) => {
                  const yearMetric = metrics.find((m) => m.year === year)
                  const val = isNaN(yearMetric.return) ? "-" : `${yearMetric.return.toFixed(2)}%`
                  return yearMetric ? (
                    <React.Fragment key={idx}>
                      <TableCell
                        className={`text-center ${
                          yearMetric.return > 0
                            ? "text-green-600"
                            : yearMetric.return < 0
                            ? "text-red-600"
                            : ""
                        }`}
                      >
                        {val}
                      </TableCell>
                      <TableCell className="text-center">
                        {yearMetric.balance.toLocaleString("en-IN", {
                          style: "currency",
                          currency: "INR",
                        })}
                      </TableCell>
                    </React.Fragment>
                  ) : (
                    <React.Fragment key={idx}>
                      <TableCell className="text-center">-</TableCell>
                      <TableCell className="text-center">-</TableCell>
                    </React.Fragment>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export default AnnualMetricsTable
