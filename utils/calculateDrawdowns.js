/**
 * Calculate the maximum drawdown for a given dataset
 * @param {Array} data - Array of data points with nav (Net Asset Value) 
 * @returns {Object} Drawdown statistics
 */
export function calculateDrawdown(data) {
    
    if (!data || data.length < 2) {
        return {
            currentDrawdown: 0,
        };
    }
    
    
    let currentDrawdownPercentage = 0;
    let nav = Object.values(data)
    let maxSoFar = 0
    nav.map((el)=>{
        const maxNav = el.nav
        maxSoFar = Math.max(maxSoFar,maxNav)
    })
    console.log('maxSoFar',maxSoFar);

    const currentValue = data[data.length-1].nav;
    currentDrawdownPercentage = ((currentValue - maxSoFar ) / maxSoFar) * 100;

    return currentDrawdownPercentage.toFixed(2) 
}