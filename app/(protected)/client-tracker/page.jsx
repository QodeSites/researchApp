"use client";
import React, { useState, useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";

const convertToNumber = (value) => {
  if (value === null || value === undefined || value === "NaN") return null;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
};
const formatNumber = (value, suffix = "") => {
  if (
    value === null ||
    value === undefined ||
    value === "NaN" ||
    value === "nan" ||
    value === "NA" ||
    String(value).toLowerCase() === "na" ||
    isNaN(Number(value))
  ) {
    return "-";
  }
  const num = Number(value);
  return num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: false,
  }) + suffix;
};

const generateMultiIndexCsv = (navData, indices) => {
  const allDates = new Set();
  indices.forEach((index) => {
    (navData[index] || []).forEach((entry) => allDates.add(entry.date));
  });
  const sortedDates = Array.from(allDates).sort();
  const headers = ["Date", ...indices.map((index) => `${index}_NAV`)];
  const rows = sortedDates.map((date) => {
    const row = [date];
    indices.forEach((index) => {
      const entry = (navData[index] || []).find((e) => e.date === date);
      row.push(entry ? entry.nav : "");
    });
    return row.join(",");
  });
  const csvContent = [headers.join(","), ...rows].join("\n");
  const filename =`selected_indices_nav_all.csv`;
  return { csvContent, filename };
};

const downloadCsv = (csvContent, filename) => {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
};

const PYTHON_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://calculator.qodeinvest.com"
    : "http://localhost:5080";

// Standardize column mapping for Trailing Returns to ensure sorting works correctly
const trailingReturnsColumns = [
  { label: "#", key: "idx" },
  { label: "", key: " " },
  { label: "Expand", key: " " },
  { label: "Name", key: "name" },
  { label: "Nuvama Code", key: "nuvama_code" },
  { label: "Account", key: "account" },
  { label: "Inception Date", key: "inception_date" },
  { label: "10D", key: "10d" },
  { label: "1M", key: "1m" },
  { label: "3M", key: "3m" },
  { label: "6M", key: "6m" },
  { label: "1Y", key: "1y" },
  { label: "2Y", key: "2y" },
  { label: "5Y", key: "5y" },
  { label: "Since Inception", key: "since_inception" },
  { label: "Nifty Since Inception", key: "nifty_since_inception" },
  { label: "MDD", key: "mdd" },
  { label: "CDD", key: "current_drawdown" },
];

