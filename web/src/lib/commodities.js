/**
 * The declared commodity table and the M49 country map.
 *
 * # ⭐ Why these two tables live here and not beside their first caller
 *
 * Both were private to `lib/ai/sources.js`, which is the right home while one consumer exists.
 * There are now two: the assistant's retrieval stage, whose consumer is a prompt, and
 * `lib/market.js`, whose consumer is a table in a browser.
 *
 * ⚠️ Copying either table would have been the cheaper edit and the wrong one. An HS code is the
 * whole answer to "which good is this" — two tables that disagree return a real, sourced,
 * entirely irrelevant market for the same word, with nothing in either answer indicating which
 * is stale. The same holds for M49: a numeric code resolved to a different country in two places
 * is a fabricated fact that looks researched in both.
 *
 * ⭐ So: one declaration, imported twice. The doc comments below are the originals from
 * `sources.js`, unchanged — they record *why* each table is declared rather than derived, and
 * that reasoning is the point of the file.
 */

/**
 * ⭐ Commodities this exchange will look up, with their HS codes.
 *
 * ⚠️ A short declared table rather than a model-emitted code. See `trade.fetch` — a six-digit
 * code is exactly the kind of specific-looking value a model fabricates convincingly, and a
 * wrong HS code returns a confident, well-formed answer about a different good entirely.
 *
 * `year` is pinned per commodity rather than computed from the clock. Comtrade's most recent
 * *complete* year lags the calendar by well over a year, and asking for the current year
 * returns an empty set that looks identical to "nobody imports this".
 */
export const COMMODITY_TABLE = {
  chamomile: { hs: "121190", label: "Chamomile and other plants used in pharmacy", year: 2023 },
  tea: { hs: "090240", label: "Black tea, fermented, in bulk", year: 2023 },
  "green tea": { hs: "090220", label: "Green tea, in bulk", year: 2023 },
  coffee: { hs: "090111", label: "Coffee, not roasted, not decaffeinated", year: 2023 },
  maize: { hs: "100590", label: "Maize (corn), other than seed", year: 2023 },
  soybeans: { hs: "120190", label: "Soya beans, other than seed", year: 2023 },
  groundnuts: { hs: "120242", label: "Groundnuts, shelled", year: 2023 },
  cotton: { hs: "520100", label: "Cotton, not carded or combed", year: 2023 },
  tobacco: { hs: "240120", label: "Tobacco, partly or wholly stemmed", year: 2023 },
  sesame: { hs: "120740", label: "Sesamum seeds", year: 2023 },
  wheat: { hs: "100199", label: "Wheat and meslin, other", year: 2023 },
  sugar: { hs: "170114", label: "Raw cane sugar", year: 2023 },
};

/**
 * ⭐ M49 numeric country codes → names.
 *
 * # ⚠️ Why this table has to exist
 *
 * Comtrade's row carries `reporterCode`, `reporterISO` and `reporterDesc`, so the obvious code
 * reads `x.reporterDesc` and prints a country name. On the public preview endpoint
 * **`reporterISO` and `reporterDesc` are `null` on every row** — measured across 500 rows, zero
 * had a description. Only the numeric code is populated.
 *
 * Printing the raw code would produce *"76: 11531 tonnes"*, and a model handed that will either
 * drop it or guess which country 76 is. Neither is acceptable, so the mapping is declared here
 * where it can be checked, rather than left to a stage that would fabricate it fluently.
 *
 * # ⚠️ It was partial, and that silently deleted half of some markets
 *
 * This table held 94 codes, written from the reporters that happened to appear in the first
 * commodity tested. Measured on maize (HS 100590): **17 of 37 reporters were dropped as
 * unresolvable**, the largest being code 214 at 1,441,430 t — which would have ranked fourth.
 * `market.js` drops unnamed rows rather than printing `"reporter 214"`, so the omission was
 * correct and invisible at once: the table looked complete and was missing the Dominican
 * Republic, Azerbaijan, Angola, Bahrain and thirteen others.
 *
 * ⭐ **It is now generated from the provider's own reference**, not from memory:
 * `https://comtradeapi.un.org/files/v1/app/reference/Reporters.json` — keyless, 255 entries.
 * Groups (`isGroup`) and historical successor entries (names carrying `(...)`, e.g. the
 * provider's own `"India (...1974)"`) are excluded, leaving 226 current reporters.
 *
 * ⚠️ **Six names are deliberately not the provider's.** Where a short form was already here it is
 * kept — `Bolivia`, `Hong Kong`, `India`, `South Korea`, `Russia`, `Tanzania` rather than
 * `Bolivia (Plurinational State of)`, `China, Hong Kong SAR`, `India (...1974)`,
 * `Rep. of Korea`, `Russian Federation`, `United Rep. of Tanzania`. The code is what matches the
 * data; the string is what a person reads, and the provider's forms are variously verbose or
 * stale. No code was changed, so nothing about which row is which moved.
 *
 * ⚠️ An unmapped code still falls back to `"reporter <n>"` in `countryName`, because the provider
 * can return a code this table predates. That path is now rare rather than routine.
 */
