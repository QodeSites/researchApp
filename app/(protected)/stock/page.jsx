"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Plus, Search, X, Loader2, Star, Trash2, AlertCircle, Bookmark } from "lucide-react";

const statusColors = {
  "Not Go Ahead": "bg-red-100 text-red-800 border-red-300",
  "Completed": "bg-green-100 text-green-800 border-green-300",
  "In Progress": "bg-yellow-100 text-yellow-800 border-yellow-300",
  "Not Started": "bg-blue-100 text-blue-800 border-blue-300",
};

const holdingColors = {
  "Shortlist": "bg-amber-100 text-amber-800 border-amber-300",
  "Holding": "bg-purple-100 text-purple-800 border-purple-300",
  "Past Holding": "bg-slate-100 text-slate-800 border-slate-300",
};

export default function StocksTracker() {
  const router = useRouter();
  const [stocks, setStocks] = useState([]);
  const [filteredStocks, setFilteredStocks] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  // Add stock modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableStocks, setAvailableStocks] = useState([]);
  const [filteredAvailableStocks, setFilteredAvailableStocks] = useState([]);
  const [searchAvailableInput, setSearchAvailableInput] = useState("");
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [addingStock, setAddingStock] = useState(false);

  // Manual add stock states
  const [showManualAddForm, setShowManualAddForm] = useState(false);
  const [manualFormData, setManualFormData] = useState({
    exchange: "NSE",
    company_name: "",
    bse_code: "",
    nse_code: ""
  });

  // Delete dialog states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [stockToDelete, setStockToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Filter states
  const [statusFilter, setStatusFilter] = useState("All");
  const [exchangeFilter, setExchangeFilter] = useState("All");
  const [holdingFilter, setHoldingFilter] = useState("All");
  const [availableExchanges, setAvailableExchanges] = useState([]);

  // Debounce ref
  const debounceTimeoutRef = useRef(null);

  useEffect(() => {
    fetchStocks();
  }, []);

  const fetchStocks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/research-stocks");
      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }
      const data = await res.json();
      setStocks(data || []);
      setFilteredStocks(data || []);
      
      // Extract unique exchanges
      const exchanges = [...new Set((data || []).map(s => s.exchange))].sort();
      setAvailableExchanges(exchanges);
    } catch (error) {
      console.error("Error fetching stocks:", error);
      setStocks([]);
      setFilteredStocks([]);
    }
    setLoading(false);
  };

  const fetchAvailableStocks = async (searchTerm = "") => {
    setLoadingAvailable(true);
    try {
      const researchedSymbols = new Set(stocks.map(s => s.symbol));
      const excludeStr = Array.from(researchedSymbols).join(",");
      const params = new URLSearchParams({
        limit: "200",
        search: searchTerm,
        exclude: excludeStr
      });
      const res = await fetch(`/api/stocks/by-exchange?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();

      // Map to consistent shape
      const mappedAvailable = data.map(s => ({
        id: s.id,
        symbol: s.primary_symbol,
        exchange: s.primary_exchange,
        company_name: s.company_name,
        industry: s.industry
      }));

      setAvailableStocks(mappedAvailable);
      setFilteredAvailableStocks(mappedAvailable);
    } catch (error) {
      console.error("Error fetching available stocks:", error);
      setAvailableStocks([]);
      setFilteredAvailableStocks([]);
    }
    setLoadingAvailable(false);
  };

  // Debounce search and fetch
  useEffect(() => {
    if (!showAddModal) return;
    
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      fetchAvailableStocks(searchAvailableInput);
    }, 300);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [searchAvailableInput, stocks, showAddModal]);

  useEffect(() => {
    let filtered = stocks.filter(
      stock =>
        stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stock.company_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Apply status filter
    if (statusFilter !== "All") {
      filtered = filtered.filter(s => s.final_status === statusFilter);
    }

    // Apply exchange filter
    if (exchangeFilter !== "All") {
      filtered = filtered.filter(s => s.exchange === exchangeFilter);
    }

    // Apply holding filter
    if (holdingFilter !== "All") {
      if (holdingFilter === "Shortlisted") {
        filtered = filtered.filter(s => s.holding === "Shortlist");
      } else {
        filtered = filtered.filter(s => s.holding === holdingFilter);
      }
    }

    setFilteredStocks(filtered);
  }, [searchTerm, stocks, statusFilter, exchangeFilter, holdingFilter]);

  const handleAddStockClick = () => {
    setSearchAvailableInput("");
    setShowManualAddForm(false);
    setManualFormData({ exchange: "NSE", company_name: "", bse_code: "", nse_code: "" });
    fetchAvailableStocks("");
    setShowAddModal(true);
  };

  // Changes needed in StocksTracker component (page.tsx)
// Replace these two functions:

  const handleSelectStock = async (stock) => {
    setAddingStock(true);
    try {
      const res = await fetch("/api/research-stocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stock_id: stock.id,
          symbol: stock.symbol,
          exchange: stock.exchange,
          company_name: stock.company_name,
          // ✅ REMOVED: macro_sector, sector, basic_industry empty strings
          // This prevents overwriting existing data in stocks table
          industry: stock.industry || "",
          researched_by: "",
          initial_status: "Not Started",
          final_status: "",
          completed_on: "",
          filter: "",
          holding: "",
          documentation_files: [],
          documentation_links: [],
          financial_model_files: [],
          financial_model_links: [],
          thoughts: ""
        })
      });

      if (res.ok) {
        const data = await res.json();
        setShowAddModal(false);
        fetchStocks();
        router.push(`/stock-details?id=${data.id}&edit=true`);
      } else {
        alert("Error adding stock");
      }
    } catch (error) {
      console.error("Error adding stock:", error);
      alert("Error adding stock");
    }
    setAddingStock(false);
  };

  const handleManualAddStock = async (e) => {
    e.preventDefault();
    
    const bseCode = manualFormData.bse_code.trim();
    const nseCode = manualFormData.nse_code.trim();
    
    if (!manualFormData.company_name.trim() || (!bseCode && !nseCode)) {
      alert("Please fill in company name and provide at least one of BSE Code or NSE Code");
      return;
    }

    setAddingStock(true);
    try {
      const symbol = (nseCode || bseCode).toUpperCase();
      const res = await fetch("/api/research-stocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stock_id: null,
          symbol,
          exchange: manualFormData.exchange,
          company_name: manualFormData.company_name.trim(),
          // ✅ REMOVED: macro_sector, sector, basic_industry empty strings
          researched_by: "",
          initial_status: "Not Started",
          final_status: "",
          completed_on: "",
          filter: "",
          holding: "",
          documentation_files: [],
          documentation_links: [],
          financial_model_files: [],
          financial_model_links: [],
          thoughts: "",
          bse_code: bseCode ? bseCode.toUpperCase() : null,
          nse_symbol: nseCode ? nseCode.toUpperCase() : null
        })
      });

      if (res.ok) {
        const data = await res.json();
        setShowAddModal(false);
        setShowManualAddForm(false);
        fetchStocks();
        router.push(`/stock-details?id=${data.id}&edit=true`);
      } else {
        const error = await res.json();
        alert(error.error || "Error adding stock");
      }
    } catch (error) {
      console.error("Error adding stock:", error);
      alert("Error adding stock");
    }
    setAddingStock(false);
  };

  const handleDeleteClick = (e, stock) => {
    e.preventDefault();
    e.stopPropagation();
    setStockToDelete(stock);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!stockToDelete) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/research-stocks/${stockToDelete.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" }
      });

      if (res.ok) {
        setShowDeleteDialog(false);
        setStockToDelete(null);
        fetchStocks();
      } else {
        alert("Error deleting stock");
      }
    } catch (error) {
      console.error("Error deleting stock:", error);
      alert("Error deleting stock");
    }
    setDeleting(false);
  };

  const getStatusCounts = () => {
    return {
      "Not Started": stocks.filter(s => s.final_status === "Not Started").length,
      "In Progress": stocks.filter(s => s.final_status === "In Progress").length,
      "Completed": stocks.filter(s => s.final_status === "Completed").length,
      "Not Go Ahead": stocks.filter(s => s.final_status === "Not Go Ahead").length,
    };
  };

  const getShortlistCount = () => {
    return stocks.filter(s => s.holding === "Shortlist").length;
  };

  const getHoldingCounts = () => {
    return {
      "Shortlist": stocks.filter(s => s.holding === "Shortlist").length,
      "Holding": stocks.filter(s => s.holding === "Holding").length,
      "Past Holding": stocks.filter(s => s.holding === "Past Holding").length,
    };
  };

  const statusCounts = getStatusCounts();
  const holdingCounts = getHoldingCounts();

  // Sort filtered stocks by priority: Holding > Shortlist > Others
  const sortedFilteredStocks = [...filteredStocks].sort((a, b) => {
    const priorityMap = { "Holding": 0, "Shortlist": 1 };
    const aPriority = priorityMap[a.holding] ?? 2;
    const bPriority = priorityMap[b.holding] ?? 2;
    return aPriority - bPriority;
  });

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: "var(--background)",
        color: "var(--foreground)"
      }}
    >
      {/* Header */}
      <div className="border-b sticky top-0 z-30" style={{ borderColor: "var(--border)" }}>
        <div className=" mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Stocks Research Tracker</h1>
              <p className="text-lg opacity-75">Track and manage stock research data across all exchanges</p>
            </div>
            <button
              onClick={handleAddStockClick}
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all hover:shadow-lg active:scale-95"
              style={{
                backgroundColor: "var(--primary)",
                color: "var(--primary-foreground)"
              }}
            >
              <Plus className="w-5 h-5" />
              Add Stock
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className=" mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <div
            className="p-4 rounded-lg border-2"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--card)"
            }}
          >
            <p className="text-sm opacity-75 mb-1">Total Stocks</p>
            <p className="text-3xl font-bold">{stocks.length}</p>
          </div>
          <div
            className="p-4 rounded-lg border-2"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--card)"
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Bookmark className="w-4 h-4" style={{ fill: "currentColor" }} />
              <p className="text-sm opacity-75">Holding</p>
            </div>
            <p className="text-3xl font-bold">{holdingCounts["Holding"]}</p>
          </div>
          <div
            className="p-4 rounded-lg border-2"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--card)"
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-4 h-4" style={{ fill: "currentColor" }} />
              <p className="text-sm opacity-75">Shortlisted</p>
            </div>
            <p className="text-3xl font-bold">{holdingCounts["Shortlist"]}</p>
          </div>
          {["Not Started", "In Progress", "Completed", "Not Go Ahead"].map(status => (
            <div
              key={status}
              className="p-4 rounded-lg border-2"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--card)"
              }}
            >
              <p className="text-sm opacity-75 mb-1">{status}</p>
              <p className="text-3xl font-bold">{statusCounts[status]}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {/* Search */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">Search Stocks</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 opacity-50" />
              <input
                type="text"
                placeholder="Search by symbol or company name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border-2 outline-none transition focus:shadow-md"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--card)",
                  color: "var(--foreground)"
                }}
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border-2 outline-none transition"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--card)",
                color: "var(--foreground)"
              }}
            >
              <option value="All">All Statuses</option>
              <option value="Not Started">Not Started</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Not Go Ahead">Not Go Ahead</option>
            </select>
          </div>

          {/* Exchange Filter
          <div>
            <label className="block text-sm font-medium mb-2">Exchange</label>
            <select
              value={exchangeFilter}
              onChange={(e) => setExchangeFilter(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border-2 outline-none transition"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--card)",
                color: "var(--foreground)"
              }}
            >
              <option value="All">All Exchanges</option>
              {availableExchanges.map(exch => (
                <option key={exch} value={exch}>{exch}</option>
              ))}
            </select>
          </div> */}

          {/* Holding Filter */}
          <div>
            <label className="block text-sm font-medium mb-2">Holding</label>
            <select
              value={holdingFilter}
              onChange={(e) => setHoldingFilter(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border-2 outline-none transition"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--card)",
                color: "var(--foreground)"
              }}
            >
              <option value="All">All Holdings</option>
              <option value="Holding">📌 Holding</option>
              <option value="Shortlisted">★ Shortlisted</option>
              <option value="Past Holding">Past Holding</option>
            </select>
          </div>
        </div>

        {/* Results Info */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm opacity-75">
            Showing <span className="font-bold">{filteredStocks.length}</span> of <span className="font-bold">{stocks.length}</span> stocks
          </p>
          {(searchTerm || statusFilter !== "All" || exchangeFilter !== "All" || holdingFilter !== "All") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("All");
                setExchangeFilter("All");
                setHoldingFilter("All");
              }}
              className="text-sm px-3 py-1 rounded-lg transition hover:opacity-80"
              style={{
                backgroundColor: "var(--secondary)",
                color: "var(--foreground)"
              }}
            >
              Clear All Filters
            </button>
          )}
        </div>

        {/* Stocks List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-16 opacity-50 flex items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Loading stocks...</span>
            </div>
          ) : sortedFilteredStocks.length === 0 ? (
            <div className="text-center py-16 opacity-50">
              <p className="text-lg mb-2">No stocks found</p>
              <p className="text-sm">
                {stocks.length === 0
                  ? "Click 'Add Stock' to get started"
                  : "Try adjusting your search or filters"}
              </p>
            </div>
          ) : (
            sortedFilteredStocks.map(stock => (
              <Link key={stock.id} href={`/stock-details?id=${stock.id}`}>
                <div
                  className="p-5 rounded-lg mb-6 cursor-pointer transition-all hover:shadow-lg relative group border-l-4"
                  style={{
                    borderLeftColor: 
                      stock.holding === "Holding" 
                        ? "#a855f7"
                        : stock.holding === "Shortlist"
                        ? "#f59e0b"
                        : "var(--border)",
                    borderTopWidth: "2px",
                    borderRightWidth: "2px",
                    borderBottomWidth: "2px",
                    borderTopColor: "var(--border)",
                    borderRightColor: "var(--border)",
                    borderBottomColor: "var(--border)",
                    backgroundColor: 
                      stock.holding === "Holding"
                        ? "rgba(168, 85, 247, 0.05)"
                        : "var(--card)",
                    boxShadow: 
                      stock.holding === "Holding"
                        ? "0 0 20px rgba(168, 85, 247, 0.15)"
                        : "none"
                  }}
                >
                  {/* Holding Priority Badge - Top Left */}
                  {stock.holding === "Holding" && (
                    <div className="absolute top-2 left-2 bg-purple-500 text-white px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                      <span>📌</span>
                      <span>HOLDING</span>
                    </div>
                  )}

                  {/* Shortlist Minimal Star - Top Right */}
                  {stock.holding === "Shortlist" && (
                    <div className="absolute top-3 right-3">
                      <Star className="w-5 h-5" style={{ fill: "#f59e0b", color: "#f59e0b" }} />
                    </div>
                  )}

                  <div className="flex items-center justify-between" style={{ marginTop: stock.holding === "Holding" ? "32px" : "0" }}>
                    <div className="flex-1 min-w-0 pr-12">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-lg">{stock.symbol}</h3>
                            {stock.holding === "Shortlist" && (
                              <span 
                                className="px-1.5 py-0.5 text-xs font-bold rounded"
                                style={{
                                  backgroundColor: "#f59e0b",
                                  color: "white",
                                  fontSize: "9px",
                                  opacity: 0.7
                                }}
                              >
                                ★
                              </span>
                            )}
                          </div>
                          <p className="text-sm opacity-75 truncate">{stock.company_name}</p>
                        </div>
                        <span
                          className="px-2.5 py-1 text-xs font-medium rounded-full flex-shrink-0"
                          style={{
                            backgroundColor: "var(--secondary)",
                            color: "var(--foreground)"
                          }}
                        >
                          {stock.exchange}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {stock.sector && (
                          <span
                            className="px-2.5 py-1 text-xs rounded-full"
                            style={{
                              backgroundColor: "var(--secondary)",
                              color: "var(--foreground)"
                            }}
                          >
                            {stock.sector}
                          </span>
                        )}
                        {stock.holding && stock.holding !== "Shortlist" && stock.holding !== "Holding" && (
                          <span
                            className={`px-3 py-1 text-xs rounded-full font-medium border ${
                              holdingColors[stock.holding] || "bg-gray-100"
                            }`}
                          >
                            {stock.holding}
                          </span>
                        )}
                        {stock.filter && (
                          <span
                            className="px-2.5 py-1 text-xs rounded-full"
                            style={{
                              backgroundColor: "var(--accent)",
                              color: "var(--foreground)"
                            }}
                          >
                            {stock.filter}
                          </span>
                        )}
                        {stock.final_status && (
                          <span
                            className={`px-3 py-1 text-xs rounded-full font-medium border ${
                              statusColors[stock.final_status] || "bg-gray-100"
                            }`}
                          >
                            {stock.final_status}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={(e) => handleDeleteClick(e, stock)}
                        className="p-2 rounded-lg transition opacity-0 group-hover:opacity-100 hover:bg-red-500/10"
                        title="Delete stock"
                      >
                        <Trash2 className="w-5 h-5 text-red-500" />
                      </button>
                      <ChevronRight className="w-5 h-5 opacity-30 flex-shrink-0" />
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className="rounded-lg w-full max-w-sm shadow-2xl"
            style={{
              backgroundColor: "var(--card)",
              borderColor: "var(--border)"
            }}
          >
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div 
                  className="p-3 rounded-full"
                  style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}
                >
                  <AlertCircle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Delete Stock?</h3>
                  <p className="text-sm opacity-75">
                    {stockToDelete?.symbol} - {stockToDelete?.company_name}
                  </p>
                </div>
              </div>

              <p className="text-sm opacity-75 mb-6">
                This action cannot be undone. All research data for this stock will be permanently deleted.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteDialog(false)}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 rounded-lg border-2 font-medium transition hover:opacity-80 disabled:opacity-50"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--foreground)"
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 rounded-lg font-medium transition hover:shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: "#ef4444",
                    color: "white"
                  }}
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Stock Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className="rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            style={{
              backgroundColor: "var(--card)",
              borderColor: "var(--border)"
            }}
          >
            {/* Modal Header */}
            <div
              className="flex items-center justify-between p-6 border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <h2 className="text-2xl font-bold">
                {showManualAddForm ? "Add Stock Manually" : "Add New Stock"}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowManualAddForm(false);
                }}
                disabled={addingStock}
                className="p-2 hover:opacity-70 transition disabled:opacity-50 rounded-lg"
                style={{ backgroundColor: "var(--background)" }}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {showManualAddForm ? (
                // Manual Add Form
                <form onSubmit={handleManualAddStock} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Company Name</label>
                    <input
                      type="text"
                      placeholder="e.g., Reliance Industries"
                      value={manualFormData.company_name}
                      onChange={(e) => setManualFormData({...manualFormData, company_name: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-lg border-2 outline-none transition focus:shadow-md"
                      style={{
                        borderColor: "var(--border)",
                        backgroundColor: "var(--background)",
                        color: "var(--foreground)"
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Exchange</label>
                    <select
                      value={manualFormData.exchange}
                      onChange={(e) => setManualFormData({...manualFormData, exchange: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-lg border-2 outline-none transition focus:shadow-md"
                      style={{
                        borderColor: "var(--border)",
                        backgroundColor: "var(--background)",
                        color: "var(--foreground)"
                      }}
                    >
                      <option value="NSE">NSE</option>
                      <option value="BSE">BSE</option>
                      <option value="NSEFO">NSEFO</option>
                      <option value="NSECD">NSECD</option>
                      <option value="MCXSX">MCXSX</option>
                      <option value="OTHER">OTHER</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">BSE Code</label>
                    <input
                      type="text"
                      placeholder="e.g., 500325"
                      value={manualFormData.bse_code}
                      onChange={(e) => setManualFormData({...manualFormData, bse_code: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-lg border-2 outline-none transition focus:shadow-md"
                      style={{
                        borderColor: "var(--border)",
                        backgroundColor: "var(--background)",
                        color: "var(--foreground)"
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">NSE Code</label>
                    <input
                      type="text"
                      placeholder="e.g., RELIANCE"
                      value={manualFormData.nse_code}
                      onChange={(e) => setManualFormData({...manualFormData, nse_code: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-lg border-2 outline-none transition focus:shadow-md"
                      style={{
                        borderColor: "var(--border)",
                        backgroundColor: "var(--background)",
                        color: "var(--foreground)"
                      }}
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowManualAddForm(false)}
                      disabled={addingStock}
                      className="flex-1 px-4 py-2.5 rounded-lg border-2 font-medium transition hover:opacity-80 disabled:opacity-50"
                      style={{
                        borderColor: "var(--border)",
                        color: "var(--foreground)"
                      }}
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={addingStock}
                      className="flex-1 px-4 py-2.5 rounded-lg font-medium transition hover:shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                      style={{
                        backgroundColor: "var(--primary)",
                        color: "var(--primary-foreground)"
                      }}
                    >
                      {addingStock ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          Add Stock
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                // Available Stocks List
                <>
                  {/* Search */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium mb-2">
                      Search Stocks
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 w-5 h-5 opacity-50" />
                      <input
                        type="text"
                        placeholder="Search by symbol or company name..."
                        value={searchAvailableInput}
                        onChange={(e) => setSearchAvailableInput(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border-2 outline-none transition focus:shadow-md"
                        style={{
                          borderColor: "var(--border)",
                          backgroundColor: "var(--background)",
                          color: "var(--foreground)"
                        }}
                      />
                    </div>
                  </div>

                  {loadingAvailable ? (
                    <div className="flex items-center justify-center py-16 opacity-50">
                      <Loader2 className="w-6 h-6 animate-spin mr-3" />
                      <span>Loading available stocks...</span>
                    </div>
                  ) : (
                    <>
                      {/* Stock List */}
                      <div className="space-y-2">
                        {filteredAvailableStocks.length === 0 ? (
                          <div className="text-center py-12 opacity-50">
                            <p className="mb-3">No stocks available</p>
                            <p className="text-sm mb-6">
                              {searchAvailableInput.trim() === ""
                                ? "All stocks may already be researched or no stocks found"
                                : "No stocks found matching your search. Try a different term."}
                            </p>
                            <button
                              onClick={() => setShowManualAddForm(true)}
                              className="px-4 py-2 rounded-lg font-medium transition hover:shadow-md inline-flex items-center gap-2"
                              style={{
                                backgroundColor: "var(--primary)",
                                color: "var(--primary-foreground)"
                              }}
                            >
                              <Plus className="w-4 h-4" />
                              Add Stock Manually
                            </button>
                          </div>
                        ) : (
                          <>
                            {filteredAvailableStocks.map(stock => (
                              <button
                                key={stock.id}
                                onClick={() => handleSelectStock(stock)}
                                disabled={addingStock}
                                className="w-full text-left p-4 rounded-lg border-2 transition hover:shadow-md disabled:opacity-50"
                                style={{
                                  borderColor: "var(--border)",
                                  backgroundColor: "var(--background)"
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <h3 className="font-bold">{stock.symbol}</h3>
                                    <p className="text-sm opacity-75 mb-1">{stock.company_name}</p>
                                    {stock.industry && (
                                      <p className="text-xs opacity-60 mb-1">{stock.industry}</p>
                                    )}
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs opacity-60" style={{ backgroundColor: "var(--secondary)", padding: "2px 6px", borderRadius: "4px" }}>
                                        {stock.exchange}
                                      </span>
                                    </div>
                                  </div>
                                  {addingStock ? (
                                    <Loader2 className="w-5 h-5 animate-spin opacity-50 flex-shrink-0 ml-3" />
                                  ) : (
                                    <Plus className="w-5 h-5 opacity-50 flex-shrink-0 ml-3" />
                                  )}
                                </div>
                              </button>
                            ))}
                          </>
                        )}
                      </div>
                      <div className="mt-6 pt-6 border-t" style={{ borderColor: "var(--border)" }}>
                        <p className="text-sm opacity-75 mb-3">Can't find the stock?</p>
                        <button
                          onClick={() => setShowManualAddForm(true)}
                          className="w-full px-4 py-2.5 rounded-lg font-medium transition hover:shadow-md flex items-center justify-center gap-2"
                          style={{
                            backgroundColor: "var(--secondary)",
                            color: "var(--foreground)"
                          }}
                        >
                          <Plus className="w-4 h-4" />
                          Add Stock Manually
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            {!showManualAddForm && (
              <div
                className="border-t p-6 flex justify-end gap-4"
                style={{ borderColor: "var(--border)" }}
              >
                <button
                  onClick={() => setShowAddModal(false)}
                  disabled={addingStock}
                  className="px-6 py-2 rounded-lg border-2 font-medium transition hover:opacity-80 disabled:opacity-50"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--foreground)"
                  }}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}