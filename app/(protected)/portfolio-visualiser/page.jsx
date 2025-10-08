"use client";
import React, { useState } from "react";
import PortfolioManager from "@/components/PortfolioManager";
import CombinedPortfolioResults from "@/components/PortfolioResult";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

const API_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://calculator.qodeinvest.com"
    : "http://localhost:5080";

const PortfolioIndex = () => {
  const [portfolios, setPortfolios] = useState([
    {
      id: Date.now(),
      name: "Portfolio 1",
      start_date: null,
      end_date: null,
      invest_amount: "",
      cash_percent: "",
      frequency: "yearly",
      selected_systems: [],
      selected_debtfunds: [],
      benchmark: "",
      error: "",
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [submissionResult, setSubmissionResult] = useState("");
  const [submissionError, setSubmissionError] = useState("");
  const [resultData, setResultData] = useState([]);
  const [activeTab, setActiveTab] = useState("input");

  const handleFormSubmit = async (formData) => {
    try {
      setLoading(true);
      setSubmissionResult("");
      setSubmissionError("");

      const response = await fetch(`${API_BASE_URL}/api/portfolio/compare`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to submit portfolios");
      }

      const results = await response.json();
      setResultData(results.results || results);
      setSubmissionResult("Portfolios calculated successfully!");
      setActiveTab("results");
    } catch (error) {
      console.error("Submission error:", error);
      setSubmissionError(
        error.message || "An error occurred while submitting portfolios"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">
        Portfolio Calculator
      </h1>

      {process.env.NODE_ENV !== "production" && (
        <Alert className="mb-4 border border-sidebar-ring">
          <AlertDescription>
            Running in development mode - Using API: {API_BASE_URL}
          </AlertDescription>
        </Alert>
      )}

      {submissionResult && (
        <Alert className="mb-4 border-green-600 text-green-700 bg-green-50">
          <AlertDescription>{submissionResult}</AlertDescription>
        </Alert>
      )}

      {submissionError && (
        <Alert className="mb-4 border-red-600 text-red-700 bg-red-50">
          <AlertDescription>{submissionError}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-primary">
          <TabsTrigger
            value="input"
            className="data-[state=active]:text-[color:var(--primary)] 
               data-[state=inactive]:text-[color:var(--background)]"
          >
            Portfolio Input
          </TabsTrigger>
          <TabsTrigger
            value="results"
            disabled={!resultData || resultData.length === 0}
            className="data-[state=active]:text-[color:var(--primary)] 
               data-[state=inactive]:text-[color:var(--background)]"
          >
            Results
          </TabsTrigger>
        </TabsList>

        <TabsContent value="input">
          <PortfolioManager
            onSubmit={handleFormSubmit}
            portfolios={portfolios}
            setPortfolios={setPortfolios}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="results">
          {resultData && resultData.length > 0 && (
            <CombinedPortfolioResults
              portfolios={resultData}
              apiBaseUrl={API_BASE_URL}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PortfolioIndex;
