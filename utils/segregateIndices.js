// utils/segregateIndices.js

export const segregateIndices = (rawData) => {
    console.log(rawData);
    const dataArray = Object.values(rawData);
    const broadBasedIndices = [
        'NSE:NIFTY 50', 'NSE:NIFTY NEXT 50', 'NSE:NIFTY 100', 'NSE:NIFTY 500', 'NSE:NIFTY MIDCAP 100',
        'NSE:NIFTY SMLCAP 250', 'NSE:NIFTY MICROCAP250'
    ];

    const sectoralIndices = [
        'NSE:NIFTY BANK', 'NSE:NIFTY AUTO', 'NSE:NIFTY FINANCIAL SVC', 'NSE:NIFTY FMCG', 'NSE:NIFTY IT',
        'NSE:NIFTY MEDIA', 'NSE:NIFTY METAL', 'NSE:NIFTY PHARMA', 'NSE:NIFTY PSU BANK', 'NSE:NIFTY PVT BANK',
        'NSE:NIFTY REALTY', 'NSE:NIFTY HEALTHCARE', 'NSE:NIFTY CONSR DURBL', 'NSE:NIFTY OIL AND GAS',
        'NSE:NIFTY COMMODITIES', 'NSE:NIFTY CONSUMPTION', 'NSE:NIFTY CPSE', 'NSE:NIFTY ENERGY', 'NSE:NIFTY INFRA',
        'NSE:NIFTY PSE'
    ];

    const broadBased = dataArray.filter(item => broadBasedIndices.includes(item.index));
    const sectoral = dataArray.filter(item => sectoralIndices.includes(item.index));
    console.log();
    
    return { broadBased, sectoral };
};
