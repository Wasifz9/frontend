import { compareTwoStrings } from "string-similarity";

onmessage = (event: MessageEvent) => {
  const rawData = event.data?.rawData;
  const filterQueryRaw = event.data?.inputValue;

  if (!rawData || !filterQueryRaw) {
    postMessage({ message: "success", output: [] });
    return;
  }

  const filterQuery = filterQueryRaw.toLowerCase();
  const similarityThreshold = 0.9;

  const output = [];
  for (let i = 0; i < rawData.length; i++) {
    const item = rawData[i];
    const name = item?.name?.toLowerCase() || "";
    const symbol = item?.symbol?.toLowerCase() || "";

    // Fast includes check (cheap)
    if (name.includes(filterQuery) || symbol.includes(filterQuery)) {
      output.push(item);
      continue;
    }

    // Fuzzy check (expensive) - fallback only if necessary
    const nameSim = compareTwoStrings(name, filterQuery);
    const symbolSim = compareTwoStrings(symbol, filterQuery);

    if (nameSim > similarityThreshold || symbolSim > similarityThreshold) {
      output.push(item);
    }
  }

  postMessage({ message: "success", output });
};

export {};
