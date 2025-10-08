import db from "@/lib/db";

function calculateSimpleReturn(navStart, navEnd) {
  return ((navEnd - navStart) / navStart) * 100;
}

function calculateCAGR(navStart, navEnd, years) {
  return (Math.pow(navEnd / navStart, 1 / years) - 1) * 100;
}

function calculateDrawdown(
  navData,
  startDate = null,
  endDate = null,
  indexName = null
) {
  // Only output debug info for NIFTY METAL or if no specific index is provided
  const isTargetIndex = !indexName || indexName === "NIFTY METAL";
  const log = (...args) => {
    if (isTargetIndex) console.log(...args);
  };

  // Validate date inputs
  const validStartDate =
    startDate instanceof Date && !isNaN(startDate.getTime()) ? startDate : null;
  const validEndDate =
    endDate instanceof Date && !isNaN(endDate.getTime()) ? endDate : null;

  log(`----- DRAWDOWN CALCULATION ${indexName || ""} -----`);
  log(`Data points: ${navData?.length || 0}`);
  log(
    `Date range: ${validStartDate?.toISOString() || "all"} to ${
      validEndDate?.toISOString() || "all"
    }`
  );

  // Validate input data
  if (!navData || navData.length < 2) {
    log("Error: Insufficient data for drawdown calculation");
    return null;
  }

  // Filter data by date range if provided
  let filteredData = [...navData];
  if (validStartDate && validEndDate) {
    const startTime = validStartDate.getTime();
    const endTime = validEndDate.getTime();
    filteredData = filteredData.filter(
      (d) => d.date.getTime() >= startTime && d.date.getTime() <= endTime
    );
  }

  log(`Filtered data points: ${filteredData.length}`);

  if (filteredData.length < 2) {
    log("Error: Insufficient filtered data for drawdown calculation");
    return null;
  }

  // Sort data by date to ensure chronological order
  filteredData.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Validate NAV values
  const invalidNavs = filteredData.filter((d) => d.nav <= 0 || isNaN(d.nav));
  if (invalidNavs.length > 0) {
    log(
      "Warning: Invalid NAV values detected (zero, negative, or NaN):",
      invalidNavs
    );
    filteredData = filteredData.filter((d) => d.nav > 0 && !isNaN(d.nav));
    if (filteredData.length < 2) {
      log("Error: Insufficient valid data after removing invalid NAVs");
      return null;
    }
  }

  // Log first and last few data points for verification
  if (isTargetIndex) {
    log("===== FIRST 5 DATA POINTS =====");
    filteredData.slice(0, 5).forEach((entry) => {
      log(`Date: ${entry.date.toISOString()}, NAV: ${entry.nav}`);
    });

    log("===== LAST 5 DATA POINTS =====");
    filteredData.slice(-5).forEach((entry) => {
      log(`Date: ${entry.date.toISOString()}, NAV: ${entry.nav}`);
    });

    // Log full data range
    const earliestDate = filteredData[0].date;
    const latestDate = filteredData[filteredData.length - 1].date;
    const earliestNav = filteredData[0].nav;
    const latestNav = filteredData[filteredData.length - 1].nav;
    log(
      `Full range: ${earliestDate.toISOString()} (${earliestNav}) to ${latestDate.toISOString()} (${latestNav})`
    );
  }

  // Calculate drawdown
  let maxDrawdown = 0; // Most negative drawdown (in percentage)
  let maxDrawdownDate = null;
  let troughNav = null;
  let peakNav = filteredData[0].nav; // Initialize peak
  let peakDate = filteredData[0].date;

  log(`Initial peak: ${peakNav} on ${peakDate.toISOString()}`);

  // Track significant events for debugging
  const significantEvents = [];

  for (const entry of filteredData) {
    // Update peak if current NAV is higher
    if (entry.nav > peakNav) {
      significantEvents.push({
        type: "New Peak",
        date: entry.date,
        nav: entry.nav,
        prevPeak: peakNav,
        prevPeakDate: peakDate,
      });
      peakNav = entry.nav;
      peakDate = entry.date;
    }

    // Calculate drawdown as (current NAV / peak - 1) * 100
    const drawdown = (entry.nav / peakNav - 1) * 100;

    // Update max drawdown if current drawdown is more negative
    if (drawdown < maxDrawdown) {
      maxDrawdown = drawdown;
      maxDrawdownDate = entry.date;
      troughNav = entry.nav;

      significantEvents.push({
        type: "New Max Drawdown",
        date: entry.date,
        nav: entry.nav,
        peakNav: peakNav,
        peakDate: peakDate,
        drawdown: drawdown.toFixed(2) + "%",
      });
    }
  }

  // Log significant events
  if (isTargetIndex && significantEvents.length > 0) {
    log("===== SIGNIFICANT EVENTS =====");
    significantEvents.forEach((event) => {
      log(event);
    });
  }

  // Log final results
  log(`===== FINAL DRAWDOWN CALCULATION =====`);
  log(`Peak: ${peakNav} on ${peakDate.toISOString()}`);
  log(
    `Trough: ${troughNav || "N/A"} on ${
      maxDrawdownDate?.toISOString() || "N/A"
    }`
  );
  log(`Max Drawdown: ${maxDrawdown.toFixed(2)}%`);
  log(
    `Drawdown calculation: ((${
      troughNav || "N/A"
    } / ${peakNav}) - 1) * 100 = ${maxDrawdown.toFixed(2)}%`
  );

  // Return null if no drawdown was found (e.g., data is always increasing)
  if (maxDrawdown === 0 && !troughNav) {
    log("No drawdown detected (data may be strictly increasing)");
    return "0.00";
  }

  return maxDrawdown.toFixed(2);
}

