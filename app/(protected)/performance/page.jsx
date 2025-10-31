"use client";
import { useState, useEffect } from "react";
import formatDate from "@/utils/formatDate";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
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

  const shortTermCols = [
    "1D", "2D", "3D", "1W", "1M", "3M", "6M", "9M", "1Y", "Drawdown",
  ];
  const longTermCols = ["1Y", "2Y", "3Y", "4Y", "5Y", "CDR", "CDR_MDD"];

  // --- Fetch Data ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const payload = {};
      if (startDate && endDate) {
        payload.startDate = startDate;
        payload.endDate = endDate;
      }

      const response = await fetch(`${PYTHON_BASE_URL}/api/clienttracker/indices/false`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

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
        const res = await fetch(`${PYTHON_BASE_URL}/api/clienttracker/returns_breakdown`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        setBreakdowns((prev) => ({ ...prev, [indexName]: json }));
      } catch (err) {
        console.error("Failed to load breakdown:", err);
      } finally {
        setLoadingBreakdown((prev) => ({ ...prev, [indexName]: false }));
      }
    }
  };

  console.log(breakdowns)

  const resetTable = () => {
    setSearchTerm("");
    setSelectedGroup("All");
    setSelectedIndices([]);
    setStartDate("");
    setEndDate("");
    setSortConfig({ key: null, direction: "asc" });
    fetchData();
  };


  const downloadSelectedNavData = async () => {
    if (selectedIndices.length === 0) {
      alert("Please select at least one index");
      return;
    }
    try {
      const payload = { indices: selectedIndices };
      if (startDate && endDate) {
        payload.startDate = startDate;
        payload.endDate = endDate;
      }
      const response = await fetch(`${PYTHON_BASE_URL}/api/clienttracker/indices/true`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

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
    }
  };

  const toggleIndexSelection = (index) => {
    setSelectedIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const getSortedIndices = (indices) => {
    const { key, direction } = sortConfig;
    if (!key || key === "#") return [...indices].sort((a, b) => a.idx - b.idx);

    return [...indices].sort((a, b) => {
      let aValue = a[key],
        bValue = b[key];
      if (aValue === "-" || aValue === undefined) aValue = null;
      if (bValue === "-" || bValue === undefined) bValue = null;
      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return 1;
      if (bValue === null) return -1;
      if (!isNaN(parseFloat(aValue)) && !isNaN(parseFloat(bValue))) {
        return direction === "asc"
          ? parseFloat(aValue) - parseFloat(bValue)
          : parseFloat(bValue) - parseFloat(aValue);
      }
      return 0;
    });
  };

  const filteredIndices = combinedIndices.filter(
    (item) =>
      (selectedGroup === "All" || item.category === selectedGroup) &&
      item.index.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sorted = getSortedIndices(filteredIndices);

  // --- Table Renderer ---
  const renderTable = (columns) => (
    <Table className="border bg-background rounded-lg">
      <TableHeader className="bg-primary text-white font-bold">
        <TableRow className="bg-primary text-white font-bold">
          <TableHead className="bg-primary text-white font-bold">#</TableHead>
          <TableHead className="bg-primary text-white font-bold"></TableHead>
          <TableHead className="bg-primary text-white font-bold">Expand</TableHead>
          <TableHead className="bg-primary text-white font-bold">Index</TableHead>
          <TableHead className="bg-primary text-white font-bold">Category</TableHead>
          {columns.map((col) => (
            <TableHead className="bg-primary text-white font-bold" key={col}>{col}</TableHead>
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
                {allIndicesGroups["Qode Strategies"].includes(item.index) && (item.index !== 'QGF-LIVE') && (
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
                  className={item[col] && parseFloat(item[col]) < 0 ? "text-red-500" : ""}
                >
                  {item[col] !== undefined && item[col] !== null && item[col] !== ""
                    ? `${!isNaN(Number(item[col])) ? Number(item[col]).toFixed(2) : item[col]}%`
                    : "-"}
                </TableCell>
              ))}
            </TableRow>

            {/* Breakdown rows */}
            {expandedRows.has(item.index) && (
              <>
                {loadingBreakdown[item.index] ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + 5} className="text-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary inline mr-2" />
                      Loading breakdown...
                    </TableCell>
                  </TableRow>
                ) : breakdowns[item.index] &&
                  Array.isArray(breakdowns[item.index].returns) ? (
                  breakdowns[item.index].returns.map((seg, j) => (
                    <TableRow key={`${item.index}-segment-${j}`} className="bg-muted/30 text-sm">
                      <TableCell />
                      {seg.label !== "Total" ? (
                        <>
                          <TableCell>
                            <Checkbox
                              className="border border-primary focus:ring-2 focus:ring-primary focus:outline-none rounded"
                              checked={selectedIndices.includes(`${item.index}-${seg.label}`)}
                              onCheckedChange={() => toggleIndexSelection(`${item.index}-${seg.label}`)}
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
                      
                      <TableCell className="text-xs text-gray-600 italic">{seg.label || "-"}</TableCell>
                      <TableCell></TableCell>
                      {columns.map((col) => (
                        <TableCell className="text-xs text-gray-600 italic" key={col}>
                          {seg.trailing[col] !== undefined && seg.trailing[col] !== null
                            ? `${seg.trailing[col]}%`
                            : seg.metrics[col] !== undefined && seg.metrics[col] !== null
                              ? `${seg.metrics[col]}%`
                              : "-"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length + 5} className="text-center text-sm">
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
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
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
        <Button onClick={downloadSelectedNavData} disabled={selectedIndices.length === 0}>
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
