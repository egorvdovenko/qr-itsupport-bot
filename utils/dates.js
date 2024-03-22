/**
 * Checks if the current time is within a specified timeframe of the target time.
 *
 * @param {Date} currentTime - The current time.
 * @param {Date} targetTime - The target time to compare against.
 * @param {number} [minutes=1] - The timeframe in minutes. Defaults to 1 minute.
 * @returns {boolean} Returns true if the current time is within the timeframe of the target time, otherwise false.
 */
function isWithinTimeframe(currentTime, targetTime, minutes = 1) {
  const differenceInMinutes = 
    (currentTime - targetTime) / (1000 * 60);

  return differenceInMinutes <= minutes;
}

/**
 * Formats a date and time according to the specified language.
 * @param {Date} date - The date to format.
 * @param {string} lang - The language code to use for formatting.
 * @returns {string} The formatted date and time.
 */
function formatDateTime(date, lang) {
  const dateObj = new Date(date);

  return dateObj.toLocaleString(lang, { 
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' 
  });
}

module.exports = { 
  isWithinTimeframe, 
  formatDateTime 
};