export const M49 = {
  4: "Afghanistan", 8: "Albania", 12: "Algeria", 20: "Andorra", 24: "Angola",
  28: "Antigua and Barbuda", 31: "Azerbaijan", 32: "Argentina", 36: "Australia", 40: "Austria",
  44: "Bahamas", 48: "Bahrain", 50: "Bangladesh", 51: "Armenia", 52: "Barbados", 56: "Belgium",
  60: "Bermuda", 64: "Bhutan", 68: "Bolivia", 70: "Bosnia Herzegovina", 72: "Botswana",
  76: "Brazil", 84: "Belize", 90: "Solomon Isds", 92: "Br. Virgin Isds",
  96: "Brunei Darussalam", 100: "Bulgaria", 104: "Myanmar", 108: "Burundi", 112: "Belarus",
  116: "Cambodia", 120: "Cameroon", 124: "Canada", 132: "Cabo Verde", 136: "Cayman Isds",
  140: "Central African Rep.", 144: "Sri Lanka", 148: "Chad", 152: "Chile", 156: "China",
  170: "Colombia", 174: "Comoros", 175: "Mayotte (Overseas France)", 178: "Congo",
  180: "Dem. Rep. of the Congo", 184: "Cook Isds", 188: "Costa Rica", 191: "Croatia",
  192: "Cuba", 196: "Cyprus", 203: "Czechia", 204: "Benin", 208: "Denmark", 212: "Dominica",
  214: "Dominican Rep.", 218: "Ecuador", 222: "El Salvador", 226: "Equatorial Guinea",
  231: "Ethiopia", 232: "Eritrea", 233: "Estonia", 234: "Faroe Isds", 242: "Fiji",
  246: "Finland", 251: "France", 254: "French Guiana (Overseas France)",
  258: "French Polynesia", 262: "Djibouti", 266: "Gabon", 268: "Georgia", 270: "Gambia",
  275: "State of Palestine", 276: "Germany", 288: "Ghana", 292: "Gibraltar", 296: "Kiribati",
  300: "Greece", 304: "Greenland", 308: "Grenada", 312: "Guadeloupe (Overseas France)",
  320: "Guatemala", 324: "Guinea", 328: "Guyana", 332: "Haiti",
  336: "Holy See (Vatican City State)", 340: "Honduras", 344: "Hong Kong", 348: "Hungary",
  352: "Iceland", 356: "India", 360: "Indonesia", 364: "Iran", 368: "Iraq", 372: "Ireland",
  376: "Israel", 380: "Italy", 381: "Italy", 384: "Côte d'Ivoire", 388: "Jamaica",
  392: "Japan", 398: "Kazakhstan", 400: "Jordan", 404: "Kenya",
  408: "Dem. People's Rep. of Korea", 410: "South Korea", 414: "Kuwait", 417: "Kyrgyzstan",
  418: "Lao People's Dem. Rep.", 422: "Lebanon", 426: "Lesotho", 428: "Latvia", 430: "Liberia",
  434: "Libya", 440: "Lithuania", 442: "Luxembourg", 446: "China, Macao SAR",
  450: "Madagascar", 454: "Malawi", 458: "Malaysia", 462: "Maldives", 466: "Mali",
  470: "Malta", 474: "Martinique (Overseas France)", 478: "Mauritania", 480: "Mauritius",
  484: "Mexico", 496: "Mongolia", 498: "Rep. of Moldova", 499: "Montenegro", 500: "Montserrat",
  504: "Morocco", 508: "Mozambique", 512: "Oman", 516: "Namibia", 520: "Nauru", 524: "Nepal",
  528: "Netherlands", 531: "Curaçao", 533: "Aruba", 534: "Saint Maarten", 535: "Bonaire",
  540: "New Caledonia", 548: "Vanuatu", 554: "New Zealand", 558: "Nicaragua", 562: "Niger",
  566: "Nigeria", 570: "Niue", 579: "Norway", 580: "N. Mariana Isds", 583: "FS Micronesia",
  584: "Marshall Isds", 585: "Palau", 586: "Pakistan", 591: "Panama", 598: "Papua New Guinea",
  600: "Paraguay", 604: "Peru", 608: "Philippines", 616: "Poland", 620: "Portugal",
  624: "Guinea-Bissau", 626: "Timor-Leste", 634: "Qatar", 638: "Réunion (Overseas France)",
  642: "Romania", 643: "Russia", 646: "Rwanda", 652: "Saint Barthélemy", 654: "Saint Helena",
  659: "Saint Kitts and Nevis", 660: "Anguilla", 662: "Saint Lucia",
  666: "Saint Pierre and Miquelon", 670: "Saint Vincent and the Grenadines", 674: "San Marino",
  678: "Sao Tome and Principe", 682: "Saudi Arabia", 686: "Senegal", 688: "Serbia",
  690: "Seychelles", 694: "Sierra Leone", 699: "India", 702: "Singapore", 703: "Slovakia",
  704: "Viet Nam", 705: "Slovenia", 706: "Somalia", 710: "South Africa", 716: "Zimbabwe",
  724: "Spain", 728: "South Sudan", 729: "Sudan", 740: "Suriname", 748: "Eswatini",
  752: "Sweden", 757: "Switzerland", 760: "Syria", 762: "Tajikistan", 764: "Thailand",
  768: "Togo", 772: "Tokelau", 776: "Tonga", 780: "Trinidad and Tobago",
  784: "United Arab Emirates", 788: "Tunisia", 792: "Türkiye", 795: "Turkmenistan",
  796: "Turks and Caicos Isds", 798: "Tuvalu", 800: "Uganda", 804: "Ukraine",
  807: "North Macedonia", 818: "Egypt", 826: "United Kingdom", 834: "Tanzania",
  840: "United States", 842: "USA", 854: "Burkina Faso", 858: "Uruguay", 860: "Uzbekistan",
  862: "Venezuela", 876: "Wallis and Futuna Isds", 882: "Samoa", 887: "Yemen", 894: "Zambia"
};

/**
 * ⚠️ Never guesses. An unknown code is reported as an unknown code.
 *
 * ⭐ Callers may prefer to *drop* an unresolved reporter rather than print this string — both
 * `sources.js` and `market.js` do, for reasons each records. This exists for the cases where
 * showing the raw code is more honest than showing nothing.
 */
export function countryName(code) {
  return M49[code] ?? `reporter ${code}`;
}