function calculateCurrentDrawdown(navData, endDate = null, indexName = null) {
  // Only output debug info for NIFTY METAL or if no specific index is provided
  const isTargetIndex = !indexName || indexName === "NIFTY METAL";
  const log = (...args) => {
    if (isTargetIndex) console.log(...args);
  };

  // Validate endDate
  const validEndDate =
    endDate instanceof Date && !isNaN(endDate.getTime()) ? endDate : null;

  log(`----- CURRENT DRAWDOWN CALCULATION ${indexName || ""} -----`);
  log(`Data points: ${navData?.length || 0}`);
  log(`End date: ${validEndDate?.toISOString() || "latest"}`);

  // Validate input data
  if (!navData || navData.length < 1) {
    log("Error: No data for current drawdown calculation");
    return null;
  }

  // Sort data by date to ensure chronological order
  let filteredData = [...navData].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  // If endDate is provided, filter data up to endDate
  if (validEndDate) {
    const endTime = validEndDate.getTime();
    filteredData = filteredData.filter((d) => d.date.getTime() <= endTime);
  }

  // Fallback: If no data is available up to endDate, use the most recent data point
  if (filteredData.length < 1) {
    log(
      `Warning: No data available up to ${
        validEndDate?.toISOString() || "latest"
      }. Falling back to most recent data.`
    );
    filteredData = [...navData].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );
    if (filteredData.length < 1) {
      log("Error: No data available even after fallback");
      return null;
    }
  }

  // Validate NAV values
  const invalidNavs = filteredData.filter((d) => d.nav <= 0 || isNaN(d.nav));
  if (invalidNavs.length > 0) {
    log("Warning: Invalid NAV values detected:", invalidNavs);
    filteredData = filteredData.filter((d) => d.nav > 0 && !isNaN(d.nav));
    if (filteredData.length < 1) {
      log("Error: No valid data after removing invalid NAVs");
      return null;
    }
  }

  // Find the latest NAV
  const latestEntry = filteredData[filteredData.length - 1];
  const latestNav = latestEntry.nav;
  const latestDate = latestEntry.date;

  // Find the peak NAV up to the latest date
  let peakNav = latestNav;
  let peakDate = latestDate;
  for (const entry of filteredData) {
    if (entry.nav > peakNav) {
      peakNav = entry.nav;
      peakDate = entry.date;
    }
  }

  // Calculate current drawdown
  const currentDrawdown = (latestNav / peakNav - 1) * 100;

  log(`Latest NAV: ${latestNav} on ${latestDate.toISOString()}`);
  log(`Peak NAV: ${peakNav} on ${peakDate.toISOString()}`);
  log(`Current Drawdown: ${currentDrawdown.toFixed(2)}%`);
  log(
    `Calculation: ((${latestNav} / ${peakNav}) - 1) * 100 = ${currentDrawdown.toFixed(
      2
    )}%`
  );

  return currentDrawdown.toFixed(2);
}

