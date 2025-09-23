  function processTickerData(data) {
    const tickerMap = new Map();

    data?.forEach((item) => {
      const { ticker } = item;

      if (!ticker) return; // Skip if ticker is not defined

      if (!tickerMap.has(ticker)) {
        // Add the item and initialize count
        tickerMap.set(ticker, { ...item, ratings: 1 });
      } else {
        const existing = tickerMap.get(ticker);

        // Increment the ratings count
        existing.ratings += 1;

        // Keep the item with the latest date
        if (new Date(item.date) > new Date(existing.date)) {
          tickerMap.set(ticker, { ...item, ratings: existing.ratings });
        }
      }
    });

    // Convert the Map back to an array
    return Array.from(tickerMap.values());
  }


export const load = async ({ locals, params }) => {
  const getData = async () => {
    const { apiURL, apiKey } = locals;

    const postData = { analystId: params.slug };
    // make the POST request to the endpoint
    const response = await fetch(apiURL + "/analyst-stats", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify(postData),
    });

    let output = await response.json() || {};
    output.ratingsList = processTickerData(output?.ratingsList)
    return output;
  };

  // Make sure to return a promise
  return {
    getData: await getData(),
  };
};
