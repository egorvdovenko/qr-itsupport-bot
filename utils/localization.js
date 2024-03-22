const RU_STRINGS = require('../localization/locale_ru');
const EN_STRINGS = require('../localization/locale_en');

/**
 * Retrieves the localized string for the given key and language.
 *
 * @param {string} key - The key of the localized string.
 * @param {string} lang - The language code ('en' for English, 'ru' for Russian).
 * @returns {string} The localized string corresponding to the key, or an empty string if not found.
 */
function getLocalizedString(key, lang) {
  const strings = lang === 'en' 
    ? EN_STRINGS 
    : RU_STRINGS;

  return strings[key] || '';
}

module.exports = { 
  getLocalizedString 
};
