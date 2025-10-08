//utils/dateUtils.js

export const calculateDaysBetween = (date1, date2) => {
    const d1 = new Date(date1.split("-").reverse().join("-"));
    const d2 = new Date(date2.split("-").reverse().join("-"));
    const diffTime = Math.abs(d2 - d1);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };
  