// Improved function to find the closest trading day
function getLastTradingDay(date, validTradingDays, indexData) {
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);

  // Check up to 10 days back
  for (let i = 0; i < 10; i++) {
    const currentDate = new Date(checkDate);
    currentDate.setDate(checkDate.getDate() - i);

    // Skip weekends
    if (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
      continue;
    }

    // Check if the date is a trading day
    if (!validTradingDays.includes(currentDate.getTime())) {
      continue;
    }

    // Check if the index has data for this date
    const hasData = indexData.some(
      (d) => d.date.getTime() === currentDate.getTime()
    );
    if (hasData) {
      return currentDate;
    }
  }

  // Fallback: return the most recent date with data
  const sortedIndexDates = [...indexData].sort((a, b) => b.date - a.date);
  const latestIndexDate =
    sortedIndexDates.length > 0 ? sortedIndexDates[0].date : null;

  console.log(
    `Using fallback date: ${
      latestIndexDate ? latestIndexDate.toISOString() : "No data"
    }`
  );
  return latestIndexDate || checkDate;
}

// Improved function to find the nth trading day before a specified date
function findTradingDayBefore(
  date,
  validTradingDays,
  indexData,
  tradingDaysBack = 0
) {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  // Get all valid trading days with data, sorted in descending order
  const tradingDaysWithData = validTradingDays
    .filter(
      (day) =>
        day <= targetDate.getTime() &&
        indexData.some((d) => d.date.getTime() === day)
    )
    .sort((a, b) => b - a);

  // If no trading days back requested, just return the most recent one
  if (tradingDaysBack === 0) {
    return tradingDaysWithData.length > 0
      ? new Date(tradingDaysWithData[0])
      : null;
  }

  // Important: We need to adjust the offset by 1 since the first entry (index 0)
  // corresponds to the most recent trading day, not the current date
  const adjustedOffset = tradingDaysBack - 1;

  // Get the nth trading day back (adjusted offset)
  if (tradingDaysWithData.length > adjustedOffset && adjustedOffset >= 0) {
    return new Date(tradingDaysWithData[adjustedOffset]);
  }

  // Fallback if we don't have enough data
  console.log(
    `Warning: Not enough trading days with data to go back ${tradingDaysBack} days from ${targetDate.toISOString()}`
  );
  return tradingDaysWithData.length > 0
    ? new Date(tradingDaysWithData[tradingDaysWithData.length - 1])
    : null;
}

