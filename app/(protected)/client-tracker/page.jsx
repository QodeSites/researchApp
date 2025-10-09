"use client"
import React, { useState, useEffect, useMemo } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"

const convertToNumber = (value) => {
  if (value === null || value === undefined || value === "NaN") return null
  const parsed = parseFloat(value)
  return isNaN(parsed) ? null : parsed
}
const formatNumber = (value, suffix = "") => {
  if (value === null || value === undefined) return "-"
  const num = Number(value)
  if (isNaN(num)) return "-"
  return (
    num.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + suffix
  )
}

const PYTHON_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://calculator.qodeinvest.com"
    : "http://localhost:5080"

export default function ClientTracker() {
  const [data, setData] = useState({
    portfolio_tracker: [],
    trailing_returns: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeView, setActiveView] = useState("portfolio")

  const [portfolioSearch, setPortfolioSearch] = useState("")
  const [returnsSearch, setReturnsSearch] = useState("")
  const [sortConfig, setSortConfig] = useState({ key: "#", direction: "asc" })

  // --- Fetch Data ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientResponse, trailingResponse] = await Promise.all([
          fetch(`${PYTHON_BASE_URL}/api/clienttracker/portfolio_details`),
          fetch(`${PYTHON_BASE_URL}/api/clienttracker/trailing_returns`),
        ])

        const clientResult = await clientResponse.json()
        const trailingReturnsResult = await trailingResponse.json()

        // ✅ Assign fixed indices for consistent order
        const portfolioData = (clientResult.data || []).map((item, idx) => ({
          ...item,
          idx: idx + 1,
        }))
        const returnsData = (trailingReturnsResult || []).map((item, idx) => ({
          ...item,
          idx: idx + 1,
        }))

        setData({
          portfolio_tracker: portfolioData,
          trailing_returns: returnsData,
        })
      } catch (err) {
        setError("Failed to fetch data")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // --- Filtering ---
  const filteredPortfolio = useMemo(() => {
    return data.portfolio_tracker.filter(
      (item) =>
        item.name?.toLowerCase().includes(portfolioSearch.toLowerCase()) ||
        item.nuvama_code?.toLowerCase().includes(portfolioSearch.toLowerCase()) ||
        item.account?.toLowerCase().includes(portfolioSearch.toLowerCase())
    )
  }, [data.portfolio_tracker, portfolioSearch])

  const filteredReturns = useMemo(() => {
    return data.trailing_returns.filter(
      (item) =>
        item.name?.toLowerCase().includes(returnsSearch.toLowerCase()) ||
        item.nuvama_code?.toLowerCase().includes(returnsSearch.toLowerCase()) ||
        item.account?.toLowerCase().includes(returnsSearch.toLowerCase())
    )
  }, [data.trailing_returns, returnsSearch])

  // --- Sorting helper ---
  const getSortedData = (dataArray) => {
    const { key, direction } = sortConfig
    if (!key || key === "#") return [...dataArray].sort((a, b) => a.idx - b.idx)

    return [...dataArray].sort((a, b) => {
      let aValue = a[key],
        bValue = b[key]
      if (aValue === "-" || aValue === undefined || aValue === null) aValue = null
      if (bValue === "-" || bValue === undefined || bValue === null) bValue = null
      if (aValue === null && bValue === null) return 0
      if (aValue === null) return 1
      if (bValue === null) return -1
      if (!isNaN(parseFloat(aValue)) && !isNaN(parseFloat(bValue))) {
        return direction === "asc"
          ? parseFloat(aValue) - parseFloat(bValue)
          : parseFloat(bValue) - parseFloat(aValue)
      }
      return direction === "asc"
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue))
    })
  }

  const sortedPortfolio = getSortedData(filteredPortfolio)
  const sortedReturns = getSortedData(filteredReturns)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 min-h-screen">
      <h1 className="text-2xl font-bold">Client Tracker</h1>

      {/* View toggles */}
      <div className="flex gap-2">
        <Button
          variant={activeView === "portfolio" ? "default" : "outline"}
          onClick={() => setActiveView("portfolio")}
        >
          Portfolio
        </Button>
        <Button
          variant={activeView === "returns" ? "default" : "outline"}
          onClick={() => setActiveView("returns")}
        >
          Trailing Returns
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* --- Portfolio Table --- */}
      {activeView === "portfolio" && (
        <div>
          <Input
            placeholder="Search portfolio..."
            value={portfolioSearch}
            onChange={(e) => setPortfolioSearch(e.target.value)}
            className="max-w-sm mb-4 bg-background rounded-lg"
          />

          <Table className="bg-background rounded-lg">
            <TableHeader className="bg-primary text-white font-bold">
              <TableRow className="cursor-pointer text-white font-bold">
                <TableHead
                  className="cursor-pointer text-white font-bold"
                  onClick={() => setSortConfig({ key: "#", direction: "asc" })}
                >
                  #
                </TableHead>
                {[
                  { label: "Name", key: "name" },
                  { label: "Code", key: "nuvama_code" },
                  { label: "Account", key: "account" },
                  { label: "Portfolio Value", key: "portfolio_value" },
                  { label: "Cash", key: "cash" },
                  { label: "Cash %", key: "cash_percentage" },
                  { label: "Derivatives %", key: "derivatives_percentage" },
                ].map((col) => (
                  <TableHead
                    key={col.key}
                    className="cursor-pointer text-white font-bold"
                    onClick={() =>
                      setSortConfig((prev) => ({
                        key: col.key,
                        direction:
                          prev.key === col.key && prev.direction === "asc"
                            ? "desc"
                            : "asc",
                      }))
                    }
                  >
                    {col.label}
                    {sortConfig.key === col.key
                      ? sortConfig.direction === "asc"
                        ? " ▲"
                        : " ▼"
                      : ""}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPortfolio.length > 0 ? (
                sortedPortfolio.map((item) => (
                  <TableRow key={item.idx}>
                    <TableCell>{item.idx}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.nuvama_code}</TableCell>
                    <TableCell>{item.account}</TableCell>
                    <TableCell>{formatNumber(item.portfolio_value)}</TableCell>
                    <TableCell>{formatNumber(item.cash)}</TableCell>
                    <TableCell>{formatNumber(item.cash_percentage, "%")}</TableCell>
                    <TableCell>
                      {formatNumber(item.derivatives_percentage, "%")}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">
                    No portfolio entries found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* --- Trailing Returns Table --- */}
      {activeView === "returns" && (
        <div>
          <Input
            placeholder="Search returns..."
            value={returnsSearch}
            onChange={(e) => setReturnsSearch(e.target.value)}
            className="max-w-sm mb-4 bg-background rounded-lg"
          />

          <Table className="bg-background rounded-lg">
            <TableHeader className="bg-primary text-white font-bold">
              <TableRow className="cursor-pointer text-white font-bold">
                <TableHead
                  className="cursor-pointer text-white font-bold"
                  onClick={() => setSortConfig({ key: "#", direction: "asc" })}
                >
                  #
                </TableHead>
                {[
                  "name",
                  "nuvama_code",
                  "account",
                  "inception_date",
                  "d10",
                  "m1",
                  "m3",
                  "m6",
                  "y1",
                  "y2",
                  "y5",
                  "since_inception",
                  "nifty_since_inception",
                  "mdd",
                  "current_drawdown",
                ].map((key) => (
                  <TableHead
                    key={key}
                    className="cursor-pointer text-white font-bold"
                    onClick={() =>
                      setSortConfig((prev) => ({
                        key,
                        direction:
                          prev.key === key && prev.direction === "asc"
                            ? "desc"
                            : "asc",
                      }))
                    }
                  >
                    {key.replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase())}
                    {sortConfig.key === key
                      ? sortConfig.direction === "asc"
                        ? " ▲"
                        : " ▼"
                      : ""}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedReturns.length > 0 ? (
                sortedReturns
                  .filter((item) => formatNumber(item.d10) !== "-")
                  .map((item) => (
                    <TableRow key={item.idx}>
                      <TableCell>{item.idx}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.nuvama_code}</TableCell>
                      <TableCell>{item.account}</TableCell>
                      <TableCell>{item.inception_date}</TableCell>
                      <TableCell>{formatNumber(item.d10, "%")}</TableCell>
                      <TableCell>{formatNumber(item.m1, "%")}</TableCell>
                      <TableCell>{formatNumber(item.m3, "%")}</TableCell>
                      <TableCell>{formatNumber(item.m6, "%")}</TableCell>
                      <TableCell>{formatNumber(item.y1, "%")}</TableCell>
                      <TableCell>{formatNumber(item.y2, "%")}</TableCell>
                      <TableCell>{formatNumber(item.y5, "%")}</TableCell>
                      <TableCell>{formatNumber(item.since_inception, "%")}</TableCell>
                      <TableCell>{formatNumber(item.nifty_since_inception, "%")}</TableCell>
                      <TableCell>{formatNumber(item.mdd, "%")}</TableCell>
                      <TableCell>{formatNumber(item.current_drawdown, "%")}</TableCell>
                    </TableRow>
                  ))
              ) : (
                <TableRow>
                  <TableCell colSpan={16} className="text-center">
                    No returns entries found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
