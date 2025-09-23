import { getPartyForPoliticians } from "$lib/utils";

  function processTickerData(data) {
    const tickerMap = new Map();

    data?.forEach((item) => {
      const { ticker } = item;

      if (!ticker) return; // Skip if ticker is not defined

      if (!tickerMap?.has(ticker)) {
        // Add the item and initialize count
        tickerMap?.set(ticker, { ...item, transaction: 1 });
      } else {
        const existing = tickerMap?.get(ticker);

        // Increment the ratings count
        existing.transaction += 1;

        // Keep the item with the latest date
        if (
          new Date(item?.transactionDate) > new Date(existing?.transactionDate)
        ) {
          tickerMap?.set(ticker, {
            ...item,
            transaction: existing?.transaction,
          });
        }
      }
    });

    // Convert the Map back to an array
    return Array?.from(tickerMap?.values());
  }
  

export const load = async ({ locals, params }) => {

  let politicianDistrict;
  let politicianCongress;
  let politicianParty = "n/a";

  const getData = async () => {
    let res;

    const { apiURL, apiKey } = locals;

    const postData = { politicianId: params.slug };

    const response = await fetch(apiURL + "/politician-stats", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON?.stringify(postData),
    });

    let output = await response?.json();
    let history = processTickerData(output?.history);
    // Cache the data for this specific tickerID with a specific name 'getData'

    if (output && history?.length > 0) {
      let firstItem = history?.at(0);
      let representative = firstItem?.representative || "";

      representative = representative
        ?.replace("Jr", "")
        ?.replace(/Dr./g, "")
        ?.replace(/Dr_/g, "");

      const fullName = representative
        ?.replace(/(\s(?:Dr\s)?\w(?:\.|(?=\s)))?\s/g, "_")
        ?.trim();
      firstItem.representative = fullName?.replace(/_/g, " ");

      const party = getPartyForPoliticians(firstItem?.representative);
      firstItem.party = party;

      politicianParty = firstItem?.party;
      politicianDistrict = firstItem?.district;
      politicianCongress = firstItem?.congress;
    }

    output.history = history;
    res = { output, politicianParty, politicianDistrict, politicianCongress };

    return res;
  };

  // Make sure to return a promise
  return {
    getData: await getData(),
  };
};