export function calculateReturns(data, period, validTradingDays, upperLimit = null, indexName = 'Unknown') {
    if (!data || data.length === 0) return { value: '-', date: null };
    // List of Qode strategy indices
    const qodeStrategyIndices = ['QAW', 'QTF', 'QGF-ORBIS', 'QFH', 'QGF'];

    // Sort data in ascending order based on date
    const sortedData = data.slice().sort((a, b) => new Date(a.date) - new Date(b.date));

    // Determine the "current" entry: if upperLimit is provided, try to match it; otherwise use the last entry.
    const currentEntry = upperLimit 
        ? sortedData.find(d => new Date(d.date).toISOString().split('T')[0] === upperLimit.toISOString().split('T')[0])
            || sortedData[sortedData.length - 1]
        : sortedData[sortedData.length - 1];
    if (!currentEntry) return { value: '-', date: null };

    const currentValue = currentEntry.nav;
    const currentDate = new Date(currentEntry.date);
    // For logging, if upperLimit is provided, use that as the end date
    const debugEndDate = upperLimit ? upperLimit.toISOString().split('T')[0] : currentDate.toISOString().split('T')[0];

    let comparisonValue;
    let compDate;
    let yearDiff;

    // --- Since Inception ---
    if (period === 'Since Inception') {
        const inceptionData = sortedData[0];
        if (!inceptionData || !inceptionData.nav) return { value: '-', date: null };

        comparisonValue = inceptionData.nav;
        compDate = new Date(inceptionData.date);
        yearDiff = (currentDate - compDate) / (1000 * 60 * 60 * 24 * 365.25);
        const computedReturn = yearDiff <= 1 
            ? (((currentValue - comparisonValue) / comparisonValue) * 100).toFixed(2)
            : ((Math.pow(currentValue / comparisonValue, 1 / yearDiff) - 1) * 100).toFixed(2);
        console.debug(
            `${indexName} [Since Inception] Start: ${compDate.toISOString().split('T')[0]} (value: ${comparisonValue}), ` +
            `End: ${debugEndDate} (value: ${currentValue})`
        );
        return { value: computedReturn, date: compDate.toISOString().split('T')[0] };
    }
    
    // --- Short Periods: 1D, 2D, 3D, 10D, 1W ---
    const shortPeriods = ['1D', '2D', '3D', '10D', '1W'];
    if (shortPeriods.includes(period)) {
        const daysMap = { '1D': 1, '2D': 2, '3D': 3, '10D': 10, '1W': 7 };
        const targetDaysBack = daysMap[period];
        let validDaysCount = 0;
        let comparisonData = null;
        // Loop backwards to count valid trading days
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
        if (!comparisonData || !comparisonData.nav) return { value: '-', date: null };

        comparisonValue = comparisonData.nav;
        compDate = new Date(comparisonData.date);
        const computedReturn = (((currentValue - comparisonValue) / comparisonValue) * 100).toFixed(2);
        // console.debug(
        //     `${indexName} [${period}] Start: ${compDate.toISOString().split('T')[0]} (value: ${comparisonValue}), ` +
        //     `End: ${debugEndDate} (value: ${currentValue})`
        // );
        return { value: computedReturn, date: compDate.toISOString().split('T')[0] };
    }
    
    // --- Month-Based Periods: 1M, 3M, 6M, 9M, 1Y, 2Y, 3Y, 4Y, 5Y ---
    const periodMap = {
        '1M': 1, '3M': 3, '6M': 6, '9M': 9,
        '1Y': 12, '2Y': 24, '3Y': 36, '4Y': 48, '5Y': 60
    };
    if (!periodMap[period]) return { value: '-', date: null };

    const months = periodMap[period];
    let comparisonDateObj;

    // For Qode strategies and 1M period, use exact one month prior plus one day
    if (period === '1M' && qodeStrategyIndices.includes(indexName)) {
        comparisonDateObj = new Date(currentDate);
        comparisonDateObj.setMonth(currentDate.getMonth() - 1);
        // Adjust for cases where the day doesn't exist in the previous month (e.g., March 31 -> Feb 28)
        if (comparisonDateObj.getDate() !== currentDate.getDate()) {
            comparisonDateObj.setDate(0); // Set to last day of previous month
        }
        // Add 1 day as requested
        comparisonDateObj.setDate(comparisonDateObj.getDate() + 1);
        console.debug(
            `${indexName} [1M] Start: ${comparisonDateObj.toISOString().split('T')[0]} (value: ${comparisonValue}), ` +
            `End: ${debugEndDate} (value: ${currentValue})`
        );
    } else {
        // For non-Qode strategies or periods other than 1M, use end-of-month logic
        comparisonDateObj = subtractMonths(currentDate, months);
    }

    const comparisonDataFound = findClosestData(sortedData, comparisonDateObj, validTradingDays, qodeStrategyIndices.includes(indexName));
    if (!comparisonDataFound || !comparisonDataFound.nav) return { value: '-', date: null };

    comparisonValue = comparisonDataFound.nav;
    compDate = new Date(comparisonDataFound.date);
    yearDiff = (currentDate - compDate) / (1000 * 60 * 60 * 24 * 365.25);
    const computedReturn = yearDiff <= 1
        ? (((currentValue - comparisonValue) / comparisonValue) * 100).toFixed(2)
        : ((Math.pow(currentValue / comparisonValue, 1 / yearDiff) - 1) * 100).toFixed(2);
    // console.debug(
    //     `${indexName} [${period}] Start: ${compDate.toISOString().split('T')[0]} (value: ${comparisonValue}), ` +
    //     `End: ${debugEndDate} (value: ${currentValue})`
    // );
    return { value: computedReturn, date: compDate.toISOString().split('T')[0] };
}

