import db from "@/lib/db";

// Helper functions remain the same
function calculateSimpleReturn(navStart, navEnd) {
  return ((navEnd - navStart) / navStart) * 100;
}

function calculateCAGR(navStart, navEnd, years) {
  return (Math.pow(navEnd / navStart, 1 / years) - 1) * 100;
}

function calculateDrawdown(navData, startDate = null, endDate = null) {
  if (!navData || navData.length < 2) return null;

  let filteredData = [...navData];
  if (startDate && endDate) {
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();
    filteredData = filteredData.filter(
      (d) => d.date.getTime() >= startTime && d.date.getTime() <= endTime
    );
  }

  if (filteredData.length < 2) return null;
  
  filteredData = filteredData.filter((d) => d.nav > 0 && !isNaN(d.nav));
  if (filteredData.length < 2) return null;

  let maxDrawdown = 0;
  let peakNav = filteredData[0].nav;

  for (const entry of filteredData) {
    if (entry.nav > peakNav) {
      peakNav = entry.nav;
    }
    const drawdown = (entry.nav / peakNav - 1) * 100;
    if (drawdown < maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  return maxDrawdown === 0 ? "0.00" : maxDrawdown.toFixed(2);
}

function calculateCurrentDrawdown(navData, endDate = null) {
  if (!navData || navData.length < 1) return null;

  let filteredData = [...navData].sort((a, b) => a.date.getTime() - b.date.getTime());
  
  if (endDate) {
    const endTime = endDate.getTime();
    filteredData = filteredData.filter((d) => d.date.getTime() <= endTime);
  }

  if (filteredData.length < 1) return null;
  
  filteredData = filteredData.filter((d) => d.nav > 0 && !isNaN(d.nav));
  if (filteredData.length < 1) return null;

  const latestEntry = filteredData[filteredData.length - 1];
  const latestNav = latestEntry.nav;

  let peakNav = latestNav;
  for (const entry of filteredData) {
    if (entry.nav > peakNav) {
      peakNav = entry.nav;
    }
  }

  const currentDrawdown = (latestNav / peakNav - 1) * 100;
  return currentDrawdown.toFixed(2);
}

export async function POST(req) {
  try {
    const startTime = Date.now();
    
    // Parse request
    let body = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const { startDate: rawStartDate, endDate: rawEndDate, indices } = body || {};
    const { searchParams } = new URL(req.url);
    const downloadNav = searchParams.get("downloadNav");

    let startDate = rawStartDate ? new Date(rawStartDate) : null;
    if (startDate && isNaN(startDate.getTime())) startDate = null;

    let endDate = rawEndDate ? new Date(rawEndDate) : null;
    if (endDate && isNaN(endDate.getTime())) endDate = null;

    // **OPTIMIZATION 1: Parallel queries with specific date filtering**
    const [indexResult, dataResult] = await Promise.all([
      db.query(`SELECT DISTINCT indices FROM tblresearch_new`),
      db.query(`
        SELECT indices, nav, date
        FROM tblresearch_new
        ${startDate && endDate ? `WHERE date >= $1 AND date <= $2` : ''}
        ORDER BY indices, date ASC
      `, startDate && endDate ? [startDate, endDate] : [])
    ]);

    const allIndices = indexResult.rows.map((row) => row.indices);
    
    // **OPTIMIZATION 2: Single-pass data grouping with pre-filtering**
    const groupedData = {};
    const niftyData = [];
    
    for (const row of dataResult.rows) {
      const nav = parseFloat(row.nav);
      if (nav > 0 && !isNaN(nav)) {
        const entry = { date: new Date(row.date), nav };
        
        if (!groupedData[row.indices]) {
          groupedData[row.indices] = [];
        }
        groupedData[row.indices].push(entry);
        
        if (row.indices === "NIFTY 50") {
          niftyData.push(entry);
        }
      }
    }

    // **OPTIMIZATION 3: Pre-compute trading days Set for O(1) lookup**
    const validTradingDaysSet = new Set(niftyData.map((d) => d.date.getTime()));
    const validTradingDays = Array.from(validTradingDaysSet).sort((a, b) => a - b);

    console.log(`Data loaded in ${Date.now() - startTime}ms`);

    // Handle downloadNav request
    if (downloadNav === "true") {
      const navData = {};
      const targetIndices = Array.isArray(indices) && indices.length > 0 ? indices : allIndices;
      let maxTimestamp = 0;
      
      for (const index of targetIndices) {
        if (!allIndices.includes(index)) continue;
        const indexData = groupedData[index] || [];
        
        navData[index] = indexData.map((entry) => {
          const timestamp = entry.date.getTime();
          if (timestamp > maxTimestamp) maxTimestamp = timestamp;
          
          return {
            date: entry.date.toISOString().split("T")[0],
            nav: entry.nav,
          };
        });
      }
      
      const latestNavDate = maxTimestamp > 0 ? new Date(maxTimestamp) : new Date();
      
      return Response.json(
        { data: navData, dataAsOf: latestNavDate.toISOString() },
        { status: 200 }
      );
    }

    // **OPTIMIZATION 4: Pre-compute common values**
    const currentDate = endDate || new Date();
    const latestTradingDate = findLatestTradingDay(currentDate, validTradingDays);
    
    // Period definitions
    const periods = {
      "1D": { days: 1, useCAGR: false, tradingDaysBack: 1 },
      "2D": { days: 2, useCAGR: false, tradingDaysBack: 2 },
      "3D": { days: 3, useCAGR: false, tradingDaysBack: 3 },
      "1W": { days: 7, useCAGR: false, tradingDaysBack: 5 },
      "1M": { months: 1, useCAGR: false },
      "3M": { months: 3, useCAGR: false },
      "6M": { months: 6, useCAGR: false },
      "9M": { months: 9, useCAGR: false },
      "1Y": { years: 1, useCAGR: true },
      "2Y": { years: 2, useCAGR: true },
      "3Y": { years: 3, useCAGR: true },
      "4Y": { years: 4, useCAGR: true },
      "5Y": { years: 5, useCAGR: true },
    };

    const results = {};

    // **OPTIMIZATION 5: Process all indices in parallel batches**
    const batchSize = 20;
    for (let i = 0; i < allIndices.length; i += batchSize) {
      const batch = allIndices.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (index) => {
        results[index] = {};
        const indexData = groupedData[index] || [];
        
        if (indexData.length === 0) {
          Object.keys(periods).forEach(p => results[index][p] = null);
          results[index]["MDD"] = null;
          results[index]["Drawdown"] = null;
          results[index]["Since Inception"] = null;
          return;
        }

        // **OPTIMIZATION 6: Pre-sort and index data once**
        const sortedData = indexData.sort((a, b) => a.date.getTime() - b.date.getTime());
        const dataByTimestamp = new Map(sortedData.map(d => [d.date.getTime(), d]));
        
        const earliestEntry = sortedData[0];
        const latestEntry = findClosestEntry(sortedData, latestTradingDate, "before") || sortedData[sortedData.length - 1];

        // Calculate MDD and Drawdown
        results[index]["MDD"] = calculateDrawdown(sortedData, startDate, endDate);
        results[index]["Drawdown"] = calculateCurrentDrawdown(sortedData, endDate);

        // Since Inception
        if (earliestEntry && latestEntry) {
          const yearsSinceInception = (latestEntry.date - earliestEntry.date) / (1000 * 60 * 60 * 24 * 365);
          results[index]["Since Inception"] = yearsSinceInception > 0
            ? calculateCAGR(earliestEntry.nav, latestEntry.nav, yearsSinceInception).toFixed(2)
            : null;
        } else {
          results[index]["Since Inception"] = null;
        }

        // **OPTIMIZATION 7: Calculate all periods in single loop**
        for (const [period, periodDef] of Object.entries(periods)) {
          let targetDate;
          let startEntry = null;

          if (periodDef.tradingDaysBack) {
            // Short-term trading day calculations
            targetDate = findTradingDayBefore(latestTradingDate, validTradingDays, periodDef.tradingDaysBack);
            if (targetDate) {
              startEntry = dataByTimestamp.get(targetDate.getTime()) || 
                          findClosestEntry(sortedData, targetDate, "before");
            }
          } else {
            // Longer-term calculations
            if (periodDef.days) {
              targetDate = new Date(latestTradingDate);
              targetDate.setDate(targetDate.getDate() - periodDef.days);
            } else if (periodDef.months) {
              targetDate = new Date(latestTradingDate);
              targetDate.setMonth(targetDate.getMonth() - periodDef.months);
            } else if (periodDef.years) {
              targetDate = new Date(latestTradingDate);
              targetDate.setFullYear(targetDate.getFullYear() - periodDef.years);
            }
            
            startEntry = dataByTimestamp.get(targetDate.getTime()) || 
                        findClosestEntry(sortedData, targetDate, "before");
          }

          if (startEntry && latestEntry) {
            results[index][period] = periodDef.useCAGR
              ? calculateCAGR(startEntry.nav, latestEntry.nav, periodDef.years).toFixed(2)
              : calculateSimpleReturn(startEntry.nav, latestEntry.nav).toFixed(2);
          } else {
            results[index][period] = null;
          }
        }

        // Custom date range
        if (startDate && endDate) {
          const yearsDiff = (endDate - startDate) / (1000 * 60 * 60 * 24 * 365);
          const useCAGR = yearsDiff >= 1;
          const isShortPeriod = endDate - startDate <= 7 * 24 * 60 * 60 * 1000;

          let startEntry, endEntry;

          if (isShortPeriod) {
            const startTradingDay = findTradingDayBefore(startDate, validTradingDays, 0);
            const endTradingDay = findTradingDayBefore(endDate, validTradingDays, 0);
            
            if (startTradingDay && endTradingDay) {
              startEntry = dataByTimestamp.get(startTradingDay.getTime()) || 
                          findClosestEntry(sortedData, startTradingDay, "before");
              endEntry = dataByTimestamp.get(endTradingDay.getTime()) || 
                        findClosestEntry(sortedData, endTradingDay, "before");
            }
          } else {
            startEntry = findClosestEntry(sortedData, startDate, "before");
            endEntry = findClosestEntry(sortedData, endDate, "before");
          }

          if (startEntry && endEntry) {
            results[index]["CDR"] = useCAGR
              ? calculateCAGR(startEntry.nav, endEntry.nav, yearsDiff).toFixed(2)
              : calculateSimpleReturn(startEntry.nav, endEntry.nav).toFixed(2);
            results[index]["CDR_MDD"] = calculateDrawdown(sortedData, startEntry.date, endEntry.date);
          } else {
            results[index]["CDR"] = null;
            results[index]["CDR_MDD"] = null;
          }
        }
      }));
    }

    console.log(`Total processing time: ${Date.now() - startTime}ms`);

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

// **OPTIMIZATION 8: Simplified helper functions with binary search**
function findLatestTradingDay(date, validTradingDays) {
  const targetTime = date.getTime();
  let left = 0, right = validTradingDays.length - 1;
  let result = validTradingDays[right];

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (validTradingDays[mid] <= targetTime) {
      result = validTradingDays[mid];
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return new Date(result);
}

function findTradingDayBefore(date, validTradingDays, tradingDaysBack) {
  const targetTime = date.getTime();
  const filteredDays = validTradingDays.filter(d => d <= targetTime);
  
  if (filteredDays.length === 0) return null;
  
  const index = filteredDays.length - 1 - tradingDaysBack;
  return index >= 0 ? new Date(filteredDays[index]) : null;
}

function findClosestEntry(sortedData, targetDate, direction = "before") {
  if (!sortedData || sortedData.length === 0) return null;

  const targetTime = targetDate.getTime();
  
  // Binary search for efficiency
  let left = 0, right = sortedData.length - 1;
  
  if (direction === "before") {
    let result = null;
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (sortedData[mid].date.getTime() <= targetTime) {
        result = sortedData[mid];
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    return result;
  } else {
    let result = null;
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (sortedData[mid].date.getTime() >= targetTime) {
        result = sortedData[mid];
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }
    return result;
  }
}