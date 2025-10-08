"use client";
import React, { useState, useCallback } from "react";
import PropTypes from "prop-types";
import moment from "moment";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import PortfolioCalculatorForm from "./PortfolioCalculatorForm";

const PortfolioManager = ({portfolios, setPortfolios, onSubmit, loading = false, columns = [] }) => {
  
  const [activeKey, setActiveKey] = useState("Portfolio-1");
  const [globalError, setGlobalError] = useState("");
  const [customFile, setCustomFile] = useState(null);
  const [customColumns, setCustomColumns] = useState([]);
  const [fileLoading, setFileLoading] = useState(false);

  const handleFileUpload = (file) => {
    setFileLoading(true);
    setCustomFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csvData = event.target.result;
        const lines = csvData.split("\n").filter((line) => line.trim() !== "");

        if (lines.length === 0) {
          setGlobalError("CSV file is empty");
          setFileLoading(false);
          return;
        }

        const headers = lines[0].split(",").map((header) => {
          const trimmedHeader = header.trim();
          return trimmedHeader.toLowerCase() === "date"
            ? "date"
            : trimmedHeader.charAt(0).toUpperCase() +
                trimmedHeader.slice(1).toLowerCase();
        });

        if (!headers.includes("date")) {
          setGlobalError("CSV must contain a 'date' column");
          setFileLoading(false);
          return;
        }

        const newColumns = headers.filter((h) => h !== "date");
        setCustomColumns(newColumns);
      } catch (error) {
        setGlobalError("Error processing CSV file");
        console.error("CSV processing error:", error);
      } finally {
        setFileLoading(false);
      }
    };

    reader.onerror = () => {
      setGlobalError("Error reading file");
      setFileLoading(false);
    };

    reader.readAsText(file);
  };

  const handleClearFile = () => {
    setCustomFile(null);
    setCustomColumns([]);
    setGlobalError("");
  };

  const handleColumnsUpdate = useCallback((newColumns) => {
    setCustomColumns((prevColumns) => {
      return [...new Set([...prevColumns, ...newColumns])];
    });
  }, []);

  const getAllColumns = useCallback(() => {
    return [...new Set([...columns, ...customColumns])];
  }, [columns, customColumns]);

  const handleSelect = (key) => {
    if (key === "add-portfolio") {
      handleAddPortfolio();
    } else {
      setActiveKey(key);
    }
  };

  const handlePortfolioChange = useCallback((index, updatedPortfolio) => {
    setPortfolios((prevPortfolios) => {
      const newPortfolios = [...prevPortfolios];
      newPortfolios[index] = {
        ...newPortfolios[index],
        ...updatedPortfolio,
      };

      if (index === 0) {
        const { start_date, end_date } = updatedPortfolio;
        newPortfolios.forEach((portfolio, pIndex) => {
          if (pIndex !== 0) {
            newPortfolios[pIndex].start_date = start_date;
            newPortfolios[pIndex].end_date = end_date;
          }
        });
      }
      return newPortfolios;
    });
  }, []);

  const handleAddPortfolio = useCallback(() => {
    const newIndex = portfolios.length + 1;
    const newPortfolio = {
      id: Date.now(),
      name: `Portfolio ${newIndex}`,
      start_date: portfolios[0].start_date,
      end_date: portfolios[0].end_date,
      invest_amount: "",
      cash_percent: "",
      frequency: "yearly",
      selected_systems: [],
      selected_debtfunds: [],
      benchmark: "",
      error: "",
    };
    setPortfolios((prev) => [...prev, newPortfolio]);
  }, [portfolios]);

  const handleRemovePortfolio = useCallback(
    (indexToRemove) => {
      setPortfolios((prevPortfolios) => {
        if (prevPortfolios.length === 1) return prevPortfolios;
        const currentTabNumber = parseInt(activeKey.split("-")[1]);
        if (indexToRemove === currentTabNumber - 1) {
          setActiveKey(`Portfolio-${currentTabNumber - 1}`);
        }
        return prevPortfolios.filter((_, index) => index !== indexToRemove);
      });
    },
    [activeKey]
  );

  const validatePortfolios = useCallback(() => {
    let isValid = true;
    setPortfolios((prev) =>
      prev.map((portfolio) => {
        let error = "";
        const totalWeightage = [...portfolio.selected_systems].reduce(
          (sum, item) => sum + (parseFloat(item.weightage) || 0),
          0
        );
        if (Math.abs(totalWeightage - 100) > 0.1) {
          error = "Weightages must sum to 100%.";
          isValid = false;
        }
        return { ...portfolio, error };
      })
    );
    return isValid;
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setGlobalError("");

      if (!validatePortfolios()) {
        setGlobalError("Please fix the errors before submitting.");
        return;
      }

      try {
        const formData = new FormData();
        const portfoliosData = portfolios.map((portfolio) => ({
          name: portfolio.name,
          start_date: portfolio.start_date
            ? moment(portfolio.start_date).format("DD-MM-YYYY")
            : null,
          end_date: portfolio.end_date
            ? moment(portfolio.end_date).format("DD-MM-YYYY")
            : null,
          invest_amount: parseFloat(portfolio.invest_amount),
          cash_percent: portfolio.cash_percent
            ? parseFloat(portfolio.cash_percent)
            : 0,
          frequency: portfolio.frequency,
          benchmark: portfolio.benchmark,
          selected_systems: portfolio.selected_systems.map((system) => ({
            system: system.system,
            weightage: parseFloat(system.weightage) || 0,
            leverage: parseFloat(system.leverage) || 1,
          })),
          selected_debtfunds: portfolio.selected_debtfunds.map((debtfund) => ({
            debtfund: debtfund.debtfund,
            weightage: parseFloat(debtfund.weightage) || 0,
            leverage: parseFloat(debtfund.leverage) || 1,
          })),
        }));
        formData.append("portfolios", JSON.stringify(portfoliosData));
        if (customFile) formData.append("custom_file", customFile);
        await onSubmit(formData);
      } catch (err) {
        console.error("Submit error:", err);
        setGlobalError("Failed to submit portfolios. Please try again.");
      }
    },
    [portfolios, customFile, onSubmit, validatePortfolios]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {globalError && (
        <Alert variant="destructive">
          <AlertDescription>{globalError}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label>Upload Custom Strategy CSV (Applies to all portfolios)</Label>
        <div className="flex items-center gap-2 ">
          <Input
            type="file"
            accept=".csv"
            className="file:bg-primary file:text-white file:border-0 file:rounded file:px-4 bg-background pl-1 file:mr-2"
            onChange={(e) =>
              e.target.files[0] && handleFileUpload(e.target.files[0])
            }
            disabled={fileLoading}
          />
          {customFile && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleClearFile}
              disabled={fileLoading}
            >
              Clear
            </Button>
          )}
        </div>
        {customFile && (
          <p className="text-sm text-muted-foreground">
            Selected file: {customFile.name}
          </p>
        )}
        {fileLoading && (
          <p className="text-xs text-muted-foreground">Processing file...</p>
        )}
      </div>

      <Tabs value={activeKey} onValueChange={handleSelect} className="w-full">
        <TabsList className="flex flex-wrap gap-2">
          {portfolios.map((portfolio, index) => (
            <TabsTrigger
              key={portfolio.id}
              value={`Portfolio-${index + 1}`}
              className="px-4 py-2 h-auto"
            >
              {portfolio.name || `Portfolio ${index + 1}`}
            </TabsTrigger>
          ))}
          <div className="">
            <Button type="button" className="px-4 py-2 h-auto" onClick={handleAddPortfolio} variant="outline">
              + Add Portfolio
            </Button>
          </div>
        </TabsList>

        {portfolios.map((portfolio, index) => (
          <TabsContent
            key={portfolio.id}
            value={`Portfolio-${index + 1}`}
            className="mt-4"
          >
            <PortfolioCalculatorForm
              index={index}
              portfolioData={{
                ...portfolio,
                benchmark:
                  index === 0 ? portfolio.benchmark : portfolios[0].benchmark,
              }}
              onChange={handlePortfolioChange}
              onRemove={handleRemovePortfolio}
              columns={getAllColumns()}
              isRemoveDisabled={portfolios.length === 1}
              isFirstPortfolio={index === 0}
              isBenchmarkDisabled={index !== 0}
              masterStartDate={portfolios[0].start_date}
              masterEndDate={portfolios[0].end_date}
              customColumns={customColumns}
            />
          </TabsContent>
        ))}
      </Tabs>

      <div className="flex justify-end">
        <Button type="submit" className="bg-primary text-[color:var(--background)]" variant="default" disabled={loading}>
          {loading ? "Calculating..." : "Calculate All Portfolios"}
        </Button>
      </div>
    </form>
  );
};

PortfolioManager.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  columns: PropTypes.array,
};

PortfolioManager.defaultProps = {
  loading: false,
  columns: [],
};

export default PortfolioManager;
