"use client"
import React, { useState } from "react"
import * as XLSX from "xlsx"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { calculateDaysBetween } from "@/utils/dateUtils"
import html2canvas from "html2canvas"
import { saveAs } from "file-saver"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"

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
  { label: "Max Drawdown Start Date", key: "Max Drawdown Start Date" },
]

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

  if (percentageMetrics.includes(key)) {
    return `${(value * 100).toFixed(2)}%`
  }
  return value.toFixed(2)
}

export default function PortfolioReportGenerator({ portfolios }) {
  const [open, setOpen] = useState(false)
  const [selectedPortfolioIndex, setSelectedPortfolioIndex] = useState(0)
  const [reportFormat, setReportFormat] = useState("excel")
  const [selectedComponents, setSelectedComponents] = useState({
    performanceMetrics: true,
    navChart: true,
    drawdownChart: true,
    annualReturns: true,
    trailingReturns: true,
    rollingReturns: true,
    monthlyPL: true,
    drawdownsTable: true,
  })

  const toggleComponent = (key) => {
    setSelectedComponents((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // ------------------- Excel Report -------------------
  const generateExcelReport = () => {
    const portfolio = portfolios[selectedPortfolioIndex]
    const workbook = XLSX.utils.book_new()

    const addSheet = (data, name) => {
      const ws = XLSX.utils.json_to_sheet(data)
      XLSX.utils.book_append_sheet(workbook, ws, name)
    }

    if (selectedComponents.performanceMetrics) {
      const perfData = performanceMetrics.map((m) => ({
        Metric: m.label,
        Value: formatValue(
          portfolio.result?.additional_risk_return_metrics?.[m.key],
          m.key
        ),
      }))
      addSheet(perfData, "Performance Metrics")
    }

    if (selectedComponents.annualReturns) {
      const annual = (portfolio.result?.annual_returns || []).map((x) => ({
        Year: x.year,
        Return: `${(x.return).toFixed(2)}%`,
      }))
      addSheet(annual, "Annual Returns")
    }

    if (selectedComponents.trailingReturns) {
      const trailing = Object.entries(portfolio.result?.trailing_returns || {}).map(
        ([p, r]) => ({
          Period: p,
          Return: r != null && !isNaN(r) ? `${(r).toFixed(2)}%` : "-",
        })
      )
      addSheet(trailing, "Trailing Returns")
    }

    if (selectedComponents.rollingReturns) {
      const rolling = Object.entries(portfolio.result?.rolling_returns || {})
        .filter(([_, v]) => v)
        .map(([p, v]) => ({
          Period: p,
          Avg: `${v.avg.toFixed(2)}%`,
          High: `${v.high.toFixed(2)}%`,
          Low: `${v.low.toFixed(2)}%`,
        }))
      addSheet(rolling, "Rolling Returns")
    }

    if (selectedComponents.monthlyPL) {
      const MONTHS = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
      ]
      const monthly = (portfolio.result?.monthly_pl_table || []).map((y) => {
        const { Year, Total, ...months } = y
        const row = { Year }
        MONTHS.forEach((m) => {
          row[m] = months[m] != null ? months[m].toFixed(2) : "0.00"
        })
        row.Total = Total != null ? Total.toFixed(2) : "0.00"
        return row
      })
      addSheet(monthly, "Monthly P&L")
    }

    if (selectedComponents.drawdownsTable) {
      const dds =
        portfolio.result?.top_10_worst_drawdowns?.slice(0, 5).map((dd) => ({
          "Drawdown (%)": dd.Drawdown.toFixed(2),
          "Peak Date": dd.Peak_date,
          "Bottom Date": dd.Drawdown_date,
          "Recovery Date": dd.Recovery_date,
          "Days to Recover":
            dd.Recovery_date !== "Not Recovered"
              ? calculateDaysBetween(dd.Peak_date, dd.Recovery_date)
              : "-",
        })) || []
      addSheet(dds, "Top Drawdowns")
    }

    if (portfolio.result?.drawdown_data?.length) {
      const ddSeries = portfolio.result.drawdown_data.map((r) => ({
        Date: r.date,
        "Drawdown (%)": r.Drawdown ?? r.drawdown ?? "-",
      }))
      addSheet(ddSeries, "Drawdown Series")
    }

    if (selectedComponents.navChart) {
      const nav = portfolio.result?.equity_curve_data?.map((r) => ({
        Date: r.date,
        Nav: r.NAV,
      })) || []
      addSheet(nav, "NAV")
    }

    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
    saveAs(blob, `${portfolio.portfolio_name || "Portfolio"}_Report.xlsx`)
  }

  // ------------------- PDF Report -------------------
  const generatePDFReport = async () => {
    const portfolio = portfolios[selectedPortfolioIndex]
    const doc = new jsPDF()
    let y = 20

    doc.setFontSize(18)
    doc.text(
      `${portfolio.portfolio_name || "Portfolio"} Report`,
      105,
      y,
      { align: "center" }
    )
    y += 15

    if (selectedComponents.performanceMetrics) {
      doc.setFontSize(14).text("Performance Metrics", 14, y)
      y += 10
      const data = performanceMetrics.map((m) => [
        m.label,
        formatValue(
          portfolio.result?.additional_risk_return_metrics?.[m.key],
          m.key
        ),
      ])
      autoTable(doc, { startY: y, head: [["Metric", "Value"]], body: data })
      y = doc.lastAutoTable.finalY + 10
    }

    if (selectedComponents.annualReturns) {
      doc.setFontSize(14).text("Annual Returns", 14, y)
      y += 10
      const data = (portfolio.result?.annual_returns || []).map((x) => [
        x.year,
        `${x.return.toFixed(2)}%`,
      ])
      autoTable(doc, { startY: y, head: [["Year", "Return"]], body: data })
      y = doc.lastAutoTable.finalY + 10
    }

    if (selectedComponents.trailingReturns) {
      doc.setFontSize(14).text("Trailing Returns", 14, y)
      y += 10
      const data = Object.entries(portfolio.result?.trailing_returns || {}).map(
        ([p, r]) => [p, r != null && !isNaN(r) ? `${r.toFixed(2)}%` : "-"]
      )
      autoTable(doc, { startY: y, head: [["Period", "Return"]], body: data })
      y = doc.lastAutoTable.finalY + 10
    }

    if (selectedComponents.rollingReturns) {
      doc.setFontSize(14).text("Rolling Returns", 14, y)
      y += 10
      const data = Object.entries(portfolio.result?.rolling_returns || {})
        .filter(([_, v]) => v)
        .map(([p, v]) => [p, `${v.avg}%`, `${v.high}%`, `${v.low}%`])
      autoTable(doc, {
        startY: y,
        head: [["Period", "Avg", "High", "Low"]],
        body: data,
      })
      y = doc.lastAutoTable.finalY + 10
    }

    if (selectedComponents.monthlyPL) {
      doc.setFontSize(14).text("Monthly P&L", 14, y)
      y += 10
      const MONTHS = [
        "January","February","March","April","May","June",
        "July","August","September","October","November","December",
      ]
      const data = (portfolio.result?.monthly_pl_table || []).map((y) => {
        const { Year, Total, ...months } = y
        return [
          Year,
          ...MONTHS.map((m) => (months[m] != null ? months[m].toFixed(2) : "0.00")),
          Total != null ? Total.toFixed(2) : "0.00",
        ]
      })
      autoTable(doc, {
        startY: y,
        head: [["Year", ...MONTHS, "Total"]],
        body: data,
      })
      y = doc.lastAutoTable.finalY + 10
    }

    if (selectedComponents.drawdownsTable) {
      doc.setFontSize(14).text("Top Drawdowns", 14, y)
      y += 10
      const data =
        portfolio.result?.top_10_worst_drawdowns?.slice(0, 5).map((dd) => [
          dd.Drawdown.toFixed(2),
          dd.Peak_date,
          dd.Drawdown_date,
          dd.Recovery_date,
          dd.Recovery_date !== "Not Recovered"
            ? calculateDaysBetween(dd.Peak_date, dd.Recovery_date)
            : "-",
        ]) || []
      autoTable(doc, {
        startY: y,
        head: [["DD (%)", "Peak", "Bottom", "Recovery", "Days"]],
        body: data,
      })
      y = doc.lastAutoTable.finalY + 10
    }

    if (selectedComponents.navChart || selectedComponents.drawdownChart) {
      doc.addPage()
      y = 20
      doc.setFontSize(16).text("Charts", 105, y, { align: "center" })
      y += 15

      if (selectedComponents.navChart) {
        const el = document.querySelector("#nav-chart-container")
        if (el) {
          const canvas = await html2canvas(el)
          doc.addImage(canvas.toDataURL("image/png"), "PNG", 15, y, 180, 100)
          y += 110
        }
      }
      if (selectedComponents.drawdownChart) {
        const el = document.querySelector("#drawdown-chart-container")
        if (el) {
          const canvas = await html2canvas(el)
          doc.addImage(canvas.toDataURL("image/png"), "PNG", 15, y, 180, 100)
        }
      }
    }

    doc.save(`${portfolio.portfolio_name || "Portfolio"}_Report.pdf`)
  }

  const handleGenerate = () => {
    reportFormat === "excel" ? generateExcelReport() : generatePDFReport()
    setOpen(false)
  }

  return (
    <>
      <Button variant="success" onClick={() => setOpen(true)} className="bg-muted-foreground w-full text-accent flex items-center gap-2">
        📄 Generate Comprehensive Report
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Generate Portfolio Report</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Selects */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label>Select Portfolio</Label>
                <Select
                  value={String(selectedPortfolioIndex)}
                  onValueChange={(v) => setSelectedPortfolioIndex(parseInt(v))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Choose portfolio" />
                  </SelectTrigger>
                  <SelectContent>
                    {portfolios.map((p, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {p.portfolio_name || `Portfolio ${i + 1}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Report Format</Label>
                <Select value={reportFormat} onValueChange={setReportFormat}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Choose format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excel">Excel</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Components */}
            <Card>
              <CardHeader>
                <CardTitle>Select Components</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.keys(selectedComponents).map((key) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={key}
                      checked={selectedComponents[key]}
                      onCheckedChange={() => toggleComponent(key)}
                    />
                    <Label htmlFor={key} className="capitalize">
                      {key.replace(/([A-Z])/g, " $1")}
                    </Label>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-primary text-accent" onClick={handleGenerate}>Generate Report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
