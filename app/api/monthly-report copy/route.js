///api/monthlu-report.jsimport { calculateDrawdown, calculateMDD, calculateReturns } from "utils/calculateReturnsMonthlyReport";
import db from "@/lib/db";

export default async function handler(req, res) {
  // Destructure startDate, endDate, year and month from the request body
  let { startDate, endDate, year, month } = req.body;
  const qodeStrategyIndices = ['QAW', 'QTF', 'QGF-ORBIS', 'QFH', 'QGF'];

  // Calculate date boundaries if year and month are provided
  let upperLimit = null;
  let currentDate = new Date(); // Get current date
  const isCurrentMonth = year == currentDate.getFullYear() && month == (currentDate.getMonth() + 1);

  if (year && month) {
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    let lastDay;
    switch (monthNum) {
      case 1:
      case 3:
      case 5:
      case 7:
      case 8:
      case 10:
      case 12:
        lastDay = 31;
        break;
      case 4:
      case 6:
      case 9:
      case 11:
        lastDay = 30;
        break;
      case 2:
        lastDay = (yearNum % 4 === 0 && (yearNum % 100 !== 0 || yearNum % 400 === 0)) ? 29 : 28;
        break;
      default:
        lastDay = 31;
    }
    if (isCurrentMonth) {
      upperLimit = currentDate;
      lastDay = currentDate.getDate();
    } else {
      // Set upperLimit to the last day of the month at 23:59:59
      upperLimit = new Date(yearNum, monthNum - 1, lastDay, 23, 59, 59);
    }
    const limitStr = upperLimit.toISOString().split('T')[0];
    if (endDate) {
      if (new Date(endDate) > upperLimit) {
        endDate = limitStr;
      }
    } else {
      endDate = limitStr;
    }
    // For a current-month calculation, set startDate to the first day
    if (isCurrentMonth) {
      startDate = new Date(yearNum, monthNum - 1, 1).toISOString().split('T')[0];
    }
  }

  try {
    // -----------------------------------------------
    // 1. Query CSV Data from pms_monthly_reports
    // -----------------------------------------------
    let csvDataResults = {};
    if (year && month) {
      const csvDataQuery = `
        SELECT *
        FROM public.pms_monthly_reports
        WHERE year = $1 AND month = $2
      `;
      const csvResult = await db.query(csvDataQuery, [year, month]);
      if (csvResult.rows.length > 0) {
        csvResult.rows.forEach(row => {
          // Use pms_name (or "group") as the index name; fallback to "Unknown"
          const indexName = row.pms_name || row["group"] || "Unknown";
          csvDataResults[indexName] = {
            group: row["group"] || row["Group"] || "Unknown",
            "1M": { value: row["1M"] != null ? row["1M"].toString() : '-', date: '' },
            "3M": { value: row["3M"] != null ? row["3M"].toString() : '-', date: '' },
            "6M": { value: row["6M"] != null ? row["6M"].toString() : '-', date: '' },
            "1Y": { value: row["1Y"] != null ? row["1Y"].toString() : '-', date: '' },
            "2Y": { value: row["2Y"] != null ? row["2Y"].toString() : '-', date: '' },
            "3Y": { value: row["3Y"] != null ? row["3Y"].toString() : '-', date: '' },
            "4Y": { value: row["4Y"] != null ? row["4Y"].toString() : '-', date: '' },
            "5Y": { value: row["5Y"] != null ? row["5Y"].toString() : '-', date: '' },
            "Since Inception": { value: row["Since Inception"] != null ? row["Since Inception"].toString() : '-', date: '' },
            "Drawdown": '-', // Optionally compute these
            "MDD": '-'
          };
        });
      }
    }

    // -----------------------------------------------
    // 2. Query tblresearch_new Data & Compute Returns
    // -----------------------------------------------
    const niftyDaysQuery = `
      SELECT DISTINCT date 
      FROM tblresearch_new 
      WHERE indices = 'NIFTY 50'
      ${upperLimit ? `AND date <= '${upperLimit.toISOString().split('T')[0]}'` : ''}
      ORDER BY date ASC
    `;
    const query = `
      SELECT indices, nav, date
      FROM tblresearch_new
      ${upperLimit ? `WHERE date <= '${upperLimit.toISOString().split('T')[0]}'` : ''}
      ORDER BY indices, date ASC
    `;

    const { rows: niftyDays } = await db.query(niftyDaysQuery);

    const { rows } = await db.query(query);

    const validTradingDays = new Set(niftyDays.map(row => new Date(row.date).toISOString().split('T')[0]));

    // Filter and group data by indices
    const groupedData = rows.reduce((acc, row) => {
      const index = row.indices;
      if (!acc[index]) {
        acc[index] = [];
      }

      const dateStr = new Date(row.date).toISOString().split('T')[0];

      if (qodeStrategyIndices.includes(index)) {
        // For Qode strategies, include all dates (already weekend-adjusted)
        acc[index].push(row);
      } else {
        // For non-Qode strategies, only use valid trading days
        if (validTradingDays.has(dateStr)) {
          acc[index].push(row);
        }
      }
      return acc;
    }, {});

    // Handle custom date range if provided
    let customDateResults = {};
    if (startDate && endDate) {
      // For each index, individually process custom date range
      const indices = Object.keys(groupedData);

      for (const index of indices) {
        // For Qode strategies, find the closest valid trading day before or on the start date
        let adjustedStartDate = startDate;
        let adjustedEndDate = endDate;

        if (qodeStrategyIndices.includes(index)) {
          // Find closest valid trading day on or before start date
          const validDays = Array.from(validTradingDays)
            .filter(day => new Date(day) <= new Date(startDate))
            .sort((a, b) => new Date(b) - new Date(a));

          if (validDays.length > 0) {
            adjustedStartDate = validDays[0];
          }

          // Find closest valid trading day on or before end date
          const validEndDays = Array.from(validTradingDays)
            .filter(day => new Date(day) <= new Date(endDate))
            .sort((a, b) => new Date(b) - new Date(a));

          if (validEndDays.length > 0) {
            adjustedEndDate = validEndDays[0];
          }
        }

        // Add one day to the endDate for calculations
        const endDatePlus1 = new Date(adjustedEndDate);
        endDatePlus1.setDate(endDatePlus1.getDate() + 1);
        const endDatePlus1Str = endDatePlus1.toISOString().split('T')[0];

        const customDateQuery = `
          SELECT t1.indices, t1.nav as start_nav, t1.date as start_date, 
                 t2.nav as end_nav, t2.date as end_date
          FROM (
              SELECT indices, nav, date
              FROM tblresearch_new
              WHERE date = (
                  SELECT MAX(date)
                  FROM tblresearch_new
                  WHERE date <= $1
                  AND indices = $3
                  ${upperLimit ? `AND date <= '${upperLimit.toISOString().split('T')[0]}'` : ''}
              )
              AND indices = $3
          ) t1
          JOIN (
              SELECT indices, nav, date
              FROM tblresearch_new
              WHERE date = (
                  SELECT MAX(date)
                  FROM tblresearch_new
                  WHERE date <= $2
                  AND indices = $3
                  ${upperLimit ? `AND date <= '${upperLimit.toISOString().split('T')[0]}'` : ''}
              )
              AND indices = $3
          ) t2 ON t1.indices = t2.indices
        `;

        // Use endDatePlus1Str instead of adjustedEndDate
        const { rows: customDateRow } = await db.query(customDateQuery, [adjustedStartDate, endDatePlus1Str, index]);
        
        if (customDateRow.length > 0 && qodeStrategyIndices.includes(index)) {
          const row = customDateRow[0];
          console.log(`Qode Strategy ${index} - Start NAV: ${row.start_nav} (${new Date(row.start_date).toISOString().split('T')[0]}) - End NAV: ${row.end_nav} (${new Date(row.end_date).toISOString().split('T')[0]})`);
        }
        if (customDateRow.length > 0) {
          const row = customDateRow[0];
          const startDateStr = new Date(row.start_date).toISOString().split('T')[0];
          const endDateStr = new Date(row.end_date).toISOString().split('T')[0];

          // Additional validation for Qode strategies
          if (qodeStrategyIndices.includes(index) &&
            (!validTradingDays.has(startDateStr) || !validTradingDays.has(endDateStr))) {
            customDateResults[index] = { value: '-', date: null };
            continue;
          }

          // Ensure start_date is not after end_date
          if (new Date(row.start_date) > new Date(row.end_date)) {
            customDateResults[index] = { value: '-', date: null };
            continue;
          }

          const timeDiff = new Date(row.end_date) - new Date(row.start_date);
          const yearDiff = timeDiff / (1000 * 60 * 60 * 24 * 365.25);

          let returnValue;
          if (yearDiff <= 1) {
            returnValue = ((row.end_nav - row.start_nav) / row.start_nav * 100).toFixed(2);
          } else {
            returnValue = ((Math.pow(row.end_nav / row.start_nav, 1 / yearDiff) - 1) * 100).toFixed(2);
          }

          customDateResults[index] = { value: returnValue, date: startDateStr };
        } else {
          customDateResults[index] = { value: '-', date: null };
        }
      }
    }

    // Calculate returns for standard periods - Add an extra day to each period
    const tblResults = {};
    for (const [index, data] of Object.entries(groupedData)) {
      const shouldApplyTradingDayValidation = !qodeStrategyIndices.includes(index);
      const tradingDaysToUse = shouldApplyTradingDayValidation ? validTradingDays : null;
      
      // Add an extra day to each period by passing a 'true' flag as the last parameter
      tblResults[index] = {
        '1D': calculateReturns(data, '1D', tradingDaysToUse, upperLimit, index, true),
        '2D': calculateReturns(data, '2D', tradingDaysToUse, upperLimit, index, true),
        '3D': calculateReturns(data, '3D', tradingDaysToUse, upperLimit, index, true),
        '10D': calculateReturns(data, '10D', tradingDaysToUse, upperLimit, index, true),
        '1W': calculateReturns(data, '1W', tradingDaysToUse, upperLimit, index, true),
        '1M': calculateReturns(data, '1M', tradingDaysToUse, upperLimit, index, true),
        '3M': calculateReturns(data, '3M', tradingDaysToUse, upperLimit, index, true),
        '6M': calculateReturns(data, '6M', tradingDaysToUse, upperLimit, index, true),
        '9M': calculateReturns(data, '9M', tradingDaysToUse, upperLimit, index, true),
        '1Y': calculateReturns(data, '1Y', tradingDaysToUse, upperLimit, index, true),
        '2Y': calculateReturns(data, '2Y', tradingDaysToUse, upperLimit, index, true),
        '3Y': calculateReturns(data, '3Y', tradingDaysToUse, upperLimit, index, true),
        '4Y': calculateReturns(data, '4Y', tradingDaysToUse, upperLimit, index, true),
        '5Y': calculateReturns(data, '5Y', tradingDaysToUse, upperLimit, index, true),
        'Since Inception': calculateReturns(data, 'Since Inception', tradingDaysToUse, upperLimit, index, true),
        'Drawdown': calculateDrawdown(data),
        'MDD': calculateMDD(data)
      };

      // Add custom date range returns if available
      if (customDateResults[index]) {
        tblResults[index]['CDR'] = customDateResults[index];
      } else if (startDate && endDate) {
        tblResults[index]['CDR'] = { value: '-', date: null };
      }
    }

    // Additional validation for custom date range data
    if (startDate && endDate) {
      for (const [index, data] of Object.entries(groupedData)) {
        // Skip if already set to '-'
        if (tblResults[index]['CDR'].value === '-') continue;

        // Add one day to endDate for filtering
        const endDatePlus1 = new Date(endDate);
        endDatePlus1.setDate(endDatePlus1.getDate() + 1);
        const endDatePlus1Str = endDatePlus1.toISOString().split('T')[0];

        // Filter data to only include points within date range and valid trading days
        const customDateData = data.filter(row => {
          const rowDate = new Date(row.date);
          const dateStr = rowDate.toISOString().split('T')[0];
          const isWithinRange = rowDate >= new Date(startDate) && rowDate <= endDatePlus1;
          const isValidTradingDay = !qodeStrategyIndices.includes(index) || validTradingDays.has(dateStr);
          return isWithinRange && isValidTradingDay;
        });

        const timeDiff = endDatePlus1 - new Date(startDate);
        const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

        // Add validation requirements
        if (qodeStrategyIndices.includes(index)) {
          let validDaysInRange = 0;
          for (const dateStr of validTradingDays) {
            const date = new Date(dateStr);
            if (date >= new Date(startDate) && date <= endDatePlus1) {
              validDaysInRange++;
            }
          }
          const requiredPoints = Math.floor(validDaysInRange * 0.8);
          if (customDateData.length < requiredPoints) {
            tblResults[index]['CDR'] = { value: '-', date: null };
          }
        } else {
          const requiredPoints = Math.floor(daysDiff * 0.8);
          const minimumPoints = Math.floor(requiredPoints * 0.8);
          if (customDateData.length < minimumPoints) {
            tblResults[index]['CDR'] = { value: '-', date: null };
          }
        }

        // Calculate custom date MDD
        if (customDateData.length >= 2) {
          tblResults[index]['CDR_MDD'] = calculateMDD(customDateData);
        } else {
          tblResults[index]['CDR_MDD'] = '-';
        }
      }
    }

    let calculationDates = null;
    if (year && month) {
      const calcStart = niftyDays.length > 0 ? new Date(niftyDays[0].date).toISOString().split('T')[0] : null;
      calculationDates = {
        start: startDate || calcStart,
        end: upperLimit.toISOString().split('T')[0]
      };
    }

    res.status(200).json({
      upperLimit,
      tblresearchData: tblResults,
      csvData: csvDataResults,
      calculationDates
    });
  } catch (error) {
    console.error('Error fetching index returns:', error);
    res.status(500).json({ message: 'Error fetching index returns', error: error.message });
  }
}