function subtractMonths(date, months) {
    const result = new Date(date);
    const targetMonth = result.getMonth() - months;
    const targetYear = result.getFullYear() + Math.floor(targetMonth / 12);
    const normalizedTargetMonth = ((targetMonth % 12) + 12) % 12;
    
    // Set to the last day of the target month
    result.setFullYear(targetYear);
    result.setMonth(normalizedTargetMonth + 1, 0);
    
    // Add 1 extra day for monthly calculations
    result.setDate(result.getDate() + 1);
    
    return result;
}

function findClosestData(sortedData, targetDate, validTradingDays, isQodeStrategy) {
    // Convert targetDate to ISO string for comparison
    const targetDateStr = targetDate.toISOString().split('T')[0];

    // For Qode strategies, prioritize exact match or closest prior date within a narrow window
    let eligiblePoints;
    if (isQodeStrategy) {
        // Allow a small window (e.g., 3 days) to account for missing exact dates
        const windowStart = new Date(targetDate);
        windowStart.setDate(targetDate.getDate() - 3);
        
        eligiblePoints = sortedData.filter(item => {
            const itemDate = new Date(item.date);
            return itemDate <= targetDate && itemDate >= windowStart;
        });
    } else {
        // For non-Qode strategies, use a 7-day window before the target end-of-month date
        const windowStart = new Date(targetDate);
        windowStart.setDate(windowStart.getDate() - 7);
        
        eligiblePoints = sortedData.filter(item => {
            const itemDate = new Date(item.date);
            const dateStr = itemDate.toISOString().split('T')[0];
            return itemDate <= targetDate &&
                   itemDate >= windowStart &&
                   (!validTradingDays || validTradingDays.has(dateStr));
        });
    }

    // Sort by date descending to get the closest date <= targetDate
    eligiblePoints.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Try to find an exact match
    const exactMatch = eligiblePoints.find(item => {
        return new Date(item.date).toISOString().split('T')[0] === targetDateStr;
    });

    if (exactMatch) {
        return { ...exactMatch, date: new Date(exactMatch.date) };
    }
    
    // If no exact match, return the closest prior date within the eligible points
    if (eligiblePoints.length > 0) {
        return { ...eligiblePoints[0], date: new Date(eligiblePoints[0].date) };
    }
    
    return null;
}

export function calculateDrawdown(data) {
    if (!data || data.length === 0) return '-';

    const peakNav = Math.max(...data.map(d => d.nav));
    const currentNav = data[data.length - 1].nav;
    const drawdown = ((currentNav - peakNav) / peakNav) * 100;

    return drawdown.toFixed(2);
}

export function calculateMDD(data) {
    if (!data || data.length === 0) return '-';

    const sortedData = data.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
    let peak = sortedData[0].nav;
    let maxDrawdown = 0;

    for (let i = 1; i < sortedData.length; i++) {
        const currentNav = sortedData[i].nav;
        if (currentNav > peak) {
            peak = currentNav;
        }
        const drawdown = ((peak - currentNav) / peak) * 100;
        if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
        }
    }

    return `${maxDrawdown.toFixed(2)}%`;
}