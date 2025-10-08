"use client";
import React, { useEffect, useState, useMemo } from "react";
import { ArrowUp, ArrowDown, Info } from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import formatDate from "@/utils/formatDate";
import { formatCurrency } from "@/utils/formatCurrency";

import {
  Table,
  TableBody,
  TableCaption,
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
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";
import allIndicesGroups from "@/utils/allIndicesGroups"

const IndexTable = () => {
  const [data, setData] = useState([]);
  const [date, setDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [selectedGroup, setSelectedGroup] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("table");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  
  const segregateIndices = (rawData) => {
    const dataMap = new Map(rawData.map((item) => [item.indices, item]));
    const combined = [];
    for (const [category, indices] of Object.entries(allIndicesGroups)) {
      indices.forEach((index) => {
        const item = dataMap.get(index);
        if (item) {
          combined.push({ ...item, category });
        } else {
          combined.push({
            indices: index,
            nav: "N/A",
            currentDD: "N/A",
            peak: "N/A",
            dd10: false,
            dd15: false,
            dd20: false,
            category,
          });
        }
      });
    }
    return combined;
  };

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
        setData(
          result.data.map((item) => ({
            ...item,
            indices: item.indices || "N/A",
            nav: typeof item.nav === "number" ? item.nav : "N/A",
            peak: typeof item.peak === "number" ? item.peak : "N/A",
            currentDD:
              typeof item.currentDD === "number" ? `${item.currentDD}%` : "N/A",
          }))
        );
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

  // Helper function for sorting
  const getSortedData = (dataArray) => {
    const { key, direction } = sortConfig;
    if (!key) return dataArray;
    return [...dataArray].sort((a, b) => {
      let aValue = a[key],
        bValue = b[key];
      
      // Handle special cases for currentDD (remove % and convert to number)
      if (key === "currentDD") {
        aValue = typeof aValue === "string" ? parseFloat(aValue.replace("%", "")) : aValue;
        bValue = typeof bValue === "string" ? parseFloat(bValue.replace("%", "")) : bValue;
      }
      
      if (aValue === "-" || aValue === "N/A" || aValue === undefined || aValue === null) aValue = null;
      if (bValue === "-" || bValue === "N/A" || bValue === undefined || bValue === null) bValue = null;
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

  const sortedData = useMemo(() => {
    const combined = segregateIndices(data);
    const filteredByGroup =
      selectedGroup === "All"
        ? combined
        : combined.filter((item) => item.category === selectedGroup);
    const filtered = filteredByGroup.filter((item) =>
      item.indices.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return getSortedData(filtered);
  }, [data, selectedGroup, searchTerm, sortConfig]);

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    const transformedData = sortedData.map((item, i) => ({
      "S.No": i + 1,
      Indices: item.indices,
      Category: item.category,
      "Current NAV": item.nav,
      "Current DD": item.currentDD,
      Peak: item.peak,
    }));
    const worksheet = XLSX.utils.json_to_sheet(transformedData);
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
      {/* Table */}
      <div className="rounded-lg border">
        <Table className="border bg-background rounded-lg">
          <TableHeader className="bg-primary text-white font-bold">
            <TableRow className="bg-primary text-white font-bold">
              <TableHead className="bg-primary text-white font-bold">
                S.No
              </TableHead>
              <TableHead 
                className="bg-primary text-white font-bold cursor-pointer"
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
                className="bg-primary text-white font-bold cursor-pointer"
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
                className="bg-primary text-white font-bold cursor-pointer"
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
                className="bg-primary text-white font-bold cursor-pointer"
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
                className="bg-primary text-white font-bold cursor-pointer"
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
              <TableHead 
                className="bg-primary text-white font-bold cursor-pointer"
                onClick={() =>
                  setSortConfig((prev) => ({
                    key: "dd10_value",
                    direction:
                      prev.key === "dd10_value" && prev.direction === "asc"
                        ? "desc"
                        : "asc",
                  }))
                }
              >
                10% DD
                {sortConfig.key === "dd10_value"
                  ? sortConfig.direction === "asc"
                    ? " ▲"
                    : " ▼"
                  : ""}
              </TableHead>
              <TableHead 
                className="bg-primary text-white font-bold cursor-pointer"
                onClick={() =>
                  setSortConfig((prev) => ({
                    key: "dd15_value",
                    direction:
                      prev.key === "dd15_value" && prev.direction === "asc"
                        ? "desc"
                        : "asc",
                  }))
                }
              >
                15% DD
                {sortConfig.key === "dd15_value"
                  ? sortConfig.direction === "asc"
                    ? " ▲"
                    : " ▼"
                  : ""}
              </TableHead>
              <TableHead 
                className="bg-primary text-white font-bold cursor-pointer"
                onClick={() =>
                  setSortConfig((prev) => ({
                    key: "dd20_value",
                    direction:
                      prev.key === "dd20_value" && prev.direction === "asc"
                        ? "desc"
                        : "asc",
                  }))
                }
              >
                20% DD
                {sortConfig.key === "dd20_value"
                  ? sortConfig.direction === "asc"
                    ? " ▲"
                    : " ▼"
                  : ""}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((item, i) => {
              // Extract numeric DD (strip % if string)
              const numericDD =
                typeof item.currentDD === "string"
                  ? parseFloat(item.currentDD.replace("%", ""))
                  : item.currentDD;

              return (
                <TableRow key={item.indices}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>{item.indices}</TableCell>
                  <TableCell>
                    {item.category}
                  </TableCell>
                  <TableCell>
                    {item.nav !== "N/A" ? (item.nav) : "N/A"}
                  </TableCell>
                  <TableCell>{item.currentDD}</TableCell>
                  <TableCell>
                    {item.peak !== "N/A" ? (item.peak) : "N/A"}
                  </TableCell>
                  {/* 10% DD */}
                  <TableCell
                    className={
                      numericDD <= -10 ? "text-green-600 font-medium" : ""
                    }
                  >
                    {numericDD <= -10
                      ? "Done"
                      : (item?.dd10_value)}
                  </TableCell>
                  {/* 15% DD */}
                  <TableCell
                    className={
                      numericDD <= -15 ? "text-green-600 font-medium" : ""
                    }
                  >
                    {numericDD <= -15
                      ? "Done"
                      : (item?.dd15_value)}
                  </TableCell>
                  {/* 20% DD */}
                  <TableCell
                    className={
                      numericDD <= -20 ? "text-green-600 font-medium" : ""
                    }
                  >
                    {numericDD <= -20
                      ? "Done"
                      : (item?.dd20_value)}
                  </TableCell>
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