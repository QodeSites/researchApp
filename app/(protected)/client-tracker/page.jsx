
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
  const [data, setData] = useState({ portfolio_tracker: [], trailing_returns: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeView, setActiveView] = useState("portfolio") // "portfolio" or "returns"

  const [portfolioSearch, setPortfolioSearch] = useState("")
  const [returnsSearch, setReturnsSearch] = useState("")
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientResponse, trailingResponse] = await Promise.all([
          fetch(`${PYTHON_BASE_URL}/api/clienttracker/portfolio_details`),
          fetch(`${PYTHON_BASE_URL}/api/clienttracker/trailing_returns`)
        ])

        const clientResult = await clientResponse.json()
        const trailingReturnsResult = await trailingResponse.json()

        setData({
          portfolio_tracker: clientResult.data || [],
          trailing_returns: trailingReturnsResult || [],
        })

      } catch (err) {
        setError("Failed to fetch data")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

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

  // Helper function for sorting
  const getSortedData = (dataArray) => {
    const { key, direction } = sortConfig;
    if (!key) return dataArray;
    return [...dataArray].sort((a, b) => {
      let aValue = a[key],
        bValue = b[key];
      if (aValue === "-" || aValue === undefined || aValue === null) aValue = null;
      if (bValue === "-" || bValue === undefined || bValue === null) bValue = null;
      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return 1;
      if (bValue === null) return -1;
      if (!isNaN(parseFloat(aValue)) && !isNaN(parseFloat(bValue))) {
        return direction === "asc"
          ? parseFloat(aValue) - parseFloat(bValue)
          : parseFloat(bValue) - parseFloat(aValue);
      }
      return direction === "asc"
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });
  };

  const sortedPortfolio = getSortedData(filteredPortfolio);
  const sortedReturns = getSortedData(filteredReturns);

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

      {/* Portfolio Table */}
      {activeView === "portfolio" && (
        <div>
          <Input
            placeholder="Search portfolio..."
            value={portfolioSearch}
            onChange={(e) => setPortfolioSearch(e.target.value)}
            className="max-w-sm mb-4 bg-background rounded-lg"
          />

          <Table className="bg-background rounded-lg">
            <TableHeader className="bg-primary rounded-lg text-white font-bold">
              <TableRow>
                <TableHead 
                  className="bg-primary text-white font-bold cursor-pointer"
                  onClick={() =>
                    setSortConfig((prev) => ({
                      key: "name",
                      direction:
                        prev.key === "name" && prev.direction === "asc"
                          ? "desc"
                          : "asc",
                    }))
                  }
                >
                  Name
                  {sortConfig.key === "name"
                    ? sortConfig.direction === "asc"
                      ? " ▲"
                      : " ▼"
                    : ""}
                </TableHead>
                <TableHead 
                  className="bg-primary text-white font-bold cursor-pointer"
                  onClick={() =>
                    setSortConfig((prev) => ({
                      key: "nuvama_code",
                      direction:
                        prev.key === "nuvama_code" && prev.direction === "asc"
                          ? "desc"
                          : "asc",
                    }))
                  }
                >
                  Code
                  {sortConfig.key === "nuvama_code"
                    ? sortConfig.direction === "asc"
                      ? " ▲"
                      : " ▼"
                    : ""}
                </TableHead>
                <TableHead 
                  className="bg-primary text-white font-bold cursor-pointer"
                  onClick={() =>
                    setSortConfig((prev) => ({
                      key: "account",
                      direction:
                        prev.key === "account" && prev.direction === "asc"
                          ? "desc"
                          : "asc",
                    }))
                  }
                >
                  Account
                  {sortConfig.key === "account"
                    ? sortConfig.direction === "asc"
                      ? " ▲"
                      : " ▼"
                    : ""}
                </TableHead>
                <TableHead 
                  className="bg-primary text-white font-bold cursor-pointer"
                  onClick={() =>
                    setSortConfig((prev) => ({
                      key: "portfolio_value",
                      direction:
                        prev.key === "portfolio_value" && prev.direction === "asc"
                          ? "desc"
                          : "asc",
                    }))
                  }
                >
                  Portfolio Value
                  {sortConfig.key === "portfolio_value"
                    ? sortConfig.direction === "asc"
                      ? " ▲"
                      : " ▼"
                    : ""}
                </TableHead>
                <TableHead 
                  className="bg-primary text-white font-bold cursor-pointer"
                  onClick={() =>
                    setSortConfig((prev) => ({
                      key: "cash",
                      direction:
                        prev.key === "cash" && prev.direction === "asc"
                          ? "desc"
                          : "asc",
                    }))
                  }
                >
                  Cash
                  {sortConfig.key === "cash"
                    ? sortConfig.direction === "asc"
                      ? " ▲"
                      : " ▼"
                    : ""}
                </TableHead>
                <TableHead 
                  className="bg-primary text-white font-bold cursor-pointer"
                  onClick={() =>
                    setSortConfig((prev) => ({
                      key: "cash_percentage",
                      direction:
                        prev.key === "cash_percentage" && prev.direction === "asc"
                          ? "desc"
                          : "asc",
                    }))
                  }
                >
                  Cash %
                  {sortConfig.key === "cash_percentage"
                    ? sortConfig.direction === "asc"
                      ? " ▲"
                      : " ▼"
                    : ""}
                </TableHead>
                <TableHead 
                  className="bg-primary text-white font-bold cursor-pointer"
                  onClick={() =>
                    setSortConfig((prev) => ({
                      key: "derivatives_percentage",
                      direction:
                        prev.key === "derivatives_percentage" && prev.direction === "asc"
                          ? "desc"
                          : "asc",
                    }))
                  }
                >
                  Derivatives %
                  {sortConfig.key === "derivatives_percentage"
                    ? sortConfig.direction === "asc"
                      ? " ▲"
                      : " ▼"
                    : ""}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPortfolio.length > 0 ? (
                sortedPortfolio.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.nuvama_code}</TableCell>
                    <TableCell>{item.account}</TableCell>
                    <TableCell>{formatNumber(item.portfolio_value)}</TableCell>
                    <TableCell>{formatNumber(item.cash)}</TableCell>
                    <TableCell>{formatNumber(item.cash_percentage, "%")}</TableCell>
                    <TableCell >{formatNumber(item.derivatives_percentage, "%")}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    No portfolio entries found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Returns Table */}
      {activeView === "returns" && (
        <div>
          <Input
            placeholder="Search returns..."
            value={returnsSearch}
            onChange={(e) => setReturnsSearch(e.target.value)}
            className="max-w-sm mb-4 bg-background rounded-lg"
          />

          <Table className="bg-background rounded-lg">
            <TableHeader className="bg-primary rounded-lg text-white font-bold">
              <TableRow >
                <TableHead 
                  className="bg-primary text-white font-bold cursor-pointer"
                  onClick={() =>
                    setSortConfig((prev) => ({
                      key: "name",
                      direction:
                        prev.key === "name" && prev.direction === "asc"
                          ? "desc"
                          : "asc",
                    }))
                  }
                >
                  Name
                  {sortConfig.key === "name"
                    ? sortConfig.direction === "asc"
                      ? " ▲"
                      : " ▼"
                    : ""}
                </TableHead>
                <TableHead 
                  className="bg-primary text-white font-bold cursor-pointer"
                  onClick={() =>
                    setSortConfig((prev) => ({
                      key: "nuvama_code",
                      direction:
                        prev.key === "nuvama_code" && prev.direction === "asc"
                          ? "desc"
                          : "asc",
                    }))
                  }
                >
                  Code
                  {sortConfig.key === "nuvama_code"
                    ? sortConfig.direction === "asc"
                      ? " ▲"
                      : " ▼"
                    : ""}
                </TableHead>
                <TableHead 
                  className="bg-primary text-white font-bold cursor-pointer"
                  onClick={() =>
                    setSortConfig((prev) => ({
                      key: "account",
                      direction:
                        prev.key === "account" && prev.direction === "asc"
                          ? "desc"
                          : "asc",
                    }))
                  }
                >
                  Account
                  {sortConfig.key === "account"
                    ? sortConfig.direction === "asc"
                      ? " ▲"
                      : " ▼"
                    : ""}
                </TableHead>
                <TableHead 
                  className="bg-primary text-white font-bold cursor-pointer"
                  onClick={() =>
                    setSortConfig((prev) => ({
                      key: "inception_date",
                      direction:
                        prev.key === "inception_date" && prev.direction === "asc"
                          ? "desc"
                          : "asc",
                    }))
                  }
                >
                  Inception Date
                  {sortConfig.key === "inception_date"
                    ? sortConfig.direction === "asc"
                      ? " ▲"
                      : " ▼"
                    : ""}
                </TableHead>
                <TableHead 
                  className="bg-primary text-white font-bold cursor-pointer"
                  onClick={() =>
                    setSortConfig((prev) => ({
                      key: "d10",
                      direction:
                        prev.key === "d10" && prev.direction === "asc"
                          ? "desc"
                          : "asc",
                    }))
                  }
                >
                  10D
                  {sortConfig.key === "d10"
                    ? sortConfig.direction === "asc"
                      ? " ▲"
                      : " ▼"
                    : ""}
                </TableHead>
                <TableHead 
                  className="bg-primary text-white font-bold cursor-pointer"
                  onClick={() =>
                    setSortConfig((prev) => ({
                      key: "m1",
                      direction:
                        prev.key === "m1" && prev.direction === "asc"
                          ? "desc"
                          : "asc",
                    }))
                  }
                >
                  1M
                  {sortConfig.key === "m1"
                    ? sortConfig.direction === "asc"
                      ? " ▲"
                      : " ▼"
                    : ""}
                </TableHead>
                <TableHead 
                  className="bg-primary text-white font-bold cursor-pointer"
                  onClick={() =>
                    setSortConfig((prev) => ({
                      key: "m3",
                      direction:
                        prev.key === "m3" && prev.direction === "asc"
                          ? "desc"
                          : "asc",
                    }))
                  }
                >
                  3M
                  {sortConfig.key === "m3"
                    ? sortConfig.direction === "asc"
                      ? " ▲"
                      : " ▼"
                    : ""}
                </TableHead>
                <TableHead 
                  className="bg-primary text-white font-bold cursor-pointer"
                  onClick={() =>
                    setSortConfig((prev) => ({
                      key: "m6",
                      direction:
                        prev.key === "m6" && prev.direction === "asc"
                          ? "desc"
                          : "asc",
                    }))
                  }
                >
                  6M
                  {sortConfig.key === "m6"
                    ? sortConfig.direction === "asc"
                      ? " ▲"
                      : " ▼"
                    : ""}
                </TableHead>
                <TableHead 
                  className="bg-primary text-white font-bold cursor-pointer"
                  onClick={() =>
                    setSortConfig((prev) => ({
                      key: "y1",
                      direction:
                        prev.key === "y1" && prev.direction === "asc"
                          ? "desc"
                          : "asc",
                    }))
                  }
                >
                  1Y
                  {sortConfig.key === "y1"
                    ? sortConfig.direction === "asc"
                      ? " ▲"
                      : " ▼"
                    : ""}
                </TableHead>
                <TableHead 
                  className="bg-primary text-white font-bold cursor-pointer"
                  onClick={() =>
                    setSortConfig((prev) => ({
                      key: "y2",
                      direction:
                        prev.key === "y2" && prev.direction === "asc"
                          ? "desc"
                          : "asc",
                    }))
                  }
                >
                  2Y
                  {sortConfig.key === "y2"
                    ? sortConfig.direction === "asc"
                      ? " ▲"
                      : " ▼"
                    : ""}
                </TableHead>
                <TableHead 
                  className="bg-primary text-white font-bold cursor-pointer"
                  onClick={() =>
                    setSortConfig((prev) => ({
                      key: "y5",
                      direction:
                        prev.key === "y5" && prev.direction === "asc"
                          ? "desc"
                          : "asc",
                    }))
                  }
                >
                  5Y
                  {sortConfig.key === "y5"
                    ? sortConfig.direction === "asc"
                      ? " ▲"
                      : " ▼"
                    : ""}
                </TableHead>
                <TableHead 
                  className="bg-primary text-white font-bold cursor-pointer"
                  onClick={() =>
                    setSortConfig((prev) => ({
                      key: "since_inception",
                      direction:
                        prev.key === "since_inception" && prev.direction === "asc"
                          ? "desc"
                          : "asc",
                    }))
                  }
                >
                  Since Inception
                  {sortConfig.key === "since_inception"
                    ? sortConfig.direction === "asc"
                      ? " ▲"
                      : " ▼"
                    : ""}
                </TableHead>
                <TableHead 
                  className="bg-primary text-white font-bold cursor-pointer"
                  onClick={() =>
                    setSortConfig((prev) => ({
                      key: "nifty_since_inception",
                      direction:
                        prev.key === "nifty_since_inception" && prev.direction === "asc"
                          ? "desc"
                          : "asc",
                    }))
                  }
                >
                  Nifty Since Inception
                  {sortConfig.key === "nifty_since_inception"
                    ? sortConfig.direction === "asc"
                      ? " ▲"
                      : " ▼"
                    : ""}
                </TableHead>
                <TableHead 
                  className="bg-primary text-white font-bold cursor-pointer"
                  onClick={() =>
                    setSortConfig((prev) => ({
                      key: "mdd",
                      direction:
                        prev.key === "mdd" && prev.direction === "asc"
                          ? "desc"
                          : "asc",
                    }))
                  }
                >
                  MDD
                  {sortConfig.key === "mdd"
                    ? sortConfig.direction === "asc"
                      ? " ▲"
                      : " ▼"
                    : ""}
                </TableHead>
                <TableHead 
                  className="bg-primary text-white font-bold cursor-pointer"
                  onClick={() =>
                    setSortConfig((prev) => ({
                      key: "current_drawdown",
                      direction:
                        prev.key === "current_drawdown" && prev.direction === "asc"
                          ? "desc"
                          : "asc",
                    }))
                  }
                >
                  Current DD
                  {sortConfig.key === "current_drawdown"
                    ? sortConfig.direction === "asc"
                      ? " ▲"
                      : " ▼"
                    : ""}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedReturns.length > 0 ? (
                sortedReturns.filter(item => formatNumber(item.d10) !== "-").map((item, i) => (
                  <TableRow key={i}>
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
                  <TableCell colSpan={13} className="text-center">
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