// utils/calculateTrailingReturns.js

/**
 * Calculates trailing returns for specified periods.
 * @param {Array} equityData - Array of equity curve data with date and value.
 * @param {Array} periods - Array of periods to calculate (e.g., '10d', '1w', '1m', etc.).
 * @returns {Object} - Object with period keys and corresponding returns.
 */
export const calculateTrailingReturns = (equityData, periods) => {
    const returns = {};
  
    // Convert equityData to a sorted array by date ascending
    const sortedData = [...equityData].sort((a, b) => new Date(a.date) - new Date(b.date));
  
    // Create a map for quick date-based lookup
    const dateMap = new Map();
    sortedData.forEach(entry => {
      dateMap.set(new Date(entry.date).setHours(0,0,0,0), entry.value);
    });
  
    // Helper function to calculate return
    const getReturn = (startDate, endDate) => {
      const start = dateMap.get(startDate);
      const end = dateMap.get(endDate);
      if (start === undefined || end === undefined || start === 0) return null;
      return ((end / start - 1) * 100).toFixed(2);
    };
  
    // Current date based on the latest equity data
    const latestDate = new Date(sortedData[sortedData.length - 1].date);
  
    periods.forEach(period => {
      let pastDate = new Date(latestDate); // Clone latestDate
  
      switch (period) {
        case '10d':
          pastDate.setDate(pastDate.getDate() - 10);
          break;
        case '1w':
          pastDate.setDate(pastDate.getDate() - 7);
          break;
        case '1m':
          pastDate.setMonth(pastDate.getMonth() - 1);
          break;
        case '3m':
          pastDate.setMonth(pastDate.getMonth() - 3);
          break;
        case '6m':
          pastDate.setMonth(pastDate.getMonth() - 6);
          break;
        case '1y':
          pastDate.setFullYear(pastDate.getFullYear() - 1);
          break;
        case '3y':
          pastDate.setFullYear(pastDate.getFullYear() - 3);
          break;
        case '5y':
          pastDate.setFullYear(pastDate.getFullYear() - 5);
          break;
        default:
          return;
      }
  
      // Normalize dates to remove time component
      pastDate = new Date(pastDate.setHours(0,0,0,0)).getTime();
      const latest = new Date(latestDate.setHours(0,0,0,0)).getTime();
  
      // Find the closest available date on or before pastDate
      const availableDates = Array.from(dateMap.keys()).filter(d => d <= pastDate);
      if (availableDates.length === 0) {
        returns[period] = null;
        return;
      }
      const closestPastDate = Math.max(...availableDates);
  
      // Calculate return
      const returnValue = getReturn(closestPastDate, latest);
      returns[period] = returnValue !== null ? parseFloat(returnValue) : null;
    });
  
    return returns;
  };
  