export async function POST(req) {
  try {
    // --- Body ---
    let body = {};
    try {
      body = await req.json();
    } catch {
      body = {}; // no body provided
    }
    const {
      startDate: rawStartDate,
      endDate: rawEndDate,
      indices,
    } = body || {};

    // --- Query params ---
    const { searchParams } = new URL(req.url);
    const downloadNav = searchParams.get("downloadNav");

    console.log("Received:", {
      rawStartDate,
      rawEndDate,
      indices,
      downloadNav,
    });

    let startDate = rawStartDate ? new Date(rawStartDate) : null;
    if (startDate && isNaN(startDate.getTime())) startDate = null;

    let endDate = rawEndDate ? new Date(rawEndDate) : null;
    if (endDate && isNaN(endDate.getTime())) endDate = null;

    // Fetch all unique indexes
    const indexQuery = `SELECT DISTINCT indices FROM tblresearch_new`;
    const { rows: indexRows } = await db.query(indexQuery);
    const allIndices = indexRows.map((row) => row.indices);

    // Fetch data for all indexes
    const dataQuery = `
      SELECT indices, nav, date
      FROM tblresearch_new
      ORDER BY indices, date ASC
    `;
    const { rows } = await db.query(dataQuery);

    const groupedData = rows.reduce((acc, row) => {
      const nav = parseFloat(row.nav);
      if (nav > 0 && !isNaN(nav)) {
        if (!acc[row.indices]) acc[row.indices] = [];
        acc[row.indices].push({
          date: new Date(row.date),
          nav,
        });
      }
      return acc;
    }, {});

    const niftyData = groupedData["NIFTY 50"] || [];
    const validTradingDays = niftyData
      .map((d) => d.date.getTime())
      .sort((a, b) => a - b);

    // ✅ If downloadNav is requested
    if (downloadNav === "true") {
      const navData = {};
      const targetIndices =
        Array.isArray(indices) && indices.length > 0 ? indices : allIndices;
      for (const index of targetIndices) {
        if (!allIndices.includes(index)) continue;
        const indexData = groupedData[index] || [];
        const latestDate = getLastTradingDay(
          endDate || new Date(),
          validTradingDays,
          indexData
        );
        let navEntries = indexData;
        if (startDate && endDate) {
          const startTime = startDate.getTime();
          const endTime = latestDate.getTime();
          navEntries = navEntries.filter(
            (d) => d.date.getTime() >= startTime && d.date.getTime() <= endTime
          );
        } else {
          navEntries = navEntries.filter(
            (d) => d.date.getTime() <= latestDate.getTime()
          );
        }
        navData[index] = navEntries.map((entry) => ({
          date: entry.date.toISOString().split("T")[0],
          nav: entry.nav,
        }));
      }
      const latestNavDate = new Date(
        Math.max(
          ...Object.values(navData).flatMap((data) =>
            data.map((d) => new Date(d.date).getTime())
          )
        )
      );
      return Response.json(
        { data: navData, dataAsOf: latestNavDate.toISOString() },
        { status: 200 }
      );
    }
    // Define periods for returns calculation
    const periods = {
      "1D": { days: 1, useCAGR: false, useTradingDays: true },
      "2D": { days: 2, useCAGR: false, useTradingDays: true },
      "3D": { days: 3, useCAGR: false, useTradingDays: true },
      "1W": { days: 7, useCAGR: false, useTradingDays: true },
      "1M": { months: 1, useCAGR: false, useTradingDays: false },
      "3M": { months: 3, useCAGR: false, useTradingDays: false },
      "6M": { months: 6, useCAGR: false, useTradingDays: false },
      "9M": { months: 9, useCAGR: false, useTradingDays: false },
      "1Y": { years: 1, useCAGR: true, useTradingDays: false },
      "2Y": { years: 2, useCAGR: true, useTradingDays: false },
      "3Y": { years: 3, useCAGR: true, useTradingDays: false },
      "4Y": { years: 4, useCAGR: true, useTradingDays: false },
      "5Y": { years: 5, useCAGR: true, useTradingDays: false },
    };

    const qodeStrategyIndices = ["QAW", "QTF", "QGF-ORBIS", "QFH", "QGF"];
    const results = {};

    for (const index of allIndices) {
      results[index] = {};
      const indexData = groupedData[index] || [];
      const isQodeStrategy = qodeStrategyIndices.includes(index);

      // Calculate MDD and Current Drawdown
      const mdd = calculateDrawdown(indexData, startDate, endDate, index);
      const currentDrawdown = calculateCurrentDrawdown(
        indexData,
        endDate,
        index
      );
      results[index]["MDD"] = mdd;
      results[index]["Drawdown"] = currentDrawdown;

      // Determine latest trading day
      const latestDate = getLastTradingDay(
        endDate || new Date(),
        validTradingDays,
        indexData
      );

      // Calculate Since Inception
      const earliestEntry = indexData[0];
      const latestEntryForInception =
        indexData.find((d) => d.date.getTime() === latestDate.getTime()) ||
        indexData.reduce((closest, current) => {
          if (current.date > latestDate) return closest;
          if (!closest || current.date > closest.date) return current;
          return closest;
        }, null);

      if (earliestEntry && latestEntryForInception) {
        const yearsSinceInception =
          (latestEntryForInception.date - earliestEntry.date) /
          (1000 * 60 * 60 * 24 * 365);
        if (yearsSinceInception > 0) {
          results[index]["Since Inception"] = calculateCAGR(
            earliestEntry.nav,
            latestEntryForInception.nav,
            yearsSinceInception
          ).toFixed(2);
        } else {
          results[index]["Since Inception"] = null;
        }
      } else {
        results[index]["Since Inception"] = null;
      }

      // Find latest entry for returns
      let latestEntry = indexData.find(
        (d) => d.date.getTime() === latestDate.getTime()
      );

      if (!latestEntry) {
        const sortedData = [...indexData].sort((a, b) => b.date - a.date);
        latestEntry = sortedData.length > 0 ? sortedData[0] : null;
        console.log(
          `Using fallback entry for ${index}: ${
            latestEntry ? latestEntry.date.toISOString() : "No data"
          }`
        );
      }

      if (!latestEntry) {
        console.log(
          `No data for ${index} on or before ${latestDate.toISOString()}`
        );
        for (const period of Object.keys(periods)) {
          results[index][period] = null;
        }
        continue;
      }

      // Short-period returns calculation (1D, 2D, 3D, 1W)
      // Short-period returns calculation code section (partial)
      // Short-period returns calculation code section (partial)
      for (const [period, periodDef] of Object.entries(periods)) {
        // MODIFICATION: Apply trading day logic to ALL indices for short-term periods
        if (periodDef.useTradingDays && periodDef.days <= 7) {
          // FIXED: Correct trading days offset for different periods
          // For April 28, 2025 (Monday):
          // For 1D we want April 25 (Friday)
          // For 2D we want April 24 (Thursday)
          // For 3D we want April 23 (Wednesday)
          // For 1W we want 5 trading days back
          let tradingDaysBack;
          if (period === "1W") {
            tradingDaysBack = 5;
          } else if (period === "1D") {
            tradingDaysBack = 1; // First previous trading day
          } else if (period === "2D") {
            tradingDaysBack = 2; // Second previous trading day
          } else if (period === "3D") {
            tradingDaysBack = 3; // Third previous trading day
          } else {
            tradingDaysBack = parseInt(period.charAt(0));
          }

          // Use valid trading days for short-term calculations
          const targetDate = findTradingDayBefore(
            latestDate,
            validTradingDays,
            indexData,
            tradingDaysBack
          );

          if (targetDate) {
            const startEntry = indexData.find(
              (d) => d.date.getTime() === targetDate.getTime()
            );

            if (startEntry && latestEntry) {
              const returnValue = calculateSimpleReturn(
                startEntry.nav,
                latestEntry.nav
              ).toFixed(2);
              results[index][period] = returnValue;

              // Enhanced debug logging for short-term returns
              console.log(
                `${index} ${period} return: ${returnValue}% [Trading days back: ${tradingDaysBack}] (${
                  startEntry.date.toISOString().split("T")[0]
                } ${startEntry.nav} -> ${
                  latestEntry.date.toISOString().split("T")[0]
                } ${latestEntry.nav})`
              );
            } else {
              results[index][period] = null;
              console.log(
                `${index} ${period}: No start entry found for date ${targetDate?.toISOString()}`
              );
            }
          } else {
            results[index][period] = null;
            console.log(
              `${index} ${period}: No valid trading day found ${tradingDaysBack} trading days before ${latestDate.toISOString()}`
            );
          }
        } else {
          // Regular calculation for longer periods
          let targetDate;

          if (periodDef.days) {
            targetDate = new Date(
              Date.UTC(
                latestDate.getUTCFullYear(),
                latestDate.getUTCMonth(),
                latestDate.getUTCDate() - periodDef.days
              )
            );
          } else if (periodDef.months) {
            targetDate = new Date(
              Date.UTC(
                latestDate.getUTCFullYear(),
                latestDate.getUTCMonth() - periodDef.months,
                latestDate.getUTCDate()
              )
            );
          } else if (periodDef.years) {
            targetDate = new Date(
              Date.UTC(
                latestDate.getUTCFullYear() - periodDef.years,
                latestDate.getUTCMonth(),
                latestDate.getUTCDate()
              )
            );
          }

          const startEntry =
            indexData.find((d) => d.date.getTime() === targetDate.getTime()) ||
            indexData.reduce((closest, current) => {
              if (current.date > targetDate) return closest;
              if (!closest || current.date > closest.date) return current;
              return closest;
            }, null);

          if (startEntry && latestEntry) {
            let returnValue;
            if (periodDef.useCAGR) {
              returnValue = calculateCAGR(
                startEntry.nav,
                latestEntry.nav,
                periodDef.years
              ).toFixed(2);
            } else {
              returnValue = calculateSimpleReturn(
                startEntry.nav,
                latestEntry.nav
              ).toFixed(2);
            }
            results[index][period] = returnValue;
          } else {
            results[index][period] = null;
          }
        }
      }
    }

    // Custom date range calculations
    if (startDate && endDate) {
      const start = startDate;
      const end = endDate;
      const yearsDiff = (end - start) / (1000 * 60 * 60 * 24 * 365);
      const useCAGR = yearsDiff >= 1;
      const isShortPeriod = end - start <= 7 * 24 * 60 * 60 * 1000;

      for (const index of allIndices) {
        const indexData = groupedData[index] || [];

        const startUTC = new Date(
          Date.UTC(
            start.getUTCFullYear(),
            start.getUTCMonth(),
            start.getUTCDate()
          )
        );

        const endUTC = new Date(
          Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate())
        );

        let startEntry, endEntry;

        // MODIFICATION: Apply trading day logic to ALL indices for short periods
        if (isShortPeriod) {
          // For short periods, use trading days for all indices
          const startTradingDay = findTradingDayBefore(
            startUTC,
            validTradingDays,
            indexData,
            0
          );
          const endTradingDay = findTradingDayBefore(
            endUTC,
            validTradingDays,
            indexData,
            0
          );

          if (startTradingDay && endTradingDay) {
            startEntry = indexData.find(
              (d) => d.date.getTime() === startTradingDay.getTime()
            );
            endEntry = indexData.find(
              (d) => d.date.getTime() === endTradingDay.getTime()
            );

            console.log(
              `${index} CDR using trading days: ${startTradingDay.toISOString()} -> ${endTradingDay.toISOString()}`
            );
          }
        } else {
          startEntry = findClosestEntry(indexData, startUTC, "before");
          endEntry = findClosestEntry(indexData, endUTC, "before");
        }

        if (startEntry && endEntry) {
          let returnValue;
          if (useCAGR) {
            returnValue = calculateCAGR(
              startEntry.nav,
              endEntry.nav,
              yearsDiff
            ).toFixed(2);
          } else {
            returnValue = calculateSimpleReturn(
              startEntry.nav,
              endEntry.nav
            ).toFixed(2);
          }
          const cdrMdd = calculateDrawdown(
            indexData,
            startEntry.date,
            endEntry.date,
            index
          );

          results[index]["CDR"] = returnValue;
          results[index]["CDR_MDD"] = cdrMdd;

          // Debug logging for short period calculations
          if (isShortPeriod) {
            console.log(
              `${index} CDR: ${returnValue}% (${startEntry.date.toISOString()} ${
                startEntry.nav
              } -> ${endEntry.date.toISOString()} ${endEntry.nav})`
            );
          }
        } else {
          results[index]["CDR"] = null;
          results[index]["CDR_MDD"] = null;

          if (isShortPeriod) {
            console.log(
              `${index} CDR: No valid entries found for custom date range`
            );
          }
        }
      }
    }

    function findClosestEntry(indexData, targetDate, direction = "before") {
      if (!indexData || indexData.length === 0) return null;

      const targetTime = targetDate.getTime();

      if (direction === "before") {
        return (
          indexData
            .filter((entry) => entry.date.getTime() <= targetTime)
            .sort((a, b) => b.date.getTime() - a.date.getTime())[0] || null
        );
      } else {
        return (
          indexData
            .filter((entry) => entry.date.getTime() >= targetTime)
            .sort((a, b) => a.date.getTime() - b.date.getTime())[0] || null
        );
      }
    }

    return Response.json(
      { data: results, dataAsOf: new Date().toISOString() },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching index returns:", error);
    return Response.json(
      { message: "Error fetching index returns", error: error.message },
      { status: 500 }
    );
  }
}