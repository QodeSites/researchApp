"use client";
import React, { useEffect, useState, useMemo } from "react";
import { Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import formatDate from "@/utils/formatDate";
import allIndicesGroups from "@/utils/allIndicesGroups";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const IndexTable = () => {
  const [data, setData] = useState([]);
  const [date, setDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [selectedGroup, setSelectedGroup] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [indexedData, setIndexedData] = useState([]); // ✅ Fixed index assignment

  // --- Fetch Data ---
  const fetchIndices = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/fetchIndex");
      const result = await response.json();

      if (Array.isArray(result.data)) {
        const latestDate =
          result.data.length > 0
            ? formatDate(result.data[0].date || result.date || new Date())
            : formatDate(new Date());
        setDate(latestDate);

        // Normalize incoming data
        const normalized = result.data.map((item) => ({
          ...item,
          indices: item.indices || "N/A",
          nav: typeof item.nav === "number" ? item.nav : "N/A",
          peak: typeof item.peak === "number" ? item.peak : "N/A",
          currentDD:
            typeof item.currentDD === "number"
              ? `${item.currentDD}%`
              : "N/A",
        }));

        // ✅ Assign fixed global idx once based on allIndicesGroups order
        const allIndices = Object.values(allIndicesGroups).flat();
        const combined = allIndices.map((index, idx) => {
          const category =
            Object.keys(allIndicesGroups).find((g) =>
              allIndicesGroups[g].includes(index)
            ) || "Other";
          const found = normalized.find((item) => item.indices === index);
          return {
            idx: idx + 1,
            category,
            indices: index,
            nav: found?.nav ?? "N/A",
            currentDD: found?.currentDD ?? "N/A",
            peak: found?.peak ?? "N/A",
            dd10_value: found?.dd10_value ?? "",
            dd15_value: found?.dd15_value ?? "",
            dd20_value: found?.dd20_value ?? "",
          };
        });

        setData(combined);
        setIndexedData(combined);
      } else {
        setError("Invalid data structure");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIndices();
  }, []);

  // --- Sorting helper ---
  const getSortedData = (dataArray) => {
    const { key, direction } = sortConfig;
    if (!key || key === "#") return [...dataArray].sort((a, b) => a.idx - b.idx);

    return [...dataArray].sort((a, b) => {
      let aValue = a[key],
        bValue = b[key];

      if (key === "currentDD") {
        aValue =
          typeof aValue === "string"
            ? parseFloat(aValue.replace("%", ""))
            : aValue;
        bValue =
          typeof bValue === "string"
            ? parseFloat(bValue.replace("%", ""))
            : bValue;
      }

      if (
        aValue === "-" ||
        aValue === "N/A" ||
        aValue === undefined ||
        aValue === null
      )
        aValue = null;
      if (
        bValue === "-" ||
        bValue === "N/A" ||
        bValue === undefined ||
        bValue === null
      )
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

  const filteredData = useMemo(() => {
    const filteredByGroup =
      selectedGroup === "All"
        ? indexedData
        : indexedData.filter((item) => item.category === selectedGroup);

    const filteredBySearch = filteredByGroup.filter((item) =>
      item.indices.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return getSortedData(filteredBySearch);
  }, [indexedData, selectedGroup, searchTerm, sortConfig]);

  // --- Export Excel ---
  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    const transformed = filteredData.map((item) => ({
      "#": item.idx,
      Indices: item.indices,
      Category: item.category,
      "Current NAV": item.nav,
      "Current DD": item.currentDD,
      Peak: item.peak,
      "10% DD": item.dd10_value,
      "15% DD": item.dd15_value,
      "20% DD": item.dd20_value,
    }));
    const worksheet = XLSX.utils.json_to_sheet(transformed);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Indices");
    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout]), "Indices.xlsx");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen">
      <h2 className="text-2xl font-bold mb-4">Indices Drawdowns</h2>
      {error && (
        <div className="bg-red-100 text-red-700 p-2 rounded mb-4">{error}</div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <Input
          placeholder="Search Indices"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border bg-background rounded-lg"
        />
        <Select value={selectedGroup} onValueChange={setSelectedGroup}>
          <SelectTrigger className="w-[200px] bg-background">
            <SelectValue placeholder="Select Group" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Groups</SelectItem>
            {Object.keys(allIndicesGroups).map((group) => (
              <SelectItem key={group} value={group}>
                {group}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={exportToExcel}>Export Excel</Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table className="border bg-background rounded-lg">
          <TableHeader className="bg-primary text-white font-bold">
            <TableRow>
              <TableHead
                className="bg-primary text-white font-bold cursor-pointer" 
                onClick={() => setSortConfig({ key: "#", direction: "asc" })}
              >
                #
              </TableHead>
              <TableHead
                className="cursor-pointer text-white font-bold"
                onClick={() =>
                  setSortConfig((prev) => ({
                    key: "indices",
                    direction:
                      prev.key === "indices" && prev.direction === "asc"
                        ? "desc"
                        : "asc",
                  }))
                }
              >
                Indices
                {sortConfig.key === "indices"
                  ? sortConfig.direction === "asc"
                    ? " ▲"
                    : " ▼"
                  : ""}
              </TableHead>
              <TableHead
                className="cursor-pointer text-white font-bold"
                onClick={() =>
                  setSortConfig((prev) => ({
                    key: "category",
                    direction:
                      prev.key === "category" && prev.direction === "asc"
                        ? "desc"
                        : "asc",
                  }))
                }
              >
                Category
                {sortConfig.key === "category"
                  ? sortConfig.direction === "asc"
                    ? " ▲"
                    : " ▼"
                  : ""}
              </TableHead>
              <TableHead
                className="cursor-pointer text-white font-bold"
                onClick={() =>
                  setSortConfig((prev) => ({
                    key: "nav",
                    direction:
                      prev.key === "nav" && prev.direction === "asc"
                        ? "desc"
                        : "asc",
                  }))
                }
              >
                Current NAV
                {sortConfig.key === "nav"
                  ? sortConfig.direction === "asc"
                    ? " ▲"
                    : " ▼"
                  : ""}
                {date && (
                  <span className="block text-xs text-white">({date})</span>
                )}
              </TableHead>
              <TableHead
                className="cursor-pointer text-white font-bold"
                onClick={() =>
                  setSortConfig((prev) => ({
                    key: "currentDD",
                    direction:
                      prev.key === "currentDD" && prev.direction === "asc"
                        ? "desc"
                        : "asc",
                  }))
                }
              >
                Current DD
                {sortConfig.key === "currentDD"
                  ? sortConfig.direction === "asc"
                    ? " ▲"
                    : " ▼"
                  : ""}
              </TableHead>
              <TableHead
                className="cursor-pointer text-white font-bold"
                onClick={() =>
                  setSortConfig((prev) => ({
                    key: "peak",
                    direction:
                      prev.key === "peak" && prev.direction === "asc"
                        ? "desc"
                        : "asc",
                  }))
                }
              >
                Peak
                {sortConfig.key === "peak"
                  ? sortConfig.direction === "asc"
                    ? " ▲"
                    : " ▼"
                  : ""}
              </TableHead>
              {["dd10_value", "dd15_value", "dd20_value"].map((key, i) => (
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
                  {10 + 5 * i}% DD
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
            {filteredData.map((item) => {
              const numericDD =
                typeof item.currentDD === "string"
                  ? parseFloat(item.currentDD.replace("%", ""))
                  : item.currentDD;

              return (
                <TableRow key={item.indices}>
                  <TableCell>{item.idx}</TableCell>
                  <TableCell>{item.indices}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>{item.nav}</TableCell>
                  <TableCell>{item.currentDD}</TableCell>
                  <TableCell>{item.peak}</TableCell>

                  {[10, 15, 20].map((dd) => (
                    <TableCell
                      key={dd}
                      className={
                        numericDD <= -dd ? "text-green-600 font-medium" : ""
                      }
                    >
                      {numericDD <= -dd ? "Done" : item[`dd${dd}_value`]}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default IndexTable;
