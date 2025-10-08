const exportToExcel = () => {
    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // Function to transform data for Excel
    const transformData = (items) => {
        return items.map(item => ({
            Indices: item.indices,
            Direction: item.direction,
            'Current NAV': isNaN(item.nav) ? 'N/A' : formatCurrency(item.nav),
            'Current DD (%)': isNaN(item.currentDD) ? 'N/A' : `${item.currentDD}%`,
            Peak: isNaN(item.peak) ? 'N/A' : formatCurrency(item.peak),
            '10% DD': item.dd10 ? 'Done' : isNaN(item.dd10_value) ? 'N/A' : formatCurrency(item.dd10_value),
            '15% DD': item.dd15 ? 'Done' : isNaN(item.dd15_value) ? 'N/A' : formatCurrency(item.dd15_value),
            '20% DD': item.dd20 ? 'Done' : isNaN(item.dd20_value) ? 'N/A' : formatCurrency(item.dd20_value),
        }));
    };

    // Transform Broad Based Indices
    const broadBasedData = transformData(segregatedData.broadBased);
    const broadBasedWorksheet = XLSX.utils.json_to_sheet(broadBasedData);
    XLSX.utils.book_append_sheet(workbook, broadBasedWorksheet, 'Broad Based Indices');

    // Transform Sectoral Indices
    const sectoralData = transformData(segregatedData.sectoral);
    const sectoralWorksheet = XLSX.utils.json_to_sheet(sectoralData);
    XLSX.utils.book_append_sheet(workbook, sectoralWorksheet, 'Sectoral Indices');

    // Generate buffer
    const workbookOut = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

    // Create a Blob from the buffer
    const blob = new Blob([workbookOut], { type: 'application/octet-stream' });

    // Trigger the download
    saveAs(blob, 'IndicesDrawdowns.xlsx');
};


export default exportToExcel;