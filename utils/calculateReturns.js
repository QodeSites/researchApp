export function calculateReturns(data, period, validTradingDays) {
    if (!data || data.length === 0) return '-';

    const sortedData = data.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
    const currentEntry = sortedData[sortedData.length - 1];
    const currentValue = currentEntry.nav;
    const currentDate = new Date(currentEntry.date);

    let comparisonValue;
    let yearDiff;

    if (period === 'Since Inception') {
        const inceptionData = sortedData[0];
        if (!inceptionData || !inceptionData.nav) return '-';

        comparisonValue = inceptionData.nav;
        const inceptionDate = new Date(inceptionData.date);
        yearDiff = (currentDate - inceptionDate) / (1000 * 60 * 60 * 24 * 365.25);

        return yearDiff <= 1 
            ? (((currentValue - comparisonValue) / comparisonValue) * 100).toFixed(2)
            : ((Math.pow(currentValue / comparisonValue, 1 / yearDiff) - 1) * 100).toFixed(2);
    }

    // Handle day-based periods (1D, 2D, 3D, 10D, 1W)
    const shortPeriods = ['1D', '2D', '3D', '10D', '1W'];
    if (shortPeriods.includes(period)) {
        const daysMap = { '1D': 1, '2D': 2, '3D': 3, '10D': 10, '1W': 7 };
        const targetDaysBack = daysMap[period];
        
        // For short periods, use the existing day-based logic
        let validDaysCount = 0;
        let comparisonData = null;
        
        for (let i = sortedData.length - 2; i >= 0; i--) {
            const dateStr = new Date(sortedData[i].date).toISOString().split('T')[0];
            if (!validTradingDays || validTradingDays.has(dateStr)) {
                validDaysCount++;
                if (validDaysCount === targetDaysBack) {
                    comparisonData = sortedData[i];
                    break;
                }
            }
        }

        if (!comparisonData || !comparisonData.nav) return '-';
        
        comparisonValue = comparisonData.nav;
        return (((currentValue - comparisonValue) / comparisonValue) * 100).toFixed(2);
    }

    // For all month-based periods (1M and longer), use end-of-month logic
    const periodMap = {
        '1M': 1, '3M': 3, '6M': 6, '9M': 9,
        '1Y': 12, '2Y': 24, '3Y': 36, '4Y': 48, '5Y': 60
    };
    
    if (!periodMap[period]) return '-';
    
    const months = periodMap[period];
    
    // Get the end of the month for the comparison date
    const comparisonDate = subtractMonths(currentDate, months);
    
    // Find the data point closest to the end of the month
    const comparisonDataFound = findClosestEOMData(sortedData, comparisonDate, validTradingDays);
    if (!comparisonDataFound || !comparisonDataFound.nav) return '-';

    comparisonValue = comparisonDataFound.nav;
    const actualComparisonDate = new Date(comparisonDataFound.date);
    yearDiff = (currentDate - actualComparisonDate) / (1000 * 60 * 60 * 24 * 365.25);

    return yearDiff <= 1
        ? (((currentValue - comparisonValue) / comparisonValue) * 100).toFixed(2)
        : ((Math.pow(currentValue / comparisonValue, 1 / yearDiff) - 1) * 100).toFixed(2);
}


function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function subtractMonths(date, months) {
    const result = new Date(date);
    
    // Calculate target month and year
    const targetMonth = result.getMonth() - months;
    const targetYear = result.getFullYear() + Math.floor(targetMonth / 12);
    
    // Calculate the normalized target month (handling negative months)
    const normalizedTargetMonth = ((targetMonth % 12) + 12) % 12;
    
    // Set to the last day of the target month
    result.setFullYear(targetYear);
    // Setting day to 0 of next month gives last day of current month
    result.setMonth(normalizedTargetMonth + 1, 0);
    
    return result;
}

// Function to find the closest data point to the end of a month
function findClosestEOMData(sortedData, targetEndOfMonth, validTradingDays) {
    // Create a window of 7 days before the end of month to find the closest valid trading day
    const windowStart = new Date(targetEndOfMonth);
    windowStart.setDate(windowStart.getDate() - 7);
    
    // Filter eligible data points (within the window and valid trading days)
    const eligiblePoints = sortedData.filter(item => {
        const itemDate = new Date(item.date);
        const dateStr = itemDate.toISOString().split('T')[0];
        return itemDate <= targetEndOfMonth && 
               itemDate >= windowStart && 
               (!validTradingDays || validTradingDays.has(dateStr));
    });
    
    // Sort descending by date to get the closest date to end of month
    eligiblePoints.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Return the closest or null if none found
    return eligiblePoints.length > 0 
        ? { ...eligiblePoints[0], date: new Date(eligiblePoints[0].date) } 
        : null;
}
export function calculateDrawdown(data) {
    if (!data || data.length === 0) return '-';

    const peakNav = Math.max(...data.map(d => d.nav));
    const currentNav = data[data.length - 1].nav;
    const drawdown = ((currentNav - peakNav) / peakNav) * 100;

    return drawdown.toFixed(2);
}

export function calculateMDD(data) {
    console.log('Starting calculateMDD');

    if (!data || data.length === 0) {
        console.log('No data provided or empty array, returning "-"');
        return '-';
    }

    // Ensure data is sorted by date in ascending order
    const sortedData = data.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
    const startDate = sortedData[0].date;
    const startNav = sortedData[0].nav;
    const endDate = sortedData[sortedData.length - 1].date;
    const endNav = sortedData[sortedData.length - 1].nav;
    console.log(`Start: Date=${startDate}, NAV=${startNav}`);
    console.log(`End: Date=${endDate}, NAV=${endNav}`);

    let peak = startNav; // Initialize peak with the first NAV
    let maxDrawdown = 0; // Initialize maximum drawdown

    for (let i = 1; i < sortedData.length; i++) {
        const currentNav = sortedData[i].nav;

        // Update the peak if the current NAV is higher than the previous peak
        if (currentNav > peak) {
            peak = currentNav;
        }

        // Calculate the drawdown from the current peak
        const drawdown = ((peak - currentNav) / peak) * 100;

        // Update the maximum drawdown if the current drawdown is larger
        if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
        }
    }

    const result = `${maxDrawdown.toFixed(2)}`;
    // console.log(`Final MDD result: ${result}%`);
    return result; // Return MDD as a percentage string with 2 decimal places
}