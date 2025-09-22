  function processTickerData(data) {
    const symbolMap = new Map();

    data.forEach((item) => {
      const { symbol } = item;

      if (!symbol) return; // Skip if symbol is not defined

      if (!symbolMap.has(symbol)) {
        // Add the item and initialize count
        symbolMap.set(symbol, { ...item, ratings: 1 });
      } else {
        const existing = symbolMap.get(symbol);

        // Increment the ratings count
        existing.ratings += 1;

        // Keep the item with the latest date
        if (new Date(item.filingDate) > new Date(existing.filingDate)) {
          symbolMap.set(symbol, { ...item, ratings: existing.ratings });
        }
      }
    });

    // Convert the Map back to an array
    return Array?.from(symbolMap?.values());
  }

  
export const load = async ({ locals }) => {
  const getData = async () => {
    const { apiKey, apiURL, user } = locals;

    // make the POST request to the endpoint
    const response = await fetch(apiURL + "/insider-tracker", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
    });

    let output = await response.json();

    output = ['Pro','Plus']?.includes(user?.tier) ? output : output?.slice(0,10)

    return processTickerData(output);
  };

  // Make sure to return a promise
  return {
    getData: await getData(),
  };
};
