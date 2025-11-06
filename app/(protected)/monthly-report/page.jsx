"use client";
import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import formatDate from "@/utils/formatDate";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import allIndicesGroups from "@/utils/allIndicesGroups";

// Loader2 and Checkbox and any other missing component import
import { Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const PYTHON_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://calculator.qodeinvest.com"
    : "http://localhost:5080";

// --- Main ---
export default function MonthlyReport() {
  const [indicesData, setIndicesData] = useState(null);
  const [csvData, setCsvData] = useState(null);
  const [calculationDates, setCalculationDates] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [fileName, setFileName] = useState("");
  const [parsedCsv, setParsedCsv] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState("");

  const [selectedYear, setSelectedYear] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");

  const [tableSearchTerm, setTableSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  const [combinedData, setCombinedData] = useState([]); // fixed order data for indices
  const [mutualFundData, setMutualFundData] = useState([]); // for mutual funds
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [breakdowns, setBreakdowns] = useState({});
  const [loadingBreakdown, setLoadingBreakdown] = useState({});

  // Used but not defined in the original: 
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [optionsExpandedRows, setOptionsExpandedRows] = useState({});
  // For breakdowns table columns:
  const columns = [
    "1M",
    "3M",
    "6M",
    "1Y",
    "2Y",
    "3Y",
    "4Y",
    "5Y",
    "Since Inception",
  ];

  const returnPeriods = columns;

  // --- Default Year/Month ---
  useEffect(() => {
    if (!selectedYear && !selectedMonth) {
      const currentDate = new Date();
      setSelectedYear(currentDate.getFullYear().toString());
      setSelectedMonth((currentDate.getMonth() + 1).toString());
    }
  }, [selectedYear, selectedMonth]);

  // --- Fetch when year/month changes ---
  useEffect(() => {
    if (selectedYear && selectedMonth) fetchData();
    // eslint-disable-next-line
  }, [selectedYear, selectedMonth]);

  // --- Fetch Data ---
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setExpandedRows(new Set())
    setBreakdowns({})
    try {
      const response = await fetch(
        `${PYTHON_BASE_URL}/api/clienttracker/monthly-returns/year/${selectedYear}/month/${selectedMonth}`
      );
      const result = await response.json();

      // fetch mutual funds returns from python backend
      const mutual_fund_response = await fetch(
        `${PYTHON_BASE_URL}/api/clienttracker/mutual_funds_returns/year/${selectedYear}/month/${selectedMonth}`
      );
      const mutual_fund_result = await mutual_fund_response.json();

      if (response.ok && mutual_fund_response.ok) {
        setIndicesData(result.indices);
        setCsvData(result.csvData);
        setCalculationDates(result.calculationDates);

        // Assign idx globally once for indices
        const allIndices = Object.values(allIndicesGroups).flat();
        const combined = [];
        allIndices.forEach((index, idx) => {
          const group =
            Object.keys(allIndicesGroups).find((g) =>
              allIndicesGroups[g].includes(index)
            ) || "Other";
          const data = result.indices?.[index];
          if (data) {
            const merged = {
              idx: idx + 1,
              index,
              group,
              ...(data.returns || data),
            };
            combined.push(merged);
          }
        });
        setCombinedData(combined);

        let mfDataRaw = [];
        if (
          Array.isArray(mutual_fund_result) ||
          Array.isArray(mutual_fund_result?.mutual_funds)
        ) {
          mfDataRaw = Array.isArray(mutual_fund_result)
            ? mutual_fund_result
            : mutual_fund_result.mutual_funds;
        } else if (
          mutual_fund_result &&
          typeof mutual_fund_result === "object"
        ) {
          mfDataRaw = Object.keys(mutual_fund_result).map((k) => ({
            name: k,
            ...mutual_fund_result[k],
          }));
        }

        // Map return periods to API keys and table headers dynamically
        const periodMap = [
          { period: "1M", key: "ret_1m" },
          { period: "3M", key: "ret_3m" },
          { period: "6M", key: "ret_6m" },
          { period: "1Y", key: "ret_1y" },
          { period: "2Y", key: "ret_2y" },
          { period: "3Y", key: "ret_3y" },
          { period: "4Y", key: "ret_4y" },
          { period: "5Y", key: "ret_5y" },
          { period: "Since Inception", key: "ret_since_inception" },
        ];

        const mutualFundDataProcessed = mfDataRaw.map((mf, idx) => {
          // Pick the name field (try common options)
          const name =
            mf.category_name ||
            mf.MutualFund ||
            mf.mutual_fund ||
            mf.scheme_name ||
            "-";
          // Map only expected periods with fallback/dash if missing.
          const mapped = periodMap.reduce((acc, pm) => {
            acc[pm.period] =
              mf[pm.key] !== undefined && mf[pm.key] !== null
                ? mf[pm.key]
                : "N/A";
            return acc;
          }, {});
          return {
            idx: idx + 1,
            name,
            ...mapped,
          };
        });

        setMutualFundData(mutualFundDataProcessed);
      } else {
        setError(
          result.error || mutual_fund_result?.error || "Failed to fetch data"
        );
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Row expansion and breakdown fetching ---
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
        if (selectedYear && selectedMonth) {
          const yearNum = Number(selectedYear);
          const monthNum = Number(selectedMonth);
          const lastDay = new Date(yearNum, monthNum, 0);
          const pad = (v) => v.toString().padStart(2, "0");
          payload.endDate = `${lastDay.getFullYear()}-${pad(lastDay.getMonth() + 1)}-${pad(lastDay.getDate())}`;
        }
        const res = await fetch(
          `${PYTHON_BASE_URL}/api/clienttracker/returns_breakdown/true`,
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

  // Muted: Not used in visible portion, but add for correctness:
  const toggleIndexSelection = (index) => {
    setSelectedIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  // Handle expand/collapse for options segment breakdown
  const toggleOptionsExpand = (key) => {
    setOptionsExpandedRows((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // --- CSV Upload ---
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!selectedYear || !selectedMonth) {
      alert("Please select a Year and Month first.");
      return;
    }
    setFileName(file.name);
    setUploadMessage("");
    setParsedCsv([]);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const { data, errors } = results;
        if (errors.length > 0) {
          setUploadMessage(`CSV parsing error: ${errors[0].message}`);
          return;
        }
        setParsedCsv(data);
        setUploadMessage("CSV file parsed successfully. Ready to upload.");
      },
      error: (error) => {
        setUploadMessage(`Error parsing CSV: ${error.message}`);
      },
    });
  };

  const handleUploadCSV = () => {
    if (!parsedCsv.length) {
      alert("No CSV data available.");
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    setUploadMessage("Uploading...");
    const payload = JSON.stringify({
      year: selectedYear,
      month: selectedMonth,
      data: parsedCsv,
    });

    const xhr = new window.XMLHttpRequest();
    xhr.open("POST", "/api/upload-csv");
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        setUploadProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        setUploadMessage("CSV uploaded successfully.");
      } else {
        setUploadMessage("Error uploading CSV.");
      }
      setUploading(false);
    };
    xhr.onerror = () => {
      setUploadMessage("Error uploading CSV.");
      setUploading(false);
    };
    xhr.send(payload);
  };

  // --- Reset ---
  const handleReset = () => {
    setSelectedYear("");
    setSelectedMonth("");
    setIndicesData(null);
    setCsvData(null);
    setCalculationDates(null);
    setParsedCsv([]);
    setFileName("");
    setUploadMessage("");
    setCombinedData([]);
    setMutualFundData([]);
  };

  // --- Sorting ---
  const handleSort = (col) => {
    setSortConfig((prev) => ({
      key: col,
      direction: prev.key === col && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const getSortedData = (dataArray) => {
    const { key, direction } = sortConfig;
    if (!key || key === "#")
      return [...dataArray].sort((a, b) => a.idx - b.idx);

    return [...dataArray].sort((a, b) => {
      let aValue = a[key],
        bValue = b[key];

      if (aValue && typeof aValue === "object" && aValue.value !== undefined)
        aValue = aValue.value;
      if (bValue && typeof bValue === "object" && bValue.value !== undefined)
        bValue = bValue.value;

      if (typeof aValue === "string" && aValue.includes("%"))
        aValue = parseFloat(aValue.replace("%", ""));
      if (typeof bValue === "string" && bValue.includes("%"))
        bValue = parseFloat(bValue.replace("%", ""));

      if (aValue === "-" || aValue === undefined || aValue === null)
        aValue = null;
      if (bValue === "-" || bValue === undefined || bValue === null)
        bValue = null;
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

  // Table search applies only to indices, not mutual funds (can extend if needed)
  const sortedData = getSortedData(combinedData);
  const filteredData = sortedData.filter((item) =>
    item.index.toLowerCase().includes(tableSearchTerm.toLowerCase())
  );

  // Helper function to get % value or dash for any number field
  const renderCellValue = (row, p) => {
    if (row[p] && typeof row[p] === "object") {
      return row[p].value !== "-" &&
        row[p].value !== undefined &&
        row[p].value !== null
        ? row[p].value + "%"
        : "-";
    } else if (
      row[p] !== undefined &&
      row[p] !== null &&
      row[p] !== "N/A" &&
      row[p] !== "-"
    ) {
      return row[p] + "%";
    }
    return "-";
  };

  return (
    <div className="p-6 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">PMS Monthly Comparison</h1>

      {/* Year/Month Select */}
      <div className="flex gap-4 mb-4 items-center">
        <div>
          <Label className="mb-1">Year</Label>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[140px] bg-background">
              <SelectValue placeholder="Select Year" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 15 }, (_, i) => 2025 - i).map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1">Month</Label>
          <Select
            value={selectedMonth}
            onValueChange={setSelectedMonth}
            className="bg-background"
          >
            <SelectTrigger className="w-[160px] bg-background">
              <SelectValue placeholder="Select Month" />
            </SelectTrigger>
            <SelectContent>
              {[
                "January",
                "February",
                "March",
                "April",
                "May",
                "June",
                "July",
                "August",
                "September",
                "October",
                "November",
                "December",
              ].map((m, i) => (
                <SelectItem key={m} value={String(i + 1)}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* <Button onClick={fetchData} className="mt-4">
          Submit
        </Button>
        <Button variant="outline" className="mt-4" onClick={handleReset}>
          Reset
        </Button> */}
      </div>

      {/* Table */}
      {loading && <p>Loading...</p>}
      {error && <Alert variant="destructive">{error}</Alert>}

      {/* --- Mutual Funds Table --- */}
      {mutualFundData && mutualFundData.length > 0 && (
        <div className="mb-10">
          <h2 className="text-lg font-semibold mb-2">Mutual Fund Returns</h2>
          <Table className="border bg-background rounded-lg mb-4">
            <TableHeader className="bg-primary text-white font-bold">
              <TableRow>
                <TableHead className="bg-primary text-white">#</TableHead>
                <TableHead className="bg-primary text-white">
                  Mutual Fund
                </TableHead>
                {returnPeriods.map((p) => (
                  <TableHead key={p} className="bg-primary text-white">
                    {p}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {mutualFundData.map((row) => (
                <TableRow key={row.name}>
                  <TableCell>{row.idx}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  {returnPeriods.map((p) => (
                    <TableCell
                      key={p}
                      className={
                        typeof row[p] === "object" &&
                        row[p].value !== "-" &&
                        parseFloat(row[p].value) < 0
                          ? "text-red-500"
                          : typeof row[p] === "string" &&
                            !isNaN(parseFloat(row[p])) &&
                            parseFloat(row[p]) < 0
                          ? "text-red-500"
                          : ""
                      }
                    >
                      {renderCellValue(row, p)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* --- Indices Table --- */}
      {combinedData.length > 0 && (
        <div>
          <Input
            placeholder="Search table..."
            value={tableSearchTerm}
            onChange={(e) => setTableSearchTerm(e.target.value)}
            className="max-w-sm mb-4 bg-background"
          />

          <Table className="border bg-background rounded-lg">
            <TableHeader className="bg-primary text-white font-bold">
              <TableRow>
                <TableHead
                  onClick={() => setSortConfig({ key: "#", direction: "asc" })}
                  className="cursor-pointer bg-primary text-white"
                >
                  #
                </TableHead>
                <TableHead className="bg-primary text-white">Expand</TableHead>
                <TableHead
                  onClick={() => handleSort("index")}
                  className="cursor-pointer bg-primary text-white"
                >
                  Index
                  {sortConfig.key === "index"
                    ? sortConfig.direction === "asc"
                      ? " ▲"
                      : " ▼"
                    : ""}
                </TableHead>
                <TableHead
                  onClick={() => handleSort("group")}
                  className="cursor-pointer bg-primary text-white"
                >
                  Group
                  {sortConfig.key === "group"
                    ? sortConfig.direction === "asc"
                      ? " ▲"
                      : " ▼"
                    : ""}
                </TableHead>
                {returnPeriods.map((p) => (
                  <TableHead
                    key={p}
                    onClick={() => handleSort(p)}
                    className="cursor-pointer bg-primary text-white"
                  >
                    {p}
                    {sortConfig.key === p
                      ? sortConfig.direction === "asc"
                        ? " ▲"
                        : " ▼"
                      : ""}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((row) => (
                <React.Fragment key={row.index}>
                  <TableRow>
                    <TableCell>{row.idx}</TableCell>
                    <TableCell>
                      {allIndicesGroups["Qode Strategies"].includes(row.index) &&
                        row.index !== "QGF-LIVE" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleBreakdown(row.index)}
                          >
                            {expandedRows.has(row.index) ? "▾" : "▸"}
                          </Button>
                        )}
                    </TableCell>
                    <TableCell>{row.index}</TableCell>
                    <TableCell>{row.group}</TableCell>
                    {returnPeriods.map((p) => (
                      <TableCell
                        key={p}
                        className={
                          typeof row[p] === "object" &&
                          row[p].value !== "-" &&
                          parseFloat(row[p].value) < 0
                            ? "text-red-500"
                            : typeof row[p] === "string" &&
                              !isNaN(parseFloat(row[p])) &&
                              parseFloat(row[p]) < 0
                            ? "text-red-500"
                            : ""
                        }
                      >
                        {renderCellValue(row, p)}
                      </TableCell>
                    ))}
                  </TableRow>
                  {/* Breakdown rows */}
                  {expandedRows.has(row.index) && (
                    <>
                      {loadingBreakdown[row.index] ? (
                        <TableRow>
                          <TableCell
                            colSpan={columns.length + 5}
                            className="text-center py-2"
                          >
                            <Loader2 className="h-4 w-4 animate-spin text-primary inline mr-2" />
                            Loading breakdown...
                          </TableCell>
                        </TableRow>
                      ) : breakdowns[row.index] &&
                        Array.isArray(breakdowns[row.index].returns) ? (
                        breakdowns[row.index].returns.map((seg, j) => {
                          if (seg.label === "Options") {
                            // Gather both "Dynamic Puts" and "Long Options" segments
                            const subSegments = breakdowns[
                              row.index
                            ].returns.filter(
                              (s) =>
                                s.label === "Dynamic Puts" ||
                                s.label === "Long Options"
                            );
                            return (
                              <React.Fragment
                                key={`${row.index}-segment-options-dropdown`}
                              >
                                <TableRow>
                                  <TableCell />
                                  <TableCell>
                                    <div className="grid justify-items-center">
                                      <Button
                                        variant="ghost"
                                        size="xs"
                                        className="px-[2px]"
                                        onClick={() =>
                                          toggleOptionsExpand(
                                            `${row.index}-options`
                                          )
                                        }
                                      >
                                        {optionsExpandedRows[
                                          `${row.index}-options`
                                        ]
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
                                {optionsExpandedRows[`${row.index}-options`] &&
                                  subSegments.map((subSeg, k) => (
                                    <TableRow
                                      key={`${row.index}-options-subrow-${k}`}
                                      className="bg-muted/40 text-xs"
                                    >
                                      <TableCell />
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
                                              subSeg.metrics[col] !==
                                                undefined &&
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

                          if (
                            seg.label === "Long Options" ||
                            seg.label === "Dynamic Puts"
                          ) {
                            // These rows will be handled in the nested dropdown of Options, so skip them here
                            return null;
                          }

                          // Render other breakdown segments as before
                          return (
                            <TableRow
                              key={`${row.index}-segment-${j}`}
                              className={`text-sm ${
                                seg.label === "Dynamic Puts" ||
                                seg.label === "Long Options"
                                  ? "bg-muted/60"
                                  : "bg-grey/60"
                              }`}
                            >
                              <TableCell />
                              <TableCell />

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
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
