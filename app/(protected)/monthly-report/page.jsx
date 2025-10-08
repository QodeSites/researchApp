"use client";
import { useState, useEffect } from "react";
import Papa from "papaparse";
import formatDate from "@/utils/formatDate";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { Progress } from "@/components/ui/progress";
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

  const [searchTerm, setSearchTerm] = useState("");
  const [tableSearchTerm, setTableSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  useEffect(() => {
    if (!selectedYear && !selectedMonth) {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear().toString();
      const currentMonth = (currentDate.getMonth() + 1).toString();
      setSelectedYear(currentYear);
      setSelectedMonth(currentMonth);
    }
  }, [selectedYear, selectedMonth]);

  // Fetch data when year and month are selected
  useEffect(() => {
    if (selectedYear && selectedMonth) {
      fetchData();
    }
  }, [selectedYear, selectedMonth]);

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

  const predefinedGroups = allIndicesGroups;
  const getOrderedIndices = () => {
    const ordered = [];
    Object.values(predefinedGroups).forEach((indices) => {
      indices.forEach((index) => {
        ordered.push(index);
      });
    });
    return ordered;
  };

  // --- Fetch data ---
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
      } else {
        setError(result.error || "Failed to fetch data");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- CSV Parsing ---
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
  };

  // --- Sort ---
  const handleSort = (col) => {
    setSortConfig((prev) => ({
      key: col,
      direction: prev.key === col && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  // Helper function for sorting
  const getSortedData = (dataArray) => {
    const { key, direction } = sortConfig;
    if (!key) return dataArray;
    return [...dataArray].sort((a, b) => {
      let aValue = a[key],
        bValue = b[key];

      // Handle object values (returns data structure)
      if (aValue && typeof aValue === "object" && aValue.value !== undefined) {
        aValue = aValue.value;
      }
      if (bValue && typeof bValue === "object" && bValue.value !== undefined) {
        bValue = bValue.value;
      }

      // Handle percentage strings
      if (typeof aValue === "string" && aValue.includes("%")) {
        aValue = parseFloat(aValue.replace("%", ""));
      }
      if (typeof bValue === "string" && bValue.includes("%")) {
        bValue = parseFloat(bValue.replace("%", ""));
      }

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

  const combinedArray = () => {
    const combined = [];
    const orderedIndices = getOrderedIndices();

    orderedIndices.forEach((key) => {
      let item = indicesData?.[key] || csvData?.[key];
      if (!item) return; // skip if not present
      let group = "Other";
      for (const [groupName, indices] of Object.entries(predefinedGroups)) {
        if (indices.includes(key)) group = groupName;
      }

      if (indicesData?.[key]) {
        combined.push({ index: key, group, ...indicesData[key].returns });
      } else if (csvData?.[key]) {
        combined.push({ index: key, group: item.group || "Other", ...item });
      }
    });

    return combined;
  };

  const sortedData = getSortedData(combinedArray());

  const filteredData = sortedData.filter((item) =>
    item.index.toLowerCase().includes(tableSearchTerm.toLowerCase())
  );

  return (
    <div className="p-6 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">PMS Monthly Comparison</h1>

      {/* Year/Month Select */}
      <div className="flex gap-4 mb-4 items-center align-center">
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
        <Button onClick={fetchData} className="mt-4">
          Submit
        </Button>
        <Button variant="outline" className="mt-4" onClick={handleReset}>
          Reset
        </Button>
      </div>

      {/* CSV Upload */}
      <div className="mb-6 hidden">
        <Label>Upload CSV</Label>
        <Input
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="file:bg-primary file:text-white file:border-0 file:rounded file:px-4 bg-background pl-1 file:mr-2"
        />
        {fileName && <p className="text-sm mt-2">Selected file: {fileName}</p>}
        <p className="text-sm text-gray-500 mt-1 ml-1">
          CSV must contain columns: Category, PMS Name, 1M, 3M, 6M, 1Y, 2Y, 3Y,
          4Y, 5Y, Since Inception, year, month.
        </p>
        <Button
          onClick={handleUploadCSV}
          className="mt-2"
          disabled={uploading || parsedCsv.length === 0}
        >
          {uploading ? "Uploading..." : "Upload CSV"}
        </Button>
        {uploading && <Progress value={uploadProgress} className="mt-2" />}
        {uploadMessage && (
          <Alert variant="default" className="mt-2">
            {uploadMessage}
          </Alert>
        )}
      </div>

      {/* Table */}
      {loading && <p>Loading...</p>}
      {error && <Alert variant="destructive">{error}</Alert>}

      {(indicesData || csvData) && (
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
                  onClick={() => handleSort("index")}
                  className="bg-primary text-white font-bold cursor-pointer"
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
                  className="bg-primary text-white font-bold cursor-pointer"
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
                    className="bg-primary text-white font-bold cursor-pointer"
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
              {filteredData.map((row, i) => (
                <TableRow key={i}>
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
