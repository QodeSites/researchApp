"use client";
import { useState, useEffect } from "react";
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

  const [combinedData, setCombinedData] = useState([]); // 🔹 fixed order data

  const returnPeriods = [
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
  }, [selectedYear, selectedMonth]);

  // --- Fetch Data ---
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/monthly-report?year=${selectedYear}&month=${selectedMonth}`
      );
      const result = await response.json();
      if (response.ok) {
        setIndicesData(result.indices);
        setCsvData(result.csvData);
        setCalculationDates(result.calculationDates);

        // 🔹 Assign idx globally once
        const allIndices = Object.values(allIndicesGroups).flat();
        const combined = [];
        allIndices.forEach((index, idx) => {
          const group =
            Object.keys(allIndicesGroups).find((g) =>
              allIndicesGroups[g].includes(index)
            ) || "Other";
          const data = result.indices?.[index] || result.csvData?.[index];
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
      } else {
        setError(result.error || "Failed to fetch data");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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

    const xhr = new XMLHttpRequest();
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
    if (!key || key === "#") return [...dataArray].sort((a, b) => a.idx - b.idx);

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

  const sortedData = getSortedData(combinedData);
  const filteredData = sortedData.filter((item) =>
    item.index.toLowerCase().includes(tableSearchTerm.toLowerCase())
  );

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

      {combinedData.length > 0 && (
        <div>
          {calculationDates && (
            <p className="text-sm text-gray-500 mb-2">
              Data from {formatDate(calculationDates.start)} to{" "}
              {formatDate(calculationDates.end)}
            </p>
          )}

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
                <TableRow key={row.index}>
                  <TableCell>{row.idx}</TableCell>
                  <TableCell>{row.index}</TableCell>
                  <TableCell>{row.group}</TableCell>
                  {returnPeriods.map((p) => (
                    <TableCell
                      key={p}
                      className={
                        row[p] &&
                        typeof row[p] === "object" &&
                        row[p].value !== "-" &&
                        parseFloat(row[p].value) < 0
                          ? "text-red-500"
                          : ""
                      }
                    >
                      {row[p] && typeof row[p] === "object"
                        ? row[p].value !== "-"
                          ? row[p].value + "%"
                          : "-"
                        : row[p] !== "-"
                        ? row[p] + "%"
                        : "-"}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
