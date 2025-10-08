import React from "react";

const CAGRTable = ({ cagrData }) => {
  const categories = ["1 yr CAGR", "3 yr CAGR", "5 yr CAGR"];
  const categoriesKey = ["1 Year", "3 Years", "5 Years"]; // Display this in the table

  const getData = (category, type) => {
    const value = (() => {
      switch (type) {
        case "max":
          return cagrData[category]?.top_5_max_values[0] || 0;
        case "avg":
          return cagrData[category]?.average_value || 0;
        case "min":
          return cagrData[category]?.top_5_min_values[0] || 0;
        default:
          return 0;
      }
    })();
    return value.toFixed(1); // Ensure all values are rounded to 1 decimal place
  };

  return (
    <>
      <p className="font-subheading mt-6 text-brown text-subheading mb-2">
        Rolling Returns
      </p>
      <p className="mb-2">
        Rolling returns show how an investment grows over time, helping you
        track its overall progress and consistency.
      </p>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm sm:text-body text-center font-body table-auto border-collapse border border-brown">
          <thead>
            <tr className="bg-lightBeige">
              <th className="border border-brown p-4 ">
                Returns CAGR
              </th>
              <th className="border border-brown p-4 ">Worst</th>
              <th className="border border-brown p-4 ">Average</th>
              <th className="border border-brown p-4 ">Best</th>
            </tr>
          </thead>
          <tbody>
            {categoriesKey.map((categoryKey, index) => (
              <tr key={index} className="hover:bg-lightBeige">
                <td className="border font-bold border-brown p-4">
                  {categoryKey}
                </td>
                <td className="border border-brown p-4 text-black">
                  {getData(categories[index], "min")}%{" "}
                </td>
                <td className="border border-brown p-4 text-black">
                  {getData(categories[index], "avg")}%
                </td>
                <td className="border border-brown p-4 text-black">
                  {getData(categories[index], "max")}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default CAGRTable;
