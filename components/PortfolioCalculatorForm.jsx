"use client";
import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import PropTypes from "prop-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import allIndicesGroups from "@/utils/allIndicesGroups";
import { Check } from "lucide-react";

function flattenIndices(groups) {
  return Object.entries(groups).flatMap(([group, values]) =>
    values.map(value => ({
      label: value.replace(/-/g, ' '),
      value,
      group
    }))
  );
}

const flattenedList = flattenIndices(allIndicesGroups);
const STRATEGIES = flattenedList;
const DEBTFUNDS = flattenedList;

function DatePickerField({ date, onChange, placeholder, disabled = false }) {
  return (
    <div className="relative w-full">
      <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <DatePicker
        selected={date}
        onChange={onChange}
        placeholderText={placeholder}
        dateFormat="dd-MM-yyyy"
        disabled={disabled}
        className={cn(
          "w-full h-10 pl-9 pr-3 border rounded-md text-sm",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
          "transition-colors duration-200",
          disabled && "bg-muted text-muted-foreground cursor-not-allowed"
        )}
      />
    </div>
  );
}

// -------------------- MultiSelect --------------------
function MultiSelect({ options, selectedValues, onChange, placeholder }) {
  const [open, setOpen] = useState(false);

  const handleSelect = (value) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((v) => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const handleRemove = (value) => {
    onChange(selectedValues.filter((v) => v !== value));
  };

  const selectedOptions = options.filter((o) => selectedValues.includes(o.value));

  return (
    <Popover open={open} onOpenChange={setOpen} className="w-full">
      <PopoverTrigger asChild className="w-full">
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-10 font-normal min-h-[40px]"
        >
          <span className="flex flex-wrap gap-1 items-center w-full">
            {selectedOptions.length > 0 ? (
              selectedOptions.map((opt) => (
                <span
                  key={opt.value}
                  className="flex items-center gap-1 px-2 py-0.5 bg-muted/70 rounded border border-border text-xs font-medium truncate"
                  style={{ width: 'auto', maxWidth: '100%' }}
                  title={opt.label}
                >
                  <span>{opt.label}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(opt.value);
                    }}
                    className="text-muted-foreground hover:text-destructive font-bold text-sm ml-1"
                  >
                    ×
                  </button>
                </span>
              ))
            ) : (
              <span className="truncate text-muted-foreground">{placeholder || "Select..."}</span>
            )}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search..." className="h-9" />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            {Object.entries(
              options.reduce((acc, option) => {
                acc[option.group || "Other"] = [
                  ...(acc[option.group || "Other"] || []),
                  option,
                ];
                return acc;
              }, {})
            ).map(([group, items]) => (
              <CommandGroup key={group} heading={group}>
                {items.map((item) => (
                  <CommandItem
                    key={item.value}
                    onSelect={() => handleSelect(item.value)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedValues.includes(item.value)
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    {item.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// -------------------- BenchmarkSelect --------------------
function BenchmarkSelect({ value, onChange, placeholder = "Select benchmark", options, disabled = false }) {
  const [open, setOpen] = useState(false);

  const selectedLabel = options.find((o) => o.value === value)?.label || "";

  const handleSelect = (val) => {
    onChange(val);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen} className="w-full">
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-10 font-normal"
          disabled={disabled}
        >
          <span className="truncate">{selectedLabel || placeholder}</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search benchmark..." className="h-9" />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            {Object.entries(
              options.reduce((acc, option) => {
                acc[option.group || "Other"] = [...(acc[option.group || "Other"] || []), option];
                return acc;
              }, {})
            ).map(([group, items]) => (
              <CommandGroup key={group} heading={group}>
                {items.map((item) => (
                  <CommandItem key={item.value} onSelect={() => handleSelect(item.value)}>
                    <Check className={cn("mr-2 h-4 w-4", value === item.value ? "opacity-100" : "opacity-0")} />
                    {item.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// -------------------- PortfolioCalculatorForm --------------------
const PortfolioCalculatorForm = ({
  index,
  portfolioData = {},
  onChange,
  onRemove,
  columns = [],
  isRemoveDisabled = false,
  isFirstPortfolio = false,
  masterStartDate = null,
  masterEndDate = null,
  isBenchmarkDisabled = false,
  customColumns = [],
}) => {
  const handleInputChange = (field, value) => {
    if (field === "invest_amount") {
      const rawValue = value.replace(/,/g, "");
      if (!isNaN(rawValue) || rawValue === "") {
        onChange(index, { ...portfolioData, [field]: rawValue });
      }
    } else {
      onChange(index, { ...portfolioData, [field]: value });
    }
  };

  const combinedStrategies = [
    ...STRATEGIES,
    ...customColumns.map((c) => ({
      label: c.trim(),
      value: c.trim(),
      group: "Custom Columns",
      isJsonColumn: true,
    })),
  ];

  const combinedDebtFunds = [
    ...DEBTFUNDS,
    ...customColumns.map((c) => ({
      label: c.trim(),
      value: c.trim(),
      group: "Custom Columns",
      isJsonColumn: true,
    })),
  ];

  // FIXED: Moved handleMultiSelectChange inside the component
  const handleMultiSelectChange = (type, newSelected) => {
    const weight = newSelected.length ? 100 / newSelected.length : 0;

    if (type === "selected_systems") {
      const updatedSystems = newSelected.map((val) => ({
        system: val,
        weightage: parseFloat(weight.toFixed(6)),
        leverage: "1",
        column: "",
      }));
      onChange(index, {
        ...portfolioData,
        selected_systems: updatedSystems,
      });
    } else if (type === "selected_debtfunds") {
      const updatedDebtFunds = newSelected.map((val) => ({
        debtfund: val,
        weightage: parseFloat(weight.toFixed(6)),
        leverage: "1",
      }));
      onChange(index, {
        ...portfolioData,
        selected_debtfunds: updatedDebtFunds,
      });
    }
  };

  const handleClearBenchmark = () => {
    onChange(index, { ...portfolioData, benchmark: null });
  };

  const handleSystemInputChange = (systemIndex, field, value) => {
    const updatedSystems = [...(portfolioData.selected_systems || [])];
    if (field === "weightage") {
      let newWeight = parseFloat(value);
      if (isNaN(newWeight)) newWeight = 0;
      newWeight = Math.min(Math.max(newWeight, 0), 100);
      updatedSystems[systemIndex] = {
        ...updatedSystems[systemIndex],
        weightage: newWeight,
      };
    } else {
      updatedSystems[systemIndex] = {
        ...updatedSystems[systemIndex],
        [field]: value,
      };
    }
    onChange(index, { ...portfolioData, selected_systems: updatedSystems });
  };

  const handleDebtFundInputChange = (debtFundIndex, field, value) => {
    const updatedDebtFunds = [...(portfolioData.selected_debtfunds || [])];
    if (field === "weightage") {
      let newWeight = parseFloat(value);
      if (isNaN(newWeight)) newWeight = 0;
      newWeight = Math.min(Math.max(newWeight, 0), 100);
      updatedDebtFunds[debtFundIndex] = {
        ...updatedDebtFunds[debtFundIndex],
        weightage: newWeight,
      };
    } else {
      updatedDebtFunds[debtFundIndex] = {
        ...updatedDebtFunds[debtFundIndex],
        [field]: value,
      };
    }
    onChange(index, { ...portfolioData, selected_debtfunds: updatedDebtFunds });
  };

  const frequencies = [
    { name: "No Rebalance", value: "no" },
    { name: "Daily", value: "daily" },
    { name: "Weekly", value: "weekly" },
    { name: "Monthly", value: "monthly" },
    { name: "Yearly", value: "yearly" },
  ];

  const benchmarkOptions = STRATEGIES.filter(
    (strategy) => strategy.group === "Index"
  );

  const totalStrategiesWeight = (portfolioData.selected_systems || [])
    .reduce((sum, system) => sum + (parseFloat(system.weightage) || 0), 0)
    .toFixed(6);

  const totalDebtFundsWeight = (portfolioData.selected_debtfunds || [])
    .reduce((sum, fund) => sum + (parseFloat(fund.weightage) || 0), 0)
    .toFixed(6);

  return (
    <div className="border border-border rounded-lg p-4 sm:p-6 space-y-4 sm:space-y-6 bg-card shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h5 className="text-lg font-semibold text-foreground">
          {portfolioData.name ||
            `Portfolio ${portfolioData.portfolioNumber || index + 1}`}
        </h5>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onRemove(index)}
          disabled={isRemoveDisabled || index === 0}
          className="w-full sm:w-auto bg-[#550e0e]  hover:bg-[#6a1818] "
        >
          {index === 0
            ? "Cannot Remove First"
            : isRemoveDisabled
            ? "Cannot Remove"
            : "Remove"}
        </Button>
      </div>

      {/* Errors */}
      {portfolioData.error && (
        <Alert variant="destructive">
          <AlertDescription>{portfolioData.error}</AlertDescription>
        </Alert>
      )}

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor={`name-${index}`} className="text-sm font-medium">
          Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id={`name-${index}`}
          type="text"
          value={portfolioData.name || ""}
          onChange={(e) => handleInputChange("name", e.target.value)}
          placeholder="Enter portfolio name"
          required
          className="h-10"
        />
      </div>

      {/* Strategies */}
      <div className="space-y-2">
        <div className="flex justify-between items-center w-full">
          <Label className="text-sm font-medium">
            Choose Strategies <span className="text-destructive">*</span>
          </Label>
          <Button
            variant="destructive"
            size="sm"
            onClick={() =>
              onChange(index, { ...portfolioData, selected_systems: [] })
            }
            disabled={!portfolioData.selected_systems?.length}
            className="w-full sm:w-auto bg-[#550e0e]  hover:bg-[#6a1818] "
          >
            Clear All
          </Button>
        </div>

        <MultiSelect
          options={combinedStrategies}
          selectedValues={(portfolioData.selected_systems || []).map(
            (s) => s.system
          )}
          onChange={(newSelected) => handleMultiSelectChange("selected_systems", newSelected)}
          placeholder="Select strategies"
        />

        {portfolioData.selected_systems?.map((system, sIndex) => (
          <div
            key={sIndex}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 p-3 bg-muted/50 rounded-md"
          >
            <div className="flex items-center">
              <Label className="text-sm font-medium truncate">
                {system.system}
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.000001"
                value={system.weightage || ""}
                onChange={(e) =>
                  handleSystemInputChange(sIndex, "weightage", e.target.value)
                }
                placeholder="Weightage"
                className="h-9"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="Leverage"
              value={system.leverage || ""}
              onChange={(e) =>
                handleSystemInputChange(sIndex, "leverage", e.target.value)
              }
              className="h-9"
            />
          </div>
        ))}
        {portfolioData.selected_systems?.length > 0 && (
          <Alert>
            <AlertDescription className="text-sm">
              Total strategies weightage:{" "}
              <span className="font-semibold">{totalStrategiesWeight}%</span>
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Debt Funds */}
      <div className="space-y-2">
        <div className="flex justify-between items-center w-full">
          <Label className="text-sm font-medium">Choose Debt Funds</Label>
          <Button
            variant="destructive"
            size="sm"
            onClick={() =>
              onChange(index, { ...portfolioData, selected_debtfunds: [] })
            }
            disabled={!portfolioData.selected_debtfunds?.length}
            className="w-full sm:w-auto bg-[#550e0e]  hover:bg-[#6a1818] "
          >
            Clear All
          </Button>
        </div>
        <MultiSelect
          options={combinedDebtFunds}
          selectedValues={(portfolioData.selected_debtfunds || []).map(
            (d) => d.debtfund
          )}
          onChange={(newSelected) => handleMultiSelectChange("selected_debtfunds", newSelected)}
          placeholder="Select debt funds"
        />

        {portfolioData.selected_debtfunds?.map((fund, dIndex) => (
          <div
            key={dIndex}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 p-3 bg-muted/50 rounded-md"
          >
            <div className="flex items-center">
              <Label className="text-sm font-medium truncate">
                {fund.debtfund}
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.000001"
                value={fund.weightage || ""}
                onChange={(e) =>
                  handleDebtFundInputChange(dIndex, "weightage", e.target.value)
                }
                placeholder="Weightage"
                className="h-9"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="Leverage"
              value={fund.leverage || ""}
              onChange={(e) =>
                handleDebtFundInputChange(dIndex, "leverage", e.target.value)
              }
              className="h-9"
            />
          </div>
        ))}
        {portfolioData.selected_debtfunds?.length > 0 && (
          <Alert>
            <AlertDescription className="text-sm">
              Total debt funds weightage:{" "}
              <span className="font-semibold">{totalDebtFundsWeight}%</span>
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Benchmark */}
      <div className="space-y-2 w-full">
        <div className="flex justify-between items-center w-full">
          <Label className="text-sm font-medium">Benchmark</Label>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleClearBenchmark}
            disabled={!portfolioData.benchmark?.length || index !== 0}
            className="w-full sm:w-auto bg-[#550e0e]  hover:bg-[#6a1818] "
          >
            Clear
          </Button>
        </div>
        <BenchmarkSelect
          value={portfolioData.benchmark || ""}
          onChange={(val) => handleInputChange("benchmark", val)}
          options={Array.isArray(flattenedList) ? flattenedList : []}
          disabled={isBenchmarkDisabled}
        />
      </div>

      {/* Investment Period */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Investment Period <span className="text-destructive">*</span>
        </Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DatePickerField
            date={isFirstPortfolio ? portfolioData.start_date : masterStartDate}
            onChange={(date) =>
              isFirstPortfolio && handleInputChange("start_date", date)
            }
            placeholder="Start Date"
            disabled={!isFirstPortfolio}
          />
          <DatePickerField
            date={isFirstPortfolio ? portfolioData.end_date : masterEndDate}
            onChange={(date) =>
              isFirstPortfolio && handleInputChange("end_date", date)
            }
            placeholder="End Date"
            disabled={!isFirstPortfolio}
          />
        </div>
      </div>

      {/* Investment Amount */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Investment Amount</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">₹</span>
            <Input
              type="text"
              value={
                portfolioData.invest_amount
                  ? new Intl.NumberFormat("en-IN").format(
                      portfolioData.invest_amount
                    )
                  : ""
              }
              onChange={(e) =>
                handleInputChange("invest_amount", e.target.value)
              }
              placeholder="Investment Amount"
              className="h-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0"
              max="100"
              value={portfolioData.cash_percent || ""}
              onChange={(e) =>
                handleInputChange("cash_percent", e.target.value)
              }
              placeholder="Cash %"
              className="h-10"
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
        </div>
      </div>

      {/* Rebalance Frequency */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Rebalance Frequency <span className="text-destructive">*</span>
        </Label>
        <ToggleGroup
          type="single"
          value={portfolioData.frequency}
          onValueChange={(val) => handleInputChange("frequency", val)}
          className="flex w-full flex-wrap justify-start gap-2"
        >
          {frequencies.map((freq) => (
            <ToggleGroupItem
              key={freq.value}
              value={freq.value}
              aria-label={freq.name}
              className={`
        px-3 py-1.5 text-sm rounded-md border border-border
        data-[state=on]:bg-primary data-[state=on]:text-primary-foreground
        hover:bg-secondary hover:text-secondary-foreground
        transition-colors
      `}
            >
              {freq.name}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </div>
  );
};

// -------------------- PropTypes --------------------
PortfolioCalculatorForm.propTypes = {
  index: PropTypes.number.isRequired,
  portfolioData: PropTypes.shape({
    name: PropTypes.string,
    selected_systems: PropTypes.array,
    selected_debtfunds: PropTypes.array,
    benchmark: PropTypes.string,
    start_date: PropTypes.instanceOf(Date),
    end_date: PropTypes.instanceOf(Date),
    invest_amount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    cash_percent: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    frequency: PropTypes.string,
    error: PropTypes.string,
    portfolioNumber: PropTypes.number,
  }),
  onChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  columns: PropTypes.array,
  isRemoveDisabled: PropTypes.bool,
  isFirstPortfolio: PropTypes.bool,
  masterStartDate: PropTypes.instanceOf(Date),
  masterEndDate: PropTypes.instanceOf(Date),
  isBenchmarkDisabled: PropTypes.bool,
  customColumns: PropTypes.array,
};

PortfolioCalculatorForm.defaultProps = {
  portfolioData: {},
  columns: [],
  isRemoveDisabled: false,
  isFirstPortfolio: false,
  masterStartDate: null,
  masterEndDate: null,
  isBenchmarkDisabled: false,
  customColumns: [],
};

export default PortfolioCalculatorForm;