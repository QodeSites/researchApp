"use client";
import React, { useState, useEffect } from "react";
import formatDate from "@/utils/formatDate";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import allIndicesGroups from "@/utils/allIndicesGroups";

const PYTHON_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://calculator.qodeinvest.com"
    : "http://localhost:5080";

const generateMultiIndexCsv = (navData, indices, startDate, endDate) => {
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
  const filename =
    startDate && endDate
      ? `selected_indices_nav_${startDate}_to_${endDate}.csv`
      : `selected_indices_nav_all.csv`;
  return { csvContent, filename };
};

const downloadCsv = (csvContent, filename) => {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
};

export default function IndicesComparisonPage() {
  const [indicesData, setIndicesData] = useState(null);
  const [combinedIndices, setCombinedIndices] = useState([]);
  const [dataAsOf, setDataAsOf] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("All");
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // --- NEW: Breakdown States ---
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [breakdowns, setBreakdowns] = useState({});
  const [loadingBreakdown, setLoadingBreakdown] = useState({});

  // New state: Loading for download
  const [downloading, setDownloading] = useState(false);

  const shortTermCols = [
    "1D",
    "2D",
    "3D",
    "1W",
    "1M",
    "3M",
    "6M",
    "9M",
    "1Y",
    "Drawdown",
  ];
  const longTermCols = ["1Y", "2Y", "3Y", "4Y", "5Y", "CDR", "CDR_MDD"];

  // --- Nested expands: for options row ---
  const [optionsExpandedRows, setOptionsExpandedRows] = useState({});

  // Keep track of which options row dropdowns are open
  const toggleOptionsExpand = (nuvamaCode) => {
    setOptionsExpandedRows((prev) => ({
      ...prev,
      [nuvamaCode]: !prev[nuvamaCode],
    }));
  };

  // --- Fetch Data ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const payload = {};
      if (startDate && endDate) {
        payload.startDate = startDate;
        payload.endDate = endDate;
      }

      const response = await fetch(
        `${PYTHON_BASE_URL}/api/clienttracker/indices/false`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (response.ok) {
        setIndicesData(result.data);
        setDataAsOf(result.dataAsOf || new Date().toISOString());

        const allIndices = Object.values(allIndicesGroups).flat();
        const combined = allIndices.map((index, idx) => {
          const category =
            Object.keys(allIndicesGroups).find((key) =>
              allIndicesGroups[key].includes(index)
            ) || "Unknown";
          return {
            idx: idx + 1,
            index,
            category,
            ...(result.data?.[index] || {}),
          };
        });

        setCombinedIndices(combined);
      } else {
        setError(result.message || "Failed to fetch data");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- Breakdown Fetch ---
  const toggleBreakdown = async (indexName) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(indexName)) newSet.delete(indexName);
      else newSet.add(indexName);
      return newSet;
    });

    if (!breakdowns[indexName] && !loadingBreakdown[indexName]) {
      try {
        setLoadingBreakdown((prev) => ({ ...prev, [indexName]: true }));
        const payload = { code: indexName };
        if (startDate && endDate) {
          payload.startDate = startDate;
          payload.endDate = endDate;
        }
        const res = await fetch(
          `${PYTHON_BASE_URL}/api/clienttracker/returns_breakdown`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );
        const json = await res.json();
        setBreakdowns((prev) => ({ ...prev, [indexName]: json }));
      } catch (err) {
        console.error("Failed to load breakdown:", err);
      } finally {
        setLoadingBreakdown((prev) => ({ ...prev, [indexName]: false }));
      }
    }
  };

  // Fix: Remove debug
  // console.log(breakdowns)

  const resetTable = () => {
    setSearchTerm("");
    setSelectedGroup("All");
    setSelectedIndices([]);
    setStartDate("");
    setEndDate("");
    setSortConfig({ key: null, direction: "asc" });
    fetchData();
  };

  // Download: show loader state
  const downloadSelectedNavData = async () => {
    if (selectedIndices.length === 0) {
      alert("Please select at least one index");
      return;
    }
    setDownloading(true);
    try {
      const payload = { indices: selectedIndices };
      if (startDate && endDate) {
        payload.startDate = startDate;
        payload.endDate = endDate;
      }
      const response = await fetch(
        `${PYTHON_BASE_URL}/api/clienttracker/indices/true`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();
      if (response.ok) {
        const navData = result.data || {};
        const validIndices = selectedIndices.filter(
          (index) => navData[index] && navData[index].length > 0
        );
        if (validIndices.length === 0) {
          alert("No NAV data available");
          return;
        }
        const { csvContent, filename } = generateMultiIndexCsv(
          navData,
          validIndices,
          startDate,
          endDate
        );
        downloadCsv(csvContent, filename);
      } else {
        alert(result.message || "Failed to fetch NAV data");
      }
    } catch (error) {
      alert(`Error downloading NAV data: ${error.message}`);
    } finally {
      setDownloading(false);
    }
  };

  const toggleIndexSelection = (index) => {
    setSelectedIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  // Fixed getSortedIndices: correctly handles ASC and DESC for all types and col keys
  const getSortedIndices = (indices) => {
    const { key, direction } = sortConfig;
    if (!key || key === "#" || key == null) {
      // Always ascending idx for default
      return [...indices].sort((a, b) =>
        direction === "desc" ? b.idx - a.idx : a.idx - b.idx
      );
    }
    return [...indices].sort((a, b) => {
      let aValue = a[key],
        bValue = b[key];
      if (aValue === "-" || aValue === undefined || aValue === null)
        aValue = null;
      if (bValue === "-" || bValue === undefined || bValue === null)
        bValue = null;
      // Try to compare as numbers if both parse to numbers and are not NaN/null
      const aNum = parseFloat(aValue);
      const bNum = parseFloat(bValue);
      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return direction === "asc" ? 1 : -1;
      if (bValue === null) return direction === "asc" ? -1 : 1;
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return direction === "asc" ? aNum - bNum : bNum - aNum;
      }
      // Compare as string (case-insensitive)
      if (typeof aValue === "string" && typeof bValue === "string") {
        return direction === "asc"
          ? aValue.localeCompare(bValue, undefined, { sensitivity: "base" })
          : bValue.localeCompare(aValue, undefined, { sensitivity: "base" });
      }
      // Mixed, fallback to string comparison
      return direction === "asc"
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });
  };

  // --- Select all/none support for header checkbox ---
  // Includes only filtered shown main index rows (not breakdowns!)
  const sortedFilteredIndices = (() => {
    // filtered indices, after search/filter etc -- used for select all logic
    const filteredIndices = combinedIndices.filter(
      (item) =>
        (selectedGroup === "All" || item.category === selectedGroup) &&
        item.index.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return getSortedIndices(filteredIndices);
  })();
  // Main indices to render in the table (for select all, header etc)
  const filteredIndices = combinedIndices.filter(
    (item) =>
      (selectedGroup === "All" || item.category === selectedGroup) &&
      item.index.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sorted = getSortedIndices(filteredIndices);

  // Support for selecting all visible indices (not breakdowns)
  const allVisibleSelected =
    sorted.length > 0 &&
    sorted.every((item) => selectedIndices.includes(item.index));
  const someVisibleSelected =
    sorted.some((item) => selectedIndices.includes(item.index)) &&
    !allVisibleSelected;

  // Select all handler (for visible/filtered indices)
  const handleSelectAllVisible = (checked) => {
    if (checked) {
      // Add all main visible indices if not already present
      const newSelected = [
        ...selectedIndices,
        ...sorted
          .map((item) => item.index)
          .filter((id) => !selectedIndices.includes(id)),
      ];
      setSelectedIndices([...new Set(newSelected)]);
    } else {
      // Remove all visible indices from selection (keep other already custom breakdowns selected)
      setSelectedIndices(
        selectedIndices.filter(
          (id) => !sorted.some((item) => item.index === id)
        )
      );
    }
  };

  // --- Table Renderer ---
  const renderTable = (columns) => (
    <Table className="border bg-background rounded-lg">
      <TableHeader className="bg-primary text-white font-bold">
        <TableRow className="bg-primary text-white font-bold">
          <TableHead
            className="bg-primary text-white font-bold cursor-pointer select-none"
            onClick={() => {
              setSortConfig((prev) => {
                const isSame = prev.key === "#" || prev.key == null;
                return {
                  key: "#",
                  direction:
                    isSame && prev.direction === "asc" ? "desc" : "asc",
                };
              });
            }}
          >
            #
            {sortConfig.key === "#" || !sortConfig.key
              ? sortConfig.direction === "asc"
                ? " ▲"
                : " ▼"
              : ""}
          </TableHead>

          {/* Header Checkbox with select all functionality */}
          <TableHead className="bg-primary text-white font-bold">
            <Checkbox
              aria-label="Select All"
              className="border-1 border-white focus:ring-1 focus:ring-white rounded"
              checked={allVisibleSelected}
              indeterminate={someVisibleSelected}
              onCheckedChange={handleSelectAllVisible}
            />
          </TableHead>

          <TableHead className="bg-primary text-white font-bold">
            Expand
          </TableHead>
          <TableHead
            className="bg-primary text-white font-bold cursor-pointer select-none"
            onClick={() => {
              setSortConfig((prev) => {
                const isSame = prev.key === "index";
                return {
                  key: "index",
                  direction:
                    isSame && prev.direction === "asc" ? "desc" : "asc",
                };
              });
            }}
          >
            Index
            {sortConfig.key === "index"
              ? sortConfig.direction === "asc"
                ? " ▲"
                : " ▼"
              : ""}
          </TableHead>
          <TableHead
            className="bg-primary text-white font-bold cursor-pointer select-none"
            onClick={() => {
              setSortConfig((prev) => {
                const isSame = prev.key === "category";
                return {
                  key: "category",
                  direction:
                    isSame && prev.direction === "asc" ? "desc" : "asc",
                };
              });
            }}
          >
            Category
            {sortConfig.key === "category"
              ? sortConfig.direction === "asc"
                ? " ▲"
                : " ▼"
              : ""}
          </TableHead>
          {columns.map((col) => (
            <TableHead
              className="bg-primary text-white font-bold cursor-pointer select-none"
              key={col}
              onClick={() => {
                setSortConfig((prev) => {
                  // Toggle direction if clicking same col, otherwise asc
                  const isSame = prev.key === col;
                  return {
                    key: col,
                    direction:
                      isSame && prev.direction === "asc" ? "desc" : "asc",
                  };
                });
              }}
            >
              {col}
              {sortConfig.key === col
                ? sortConfig.direction === "asc"
                  ? " ▲"
                  : " ▼"
                : ""}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>

      <TableBody>
        {sorted.map((item) => (
          <>
            {/* Main row */}
            <TableRow key={item.index}>
              <TableCell>{item.idx}</TableCell>
              <TableCell>
                <Checkbox
                  className="border border-primary focus:ring-2 focus:ring-primary focus:outline-none rounded"
                  checked={selectedIndices.includes(item.index)}
                  onCheckedChange={() => toggleIndexSelection(item.index)}
                />
              </TableCell>
              <TableCell>
                {allIndicesGroups["Qode Strategies"].includes(item.index) &&
                  item.index !== "QGF-LIVE" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleBreakdown(item.index)}
                    >
                      {expandedRows.has(item.index) ? "▾" : "▸"}
                    </Button>
                  )}
              </TableCell>
              <TableCell>{item.index}</TableCell>
              <TableCell>{item.category}</TableCell>
              {columns.map((col) => (
                <TableCell
                  key={col}
                  className={
                    item[col] && parseFloat(item[col]) < 0 ? "text-red-500" : ""
                  }
                >
                  {item[col] !== undefined &&
                  item[col] !== null &&
                  item[col] !== ""
                    ? `${
                        !isNaN(Number(item[col]))
                          ? Number(item[col]).toFixed(2)
                          : item[col]
                      }%`
                    : "-"}
                </TableCell>
              ))}
            </TableRow>

            {/* Breakdown rows */}
            {expandedRows.has(item.index) && (
              <>
                {loadingBreakdown[item.index] ? (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length + 5}
                      className="text-center py-2"
                    >
                      <Loader2 className="h-4 w-4 animate-spin text-primary inline mr-2" />
                      Loading breakdown...
                    </TableCell>
                  </TableRow>
                ) : breakdowns[item.index] &&
                  Array.isArray(breakdowns[item.index].returns) ? (
                  breakdowns[item.index].returns.map((seg, j) => {
                    if (seg.label === "Options") {
                      // Gather both "Dynamic Puts" and "Long Options" segments
                      const subSegments = breakdowns[item.index].returns.filter(
                        (s) =>
                          s.label === "Dynamic Puts" ||
                          s.label === "Long Options"
                      );
                      return (
                        <React.Fragment
                          key={`${item.index}-segment-options-dropdown`}
                        >
                          <TableRow>
                            <TableCell />
                            <TableCell>
                              <Checkbox
                                className="border border-primary focus:ring-2 focus:ring-primary focus:outline-none rounded"
                                checked={selectedIndices.includes(
                                  `${item.index}-${seg.label}`
                                )}
                                onCheckedChange={() =>
                                  toggleIndexSelection(
                                    `${item.index}-${seg.label}`
                                  )
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <div className="grid justify-items-center">
                                <Button
                                  variant="ghost"
                                  size="xs"
                                  className="px-[2px]"
                                  onClick={() =>
                                    toggleOptionsExpand(`${item.index}-options`)
                                  }
                                >
                                  {optionsExpandedRows[`${item.index}-options`]
                                    ? "▾"
                                    : "▸"}
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-gray-600 italic">
                              Options
                            </TableCell>
                            <TableCell></TableCell>
                            {columns.map((col) => (
                              <TableCell
                                key={col}
                                className="text-xs text-gray-600 italic"
                              >
                                {seg.trailing &&
                                seg.trailing[col] !== undefined &&
                                seg.trailing[col] !== null
                                  ? `${seg.trailing[col]}%`
                                  : seg.metrics &&
                                    seg.metrics[col] !== undefined &&
                                    seg.metrics[col] !== null
                                  ? `${seg.metrics[col]}%`
                                  : "-"}
                              </TableCell>
                            ))}
                          </TableRow>
                          {optionsExpandedRows[`${item.index}-options`] &&
                            subSegments.map((subSeg, k) => (
                              <TableRow
                                key={`${item.index}-options-subrow-${k}`}
                                className="bg-muted/40 text-xs"
                              >
                                <TableCell />
                                <TableCell>
                                  <Checkbox
                                    className="border border-primary focus:ring-2 focus:ring-primary focus:outline-none rounded"
                                    checked={selectedIndices.includes(
                                      `${item.index}-${subSeg.label}`
                                    )}
                                    onCheckedChange={() =>
                                      toggleIndexSelection(
                                        `${item.index}-${subSeg.label}`
                                      )
                                    }
                                  />
                                </TableCell>
                                <TableCell />
                                <TableCell
                                  className={`text-xs text-gray-600 italic pl-6`}
                                >
                                  {subSeg.label}
                                </TableCell>
                                <TableCell></TableCell>
                                {columns.map((col) => (
                                  <TableCell
                                    className="text-xs text-gray-600 italic"
                                    key={col}
                                  >
                                    {subSeg.trailing &&
                                    subSeg.trailing[col] !== undefined &&
                                    subSeg.trailing[col] !== null
                                      ? `${subSeg.trailing[col]}%`
                                      : subSeg.metrics &&
                                        subSeg.metrics[col] !== undefined &&
                                        subSeg.metrics[col] !== null
                                      ? `${subSeg.metrics[col]}%`
                                      : "-"}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                        </React.Fragment>
                      );
                    }

                    if (seg.label === "Long Options" || seg.label === "Dynamic Puts") {
                      // These rows will be handled in the nested dropdown of Options, so skip them here
                      return null;
                    }

                    // Render other breakdown segments as before
                    return (
                      <TableRow
                        key={`${item.index}-segment-${j}`}
                        className={`text-sm ${seg.label === "Dynamic Puts" || seg.label === "Long Options" ? "bg-muted/60" : "bg-grey/60"}`}
                        >
                        <TableCell />
                        {seg.label !== "Total" ? (
                          <>
                            <TableCell>
                              <Checkbox
                                className="border border-primary focus:ring-2 focus:ring-primary focus:outline-none rounded"
                                checked={selectedIndices.includes(
                                  `${item.index}-${seg.label}`
                                )}
                                onCheckedChange={() =>
                                  toggleIndexSelection(
                                    `${item.index}-${seg.label}`
                                  )
                                }
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

                        <TableCell
                          className={`text-xs text-gray-600 italic${
                            seg.label === "Dynamic Puts" ||
                            seg.label === "Long Options"
                              ? " pl-6"
                              : ""
                          }`}
                        >
                          {seg.label || "-"}
                        </TableCell>
                        <TableCell></TableCell>
                        {columns.map((col) => (
                          <TableCell
                            className="text-xs text-gray-600 italic"
                            key={col}
                          >
                            {seg.trailing &&
                            seg.trailing[col] !== undefined &&
                            seg.trailing[col] !== null
                              ? `${seg.trailing[col]}%`
                              : seg.metrics &&
                                seg.metrics[col] !== undefined &&
                                seg.metrics[col] !== null
                              ? `${seg.metrics[col]}%`
                              : "-"}
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length + 5}
                      className="text-center text-sm"
                    >
                      No breakdown data available.
                    </TableCell>
                  </TableRow>
                )}
              </>
            )}
          </>
        ))}
      </TableBody>
    </Table>
  );

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  if (error) return <Alert variant="destructive">{error}</Alert>;

  return (
    <div className="p-6 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Indices Returns</h1>
      {dataAsOf && (
        <p className="text-sm text-gray-500 mb-4">
          Data as of: {formatDate(dataAsOf)}
        </p>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 mb-4">
        <Input
          placeholder="Search Index"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs bg-background border-1"
        />
        <Select value={selectedGroup} onValueChange={setSelectedGroup}>
          <SelectTrigger className="w-[200px] bg-background border-1">
            <SelectValue placeholder="Filter Group" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Groups</SelectItem>
            {Object.keys(allIndicesGroups).map((g) => (
              <SelectItem key={g} value={g}>
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date Range */}
        <div className="flex gap-2 items-center">
          <div>
            <Label className="text-sm">Start Date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="max-w-xs bg-background border-1"
            />
          </div>
          <div>
            <Label className="text-sm">End Date</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="max-w-xs bg-background border-1"
            />
          </div>
        </div>

        <Button onClick={fetchData} disabled={!startDate || !endDate}>
          Calculate Custom Returns
        </Button>
        <Button
          onClick={downloadSelectedNavData}
          disabled={selectedIndices.length === 0 || downloading}
          className="flex items-center gap-1"
        >
          {downloading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Download CSV ({selectedIndices.length})
        </Button>
        <Button variant="outline" onClick={resetTable}>
          Reset Table
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="short" className="w-full">
        <TabsList>
          <TabsTrigger value="short">Short Term</TabsTrigger>
          <TabsTrigger value="long">Long Term</TabsTrigger>
        </TabsList>
        <TabsContent value="short">{renderTable(shortTermCols)}</TabsContent>
        <TabsContent value="long">{renderTable(longTermCols)}</TabsContent>
      </Tabs>
    </div>
  );
}