export default function ClientTracker() {
  const [data, setData] = useState({
    portfolio_tracker: [],
    trailing_returns: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState("portfolio");
  const [selectAccountCode, setSelectedAccountCode] = useState([]);

  const [portfolioSearch, setPortfolioSearch] = useState("");
  const [returnsSearch, setReturnsSearch] = useState("");
  // Default sort to "#" (first column)
  const [sortConfig, setSortConfig] = useState({ key: "#", direction: "asc" });

  // Multi-expandable rows: using a Set for expandedRows
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [breakdowns, setBreakdowns] = useState({});
  const [loadingBreakdown, setLoadingBreakdown] = useState({});

  // --- Fetch Data ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientResponse, trailingResponse] = await Promise.all([
          fetch(`${PYTHON_BASE_URL}/api/clienttracker/portfolio_details`),
          fetch(`${PYTHON_BASE_URL}/api/clienttracker/trailing_returns/false`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}), 
          }),
        ]);

        const clientResult = await clientResponse.json();
        const trailingReturnsResult = await trailingResponse.json();

        const portfolioData = (clientResult.data || []).map((item, idx) => ({
          ...item,
          idx: idx + 1,
        }));
        const returnsData = (trailingReturnsResult || []).map((item, idx) => ({
          ...item,
          idx: idx + 1,
        }));

        setData({
          portfolio_tracker: portfolioData,
          trailing_returns: returnsData,
        });
      } catch (err) {
        setError("Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // --- Updated Breakdown (multi-dropdown support) ---
  const toggleBreakdown = async (accountCode) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(accountCode)) {
        newSet.delete(accountCode);
      } else {
        newSet.add(accountCode);
      }
      return newSet;
    });

    if (!breakdowns[accountCode] && !loadingBreakdown[accountCode]) {
      try {
        setLoadingBreakdown((prev) => ({ ...prev, [accountCode]: true }));
        const res = await fetch(
          `${PYTHON_BASE_URL}/api/clienttracker/returns_breakdown`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: accountCode }),
          }
        );

        
        const json = await res.json();
        setBreakdowns((prev) => ({ ...prev, [accountCode]: json }));
      } catch (err) {
        console.error("Failed to load breakdown:", err);
      } finally {
        setLoadingBreakdown((prev) => ({ ...prev, [accountCode]: false }));
      }
    }
  };

  const downloadSelectedNavData = async () => {
    if (selectAccountCode.length === 0) {
      alert("Please select at least one index");
      return;
    }
    try {
      const payload = { account_code: selectAccountCode };
      const response = await fetch(`${PYTHON_BASE_URL}/api/clienttracker/trailing_returns/true`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (response.ok) {
        const navData = result.data || {};
        console.log(result.data)
        const validIndices = selectAccountCode.filter(
          (index) => navData[index] && navData[index].length > 0
        );
        if (validIndices.length === 0) {
          alert("No NAV data available");
          return;
        }
        const { csvContent, filename } = generateMultiIndexCsv(
          navData,
          validIndices
        );
        downloadCsv(csvContent, filename);
      } else {
        alert(result.message || "Failed to fetch NAV data");
      }
    } catch (error) {
      alert(`Error downloading NAV data: ${error.message}`);
    }
  };

  const toggleIndexSelection = (index) => {
    setSelectedAccountCode((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  // --- Filtering ---
  const filteredPortfolio = useMemo(() => {
    return data.portfolio_tracker.filter(
      (item) =>
        item.name?.toLowerCase().includes(portfolioSearch.toLowerCase()) ||
        item.nuvama_code
          ?.toLowerCase()
          .includes(portfolioSearch.toLowerCase()) ||
        item.account?.toLowerCase().includes(portfolioSearch.toLowerCase())
    );
  }, [data.portfolio_tracker, portfolioSearch]);

  const filteredReturns = useMemo(() => {
    return data.trailing_returns.filter(
      (item) =>
        item.name?.toLowerCase().includes(returnsSearch.toLowerCase()) ||
        item.nuvama_code?.toLowerCase().includes(returnsSearch.toLowerCase()) ||
        item.account?.toLowerCase().includes(returnsSearch.toLowerCase())
    );
  }, [data.trailing_returns, returnsSearch]);

  // --- Sorting helper ---
  // For trailing returns, map display column to data prop key
  function getActualKey(displayKey) {
    // Find by label; if not found, treat as direct key
    const found = trailingReturnsColumns.find(
      (col) => col.label === displayKey || col.key === displayKey
    );
    return found ? found.key : displayKey;
  }

  const getSortedData = (dataArray, forTable = "portfolio") => {
    let key = sortConfig.key;
    let direction = sortConfig.direction;
    // For Trailing Returns, map display key to field key using array above
    if (forTable === "returns") {
      key = getActualKey(key);
    }

    if (!key || key === "#")
      return [...dataArray].sort((a, b) => a.idx - b.idx);

    return [...dataArray].sort((a, b) => {
      let aValue = a[key],
        bValue = b[key];
      if (aValue === "-" || aValue === undefined || aValue === null)
        aValue = null;
      if (bValue === "-" || bValue === undefined || bValue === null)
        bValue = null;
      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return 1;
      if (bValue === null) return -1;
      // Try numerical sort if possible
      if (!isNaN(parseFloat(aValue)) && !isNaN(parseFloat(bValue))) {
        return direction === "asc"
          ? parseFloat(aValue) - parseFloat(bValue)
          : parseFloat(bValue) - parseFloat(aValue);
      }
      // Try string compare
      return direction === "asc"
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });
  };

  const sortedPortfolio = getSortedData(filteredPortfolio, "portfolio");
  const sortedReturns = getSortedData(filteredReturns, "returns");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
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
                    <TableCell>
                      {formatNumber(item.cash_percentage, "%")}
                    </TableCell>
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
          <div className="flex flex-row gap-2">
            <Input
              placeholder="Search returns..."
              value={returnsSearch}
              onChange={(e) => setReturnsSearch(e.target.value)}
              className="max-w-sm mb-4 bg-background rounded-lg"
            />
            <Button onClick={downloadSelectedNavData} disabled={selectAccountCode.length === 0}>
              Download CSV ({selectAccountCode.length})
            </Button>
          </div>

          <Table className="bg-background rounded-lg">
            <TableHeader className="bg-primary text-white font-bold">
              <TableRow className="cursor-pointer text-white font-bold">
                {trailingReturnsColumns.map((col, idx) => (
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
              {sortedReturns.length > 0 ? (
                sortedReturns
                  .filter((item) => formatNumber(item["10d"]) !== "-")
                  .map((item) => (
                    <React.Fragment key={item.idx}>
                      {/* --- Main Row --- */}
                      <TableRow>
                        {/* Expand button in first column */}
                        <TableCell>{item.idx}</TableCell>
                        
                        <TableCell>
                          <Checkbox
                            className="border border-primary focus:ring-2 focus:ring-primary focus:outline-none rounded"
                            checked={selectAccountCode.includes(item.nuvama_code)}
                            onCheckedChange={() => toggleIndexSelection(item.nuvama_code)}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleBreakdown(item.nuvama_code)}
                          >
                            {expandedRows.has(item.nuvama_code) ? "▾" : "▸"}
                          </Button>
                        </TableCell>
                        {/* Remaining columns per correct order */}
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.nuvama_code}</TableCell>
                        <TableCell>{item.account}</TableCell>
                        <TableCell>{item.inception_date}</TableCell>
                        <TableCell>{formatNumber(item["10d"], "%")}</TableCell>
                        <TableCell>{formatNumber(item["1m"], "%")}</TableCell>
                        <TableCell>{formatNumber(item["3m"], "%")}</TableCell>
                        <TableCell>{formatNumber(item["6m"], "%")}</TableCell>
                        <TableCell>{formatNumber(item["1y"], "%")}</TableCell>
                        <TableCell>{formatNumber(item["2y"], "%")}</TableCell>
                        <TableCell>{formatNumber(item["5y"], "%")}</TableCell>
                        <TableCell>
                          {formatNumber(item.since_inception, "%")}
                        </TableCell>
                        <TableCell>
                          {formatNumber(item.nifty_since_inception, "%")}
                        </TableCell>
                        <TableCell>{formatNumber(item.mdd, "%")}</TableCell>
                        <TableCell>
                          {formatNumber(item.current_drawdown, "%")}
                        </TableCell>
                      </TableRow>
                      {/* Expanded breakdown rows */}
                      {expandedRows.has(item.nuvama_code) && (
                        <>
                          {loadingBreakdown[item.nuvama_code] ? (
                            <TableRow>
                              <TableCell
                                colSpan={trailingReturnsColumns.length + 1}
                                className="text-center"
                              >
                                <div className="flex items-center justify-center py-4">
                                  <Loader2 className="h-4 w-4 animate-spin text-primary mr-2" />
                                  Loading breakdown...
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : breakdowns[item.nuvama_code] &&
                            Array.isArray(
                              breakdowns[item.nuvama_code]?.returns
                            ) ? (
                            breakdowns[item.nuvama_code].returns.map(
                              (seg, j) => (
                                <TableRow
                                  key={`${item.nuvama_code}-breakdown-${j}`}
                                  className="bg-muted/30 text-sm"
                                >
                                  {/* Empty cells for alignment: expand, idx, code, account, inception_date */}
                                  <TableCell />
                                  {seg.label !== "Total" ? (
                                      <>
                                        <TableCell>
                                          <Checkbox
                                            className="border border-primary focus:ring-2 focus:ring-primary focus:outline-none rounded"
                                            checked={selectAccountCode.includes(`${item.nuvama_code}-${seg.label}`)}
                                            onCheckedChange={() => toggleIndexSelection(`${item.nuvama_code}-${seg.label}`)}
                                          />
                                        </TableCell>
                                        <TableCell />
                                      </>
                                    ) : (
                                      <>
                                      <TableCell />
                                      <TableCell />
                                      </>
                                  )}
                                  <TableCell className="text-xs text-gray-600 italic">
                                    {seg.label || "-"}
                                  </TableCell>
                                  <TableCell />
                                  <TableCell />
                                  <TableCell />
                                  {/* Performance columns aligned with parent */}
                                  <TableCell className="text-xs text-gray-600 italic">
                                    {seg.trailing &&
                                    seg.trailing["10D"] !== undefined &&
                                    seg.trailing["10D"] !== null
                                      ? formatNumber(seg.trailing["10D"], "%")
                                      : "-"}
                                  </TableCell>
                                  <TableCell className="text-xs text-gray-600 italic">
                                    {seg.trailing &&
                                    seg.trailing["1M"] !== undefined &&
                                    seg.trailing["1M"] !== null
                                      ? formatNumber(seg.trailing["1M"], "%")
                                      : "-"}
                                  </TableCell>
                                  <TableCell className="text-xs text-gray-600 italic">
                                    {seg.trailing &&
                                    seg.trailing["3M"] !== undefined &&
                                    seg.trailing["3M"] !== null
                                      ? formatNumber(seg.trailing["3M"], "%")
                                      : "-"}
                                  </TableCell>
                                  <TableCell className="text-xs text-gray-600 italic">
                                    {seg.trailing &&
                                    seg.trailing["6M"] !== undefined &&
                                    seg.trailing["6M"] !== null
                                      ? formatNumber(seg.trailing["6M"], "%")
                                      : "-"}
                                  </TableCell>
                                  <TableCell className="text-xs text-gray-600 italic">
                                    {seg.trailing &&
                                    seg.trailing["1Y"] !== undefined &&
                                    seg.trailing["1Y"] !== null
                                      ? formatNumber(seg.trailing["1Y"], "%")
                                      : "-"}
                                  </TableCell>
                                  <TableCell className="text-xs text-gray-600 italic">
                                    {seg.trailing &&
                                    seg.trailing["2Y"] !== undefined &&
                                    seg.trailing["2Y"] !== null
                                      ? formatNumber(seg.trailing["2Y"], "%")
                                      : "-"}
                                  </TableCell>
                                  <TableCell className="text-xs text-gray-600 italic">
                                    {seg.trailing &&
                                    seg.trailing["5Y"] !== undefined &&
                                    seg.trailing["5Y"] !== null
                                      ? formatNumber(seg.trailing["5Y"], "%")
                                      : "-"}
                                  </TableCell>
                                  <TableCell className="text-xs text-gray-600 italic">
                                    {seg.metrics &&
                                    seg.metrics.returns !== undefined &&
                                    seg.metrics.returns !== null
                                      ? formatNumber(seg.metrics.returns, "%")
                                      : "-"}
                                  </TableCell>
                                  <TableCell className="text-xs text-gray-600 italic">
                                    {seg.metrics &&
                                    seg.metrics.nifty_cagr !== undefined &&
                                    seg.metrics.nifty_cagr !== null
                                      ? formatNumber(
                                          seg.metrics.nifty_cagr,
                                          "%"
                                        )
                                      : "-"}
                                  </TableCell>
                                  <TableCell className="text-xs text-gray-600 italic">
                                    {seg.metrics &&
                                    seg.metrics.max_drawdown !== undefined &&
                                    seg.metrics.max_drawdown !== null
                                      ? formatNumber(
                                          seg.metrics.max_drawdown,
                                          "%"
                                        )
                                      : "-"}
                                  </TableCell>
                                  <TableCell className="text-xs text-gray-600 italic">
                                    {seg.metrics &&
                                    seg.metrics.current_drawdown !==
                                      undefined &&
                                    seg.metrics.current_drawdown !== null
                                      ? formatNumber(
                                          seg.metrics.current_drawdown,
                                          "%"
                                        )
                                      : "-"}
                                  </TableCell>
                                </TableRow>
                              )
                            )
                          ) : (
                            <TableRow>
                              <TableCell
                                colSpan={trailingReturnsColumns.length + 1}
                                className="text-center"
                              >
                                <div className="py-3 text-sm text-muted-foreground">
                                  No breakdown data available.
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      )}
                    </React.Fragment>
                  ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={trailingReturnsColumns.length + 1}
                    className="text-center"
                  >
                    No returns entries found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
