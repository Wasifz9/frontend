<script lang="ts">
  import SEO from "$lib/components/SEO.svelte";
  import { displayCompanyName, stockTicker, screenWidth } from "$lib/store";
  import { abbreviateNumber } from "$lib/utils";
  import InfoModal from "$lib/components/InfoModal.svelte";

  import highcharts from "$lib/highcharts.ts";
  import { mode } from "mode-watcher";
  export let data;

  let configHistoricalChart = null;

  // DCF calculation variables from the valuation data
  $: valuationData = data?.getData || {};

  // Calculate TTM (Trailing Twelve Months) FCF from the last 4 quarters
  $: latestFCF = (() => {
    const fcfHistory = valuationData?.freeCashFlowHistory || [];
    if (fcfHistory.length >= 4) {
      // Sum the last 4 quarters for TTM
      const last4Quarters = fcfHistory?.slice(-4);
      return last4Quarters?.reduce((sum, q) => sum + q?.freeCashFlow, 0);
    }
    return 0;
  })();

  $: latestDate =
    valuationData?.freeCashFlowHistory?.slice(-1)?.[0]?.date || "";
  $: fcfGrowthRate = valuationData?.freeCashFlowGrowth || 0;
  $: sharesGrowthRate = valuationData?.sharesGrowth || 0;
  $: dividendGrowthRate = valuationData?.dividendGrowth || 0;
  $: priceRatioAvg = valuationData?.priceRatioAvg || 0;

  let futureFCF;
  let futureShares;
  let futureStockPrice;
  let presentValue;
  let totalDividends;
  let totalFutureValue;
  let discountedValueList = [];
  // Use Google's actual diluted shares outstanding
  let dilutedShares = data?.getStockQuote?.sharesOutstanding || 0;
  let forwardDividend = 0; // GOOG doesn't pay dividends
  let discountRate = 10; // Default 10%
  let yearsToProject = 5;

  // Calculate DCF projections
  function calculateDCF() {
    discountedValueList = [];
    const historicalData = data?.getData?.historicalPrice;

    const lastDate = new Date(historicalData[historicalData.length - 1].date);

    // Step 1: Project Free Cash Flow for the next N years
    futureFCF = latestFCF * Math.pow(1 + fcfGrowthRate / 100, yearsToProject);

    // Step 2: Project Future Diluted Shares Outstanding
    futureShares = dilutedShares * Math.pow(1 - 2.35 / 100, yearsToProject);

    // Step 3: Project Future Stock Price
    futureStockPrice = Math.floor((futureFCF / futureShares) * priceRatioAvg);
    // Step 4: Project Future Dividends Paid
    totalDividends =
      forwardDividend *
      yearsToProject *
      Math.pow(1 + dividendGrowthRate / 100, yearsToProject / 2);

    // Step 5: Discount the Projected Stock Price
    totalFutureValue = futureStockPrice + totalDividends;

    //recursive loop for yearsToProject
    for (let year = yearsToProject; year >= 0; year--) {
      presentValue = Math.floor(
        totalFutureValue /
          Math.pow(1 + discountRate / 100, yearsToProject - year),
      );

      // Build the date for the x-axis (same as you had)
      const projectedDate = new Date(lastDate);
      projectedDate.setFullYear(projectedDate.getFullYear() + year);

      discountedValueList.push([projectedDate.getTime(), presentValue]);
    }
    presentValue = discountedValueList[discountedValueList.length - 1][1];
    console.log(discountedValueList);
  }

  function plotHistoricalPriceChart() {
    calculateDCF();

    const historicalData = data?.getData?.historicalPrice;

    if (!historicalData || historicalData.length === 0) return null;

    const prices = historicalData.map((item) => [
      new Date(item.date).getTime(),
      item.price,
    ]);

    const priceToFCFRatios = historicalData
      ?.filter((item) => item.priceToFCFRatio != null)
      ?.map((item) => [new Date(item.date).getTime(), item.priceToFCFRatio]);

    const options = {
      credits: {
        enabled: false,
      },
      chart: {
        backgroundColor: $mode === "light" ? "#fff" : "#09090B",
        plotBackgroundColor: $mode === "light" ? "#fff" : "#09090B",
        type: "spline",
        height: 360,
        animation: false,
      },
      title: {
        text: "Historical Price with DCF Valuation",
        style: {
          color: $mode === "light" ? "#333" : "#fff",
          fontSize: "18px",
          fontWeight: "600",
        },
      },
      xAxis: {
        type: "datetime",
        crosshair: {
          color: $mode === "light" ? "black" : "white",
          width: 1,
          dashStyle: "Solid",
        },
        labels: {
          style: {
            color: $mode === "light" ? "#666" : "#aaa",
          },
        },
        gridLineColor: $mode === "light" ? "#e0e0e0" : "#2a2a2a",
      },
      yAxis: [
        {
          title: {
            text: "Price",
            style: { color: $mode === "light" ? "#545454" : "white" },
          },
          gridLineWidth: 1,
          gridLineColor: $mode === "light" ? "#e5e7eb" : "#111827",
          labels: {
            style: { color: $mode === "light" ? "#545454" : "white" },
          },
        },
        {
          title: {
            text: null,
          },
          labels: {
            enabled: false,
          },
          gridLineWidth: 0,
          opposite: true,
        },
      ],
      tooltip: {
        shared: true,
        useHTML: true,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        borderColor: "rgba(255, 255, 255, 0.2)",
        borderWidth: 1,
        style: {
          color: "#fff",
          fontSize: "16px",
          padding: "10px",
        },
        borderRadius: 4,
        formatter: function () {
          let tooltip = `<b>${new Date(this.x).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}</b><br/>`;
          this.points.forEach((point) => {
            if (point.series.name === "Historical Price") {
              tooltip += `<span style="color:${point.color}">●</span> Price: $${point.y.toFixed(2)}<br/>`;
            } else if (point.series.name === "DCF Projection") {
              tooltip += `<span style="color:${point.color}">●</span> Projected Price: $${point.y.toFixed(2)}<br/>`;
            } else if (point.series.name === "P/FCF Ratio") {
              tooltip += `<span style="color:${point.color}">●</span> P/FCF Ratio: ${point.y.toFixed(2)}x`;
            }
          });
          return tooltip;
        },
      },
      plotOptions: {
        series: {
          legendSymbol: "rectangle",
          animation: false,
          states: {
            hover: {
              enabled: false,
            },
          },
        },
        spline: {
          marker: {
            enabled: false,
            states: {
              hover: {
                enabled: false,
              },
            },
          },
        },
      },
      series: [
        {
          name: "Historical Price",
          data: prices,
          color: "#10b981",
          yAxis: 0,
          animation: false,
          zIndex: 2,
        },
        {
          name: "DCF Projection",
          data: discountedValueList,
          color: "#ef4444",
          yAxis: 0,
          animation: false,
          dashStyle: "ShortDot",
          lineWidth: 2,
          marker: {
            enabled: true,
            radius: 4,
            symbol: "circle",
          },
          zIndex: 3,
        },
        {
          name: "P/FCF Ratio",
          data: priceToFCFRatios,
          color: "#f59e0b",
          yAxis: 1,
          animation: false,
        },
      ],

      legend: {
        enabled: true,
        align: "center",
        verticalAlign: "top",
        layout: "horizontal",
        squareSymbol: false,
        symbolWidth: 20,
        symbolHeight: 12,
        symbolRadius: 0,
        itemStyle: {
          color: $mode === "light" ? "black" : "white",
        },
      },
    };

    return options;
  }

  $: {
    if ($mode && typeof window !== "undefined") {
      configHistoricalChart = plotHistoricalPriceChart() || null;
    }
  }
</script>

<SEO
  title={`${$displayCompanyName} (${$stockTicker}) DCF Valuation & Intrinsic Value`}
  description={`Discounted Cash Flow (DCF) valuation model for ${$displayCompanyName} (${$stockTicker}). See intrinsic value estimates, fair value analysis, and AI-enhanced price forecasts.`}
  keywords={`${$stockTicker} DCF valuation, ${$displayCompanyName} intrinsic value, discounted cash flow model, ${$stockTicker} fair value analysis, stock valuation model, DCF calculator, intrinsic value stock analysis, fundamental valuation, ${$displayCompanyName} price prediction`}
  type="website"
  url={`https://stocknear.com/stocks/${$stockTicker}/forecast/dcf-model`}
  structuredData={{
    "@context": "https://schema.org",
    "@type": ["FinancialProduct", "SoftwareApplication"],
    name: `${$displayCompanyName} DCF Valuation Model`,
    description: `Comprehensive discounted cash flow valuation and intrinsic value estimate for ${$displayCompanyName} (${$stockTicker}), with AI-enhanced forecasting.`,
    url: `https://stocknear.com/stocks/${$stockTicker}/forecast/dcf-model`,
    applicationCategory: "FinanceApplication",
    featureList: [
      "Discounted Cash Flow valuation",
      "Intrinsic value calculator",
      "Fair value stock analysis",
      "AI-enhanced price forecasts",
      "Machine learning valuation adjustments",
      "Fundamental analysis integration",
      "Long-term growth projections",
      "Valuation sensitivity analysis",
    ],
    provider: {
      "@type": "Organization",
      name: "Stocknear",
      url: "https://stocknear.com",
    },
    mainEntity: {
      "@type": "Corporation",
      name: $displayCompanyName,
      tickerSymbol: $stockTicker,
    },
    about: {
      "@type": "Thing",
      name: "Discounted Cash Flow Valuation",
      description:
        "DCF valuation model to estimate intrinsic stock value using projected cash flows and discount rates, combined with AI-enhanced forecasting.",
    },
  }}
/>

<section class="w-full overflow-hidden min-h-screen">
  <div class="w-full overflow-hidden">
    <div class="sm:pl-7 sm:pb-7 sm:pt-7 w-full mt-2 sm:mt-0">
      <div
        class="relative flex flex-col lg:flex-row justify-center items-start overflow-hidden w-full"
      >
        <main class="w-full lg:w-3/4 lg:pr-5">
          <div class="mb-3">
            <h1 class="mb-1 text-2xl sm:text-3xl font-bold">
              {$stockTicker} DCF Calculator
            </h1>
          </div>

          {#if data?.getData?.historicalPrice?.length > 0}
            <div class="mb-8">
              <div class="grow">
                <div class="relative">
                  <div
                    class="sm:p-3 shadow-xs border border-gray-300 dark:border-gray-800 rounded"
                    use:highcharts={configHistoricalChart}
                  ></div>
                </div>
              </div>
            </div>
          {/if}

          <!-- DCF Calculation Steps -->
          <div class="mb-8 p-6 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <h2 class="text-xl font-bold mb-6">DCF Calculation Steps</h2>

            <div class="space-y-6">
              <div>
                <h3
                  class="font-semibold text-green-600 dark:text-green-400 mb-2"
                >
                  Step 1: Project Free Cash Flow
                </h3>
                <p class="text-sm text-gray-700 dark:text-gray-300">
                  The most recent Free Cash Flow (TTM) value is <span
                    class="font-semibold">{latestFCF}</span
                  >
                  as of {latestDate}.
                </p>
                <p class="text-sm text-gray-700 dark:text-gray-300">
                  We will project this out {yearsToProject} year(s) with a yearly
                  growth rate of
                  <span class="font-semibold">{fcfGrowthRate}%</span>.
                </p>
                <p class="text-sm text-gray-700 dark:text-gray-300">
                  Starting with {latestFCF}
                  and growing at {fcfGrowthRate}% for {yearsToProject}
                  years, we estimate the Free Cash Flow will be
                  <span class="font-semibold">{futureFCF}</span>.
                </p>
              </div>

              <div>
                <h3
                  class="font-semibold text-green-600 dark:text-green-400 mb-2"
                >
                  Step 2: Project Future Diluted Shares Outstanding
                </h3>
                <p class="text-sm text-gray-700 dark:text-gray-300">
                  The most recent Diluted Shares Outstanding value is <span
                    class="font-semibold"
                    >{dilutedShares}
                  </span>.
                </p>
                <p class="text-sm text-gray-700 dark:text-gray-300">
                  We will project this out {yearsToProject} year(s) with a growth
                  rate of
                  <span class="font-semibold">{sharesGrowthRate}%</span>.
                </p>
                <p class="text-sm text-gray-700 dark:text-gray-300">
                  We estimate the Diluted Shares Outstanding will be <span
                    class="font-semibold">{futureShares}</span
                  >.
                </p>
              </div>

              <div>
                <h3
                  class="font-semibold text-green-600 dark:text-green-400 mb-2"
                >
                  Step 3: Project Future Stock Price
                </h3>
                <p class="text-sm text-gray-700 dark:text-gray-300">
                  We will use the projected Free Cash Flow (${(
                    futureFCF / 1e9
                  ).toFixed(3)}B) and Diluted Shares Outstanding ({(
                    futureShares / 1e9
                  ).toFixed(3)} billion).
                </p>
                <p class="text-sm text-gray-700 dark:text-gray-300">
                  Using a price ratio of <span class="font-semibold"
                    >{priceRatioAvg}</span
                  >, the formula is: Future Stock Price = (Future Free Cash Flow
                  / Future Diluted Shares Outstanding) × Price Ratio
                </p>
                <p class="text-sm text-gray-700 dark:text-gray-300">
                  Calculation: (${(futureFCF / 1e9).toFixed(3)}B / {(
                    futureShares / 1e9
                  ).toFixed(3)}B) × {priceRatioAvg} =
                  <span class="font-semibold">${futureStockPrice}</span>
                </p>
              </div>

              <div>
                <h3
                  class="font-semibold text-green-600 dark:text-green-400 mb-2"
                >
                  Step 4: Project Future Dividends Paid
                </h3>
                <p class="text-sm text-gray-700 dark:text-gray-300">
                  The most recent forward dividend per share value is <span
                    class="font-semibold">${forwardDividend}</span
                  >.
                </p>
                <p class="text-sm text-gray-700 dark:text-gray-300">
                  We will project this out {yearsToProject} year(s) with a growth
                  rate of
                  <span class="font-semibold"
                    >{dividendGrowthRate.toFixed(2)}%</span
                  >, which will be added to the future stock price to find total
                  shareholder returns.
                </p>
                <p class="text-sm text-gray-700 dark:text-gray-300">
                  Based on this growth rate, over the next {yearsToProject} year(s)
                  the stock will pay
                  <span class="font-semibold">${totalDividends}</span> in total dividends.
                </p>
              </div>

              <div>
                <h3
                  class="font-semibold text-green-600 dark:text-green-400 mb-2"
                >
                  Step 5: Discount the Projected Stock Price
                </h3>
                <p class="text-sm text-gray-700 dark:text-gray-300">
                  The projected stock price is <span class="font-semibold"
                    >${futureStockPrice}</span
                  >. To find total shareholder returns, we need to include all
                  money a shareholder would receive.
                </p>
                <p class="text-sm text-gray-700 dark:text-gray-300">
                  Since shareholders would also receive ${totalDividends} in dividends
                  over this period, the total future value is
                  <span class="font-semibold">${totalFutureValue}</span>.
                </p>
                <p class="text-sm text-gray-700 dark:text-gray-300">
                  Discounting this value by <span class="font-semibold"
                    >{discountRate}%</span
                  >
                  per year for {yearsToProject} year(s) gives us today's fair value
                  of
                  <span class="font-semibold text-lg">${presentValue}</span>.
                </p>
              </div>
            </div>

            <div
              class="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-500"
            >
              <div class="flex items-center justify-between">
                <div>
                  <h3
                    class="text-lg font-semibold text-blue-900 dark:text-blue-100"
                  >
                    DCF Fair Value
                  </h3>
                  <p
                    class="text-2xl font-bold text-blue-700 dark:text-blue-300"
                  >
                    ${presentValue}
                  </p>
                </div>
                <div class="text-right">
                  <p class="text-sm text-gray-600 dark:text-gray-400">
                    Projected Value in {yearsToProject} years
                  </p>
                  <p
                    class="text-lg font-semibold text-gray-800 dark:text-gray-200"
                  >
                    ${totalFutureValue}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>

        <aside class="inline-block relative w-full lg:w-1/4 mt-3">
          <div class="bg-[#1F2937] text-white p-6 rounded-lg shadow-lg">
            <div class="flex justify-between items-center mb-6">
              <h2 class="text-xl font-bold">DCF Inputs</h2>
            </div>

            <div class="space-y-6">
              <div>
                <label
                  for="metric"
                  class="flex items-center text-sm font-medium text-gray-300 mb-2"
                >
                  Metric
                  <InfoModal content="test" />
                </label>
                <select
                  id="metric"
                  class="bg-[#374151] border border-gray-600 text-white text-sm rounded-lg focus:outline-none block w-full pl-3 py-1"
                >
                  <option selected>Free Cash Flow</option>
                  <option>Revenue</option>
                  <option>Net Income</option>
                </select>
              </div>

              <div>
                <label
                  for="years"
                  class="flex items-center text-sm font-medium text-gray-300 mb-2"
                >
                  Number of Years To Project
                  <InfoModal content="test" />
                </label>
                <select
                  id="years"
                  class="bg-[#374151] border border-gray-600 text-white text-sm rounded-lg focus:outline-none block w-full pl-3 py-1"
                >
                  <option>3</option>
                  <option selected>5</option>
                  <option>10</option>
                </select>
              </div>

              <div>
                <label
                  for="metric-growth"
                  class="flex items-center text-sm font-medium text-gray-300 mb-2"
                >
                  Metric Growth Rate
                  <InfoModal content="test" />
                </label>
                <div class="relative">
                  <span
                    class="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-300 dark:text-gray-300"
                    >%</span
                  >
                  <input
                    type="text"
                    id="metric-growth"
                    value="16.45"
                    class="bg-[#374151] border border-gray-600 text-white text-sm rounded-lg focus:outline-none block w-full pl-7 py-1"
                  />
                </div>
                <p class="mt-2 text-xs text-gray-300 dark:text-gray-300">
                  Annual Free Cash Flow growth over the past 5 year(s) is:
                  16.45%
                </p>
              </div>

              <div>
                <label
                  for="shares-growth"
                  class="flex items-center text-sm font-medium text-gray-300 mb-2"
                >
                  Diluted Shares Growth Rate
                  <InfoModal content="test" />
                </label>
                <div class="relative">
                  <span
                    class="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-300 dark:text-gray-300"
                    >%</span
                  >
                  <input
                    type="text"
                    id="shares-growth"
                    value="-2.35"
                    class="bg-[#374151] border border-gray-600 text-white text-sm rounded-lg focus:outline-none block w-full pl-7 py-1"
                  />
                </div>
                <p class="mt-2 text-xs text-gray-300 dark:text-gray-300">
                  Annual diluted shares outstanding growth over the past 5
                  year(s) is: -2.35%
                </p>
              </div>

              <div>
                <label
                  for="dividend-growth"
                  class="flex items-center text-sm font-medium text-gray-300 mb-2"
                >
                  Dividend Growth Rate
                  <InfoModal content="test" />
                </label>
                <div class="relative">
                  <span
                    class="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-300 dark:text-gray-300"
                    >%</span
                  >
                  <input
                    type="text"
                    id="dividend-growth"
                    value="0"
                    class="bg-[#374151] border border-gray-600 text-white text-sm rounded-lg focus:outline-none block w-full pl-7 py-1"
                  />
                </div>
              </div>

              <div>
                <label
                  for="price-ratio"
                  class="flex items-center text-sm font-medium text-gray-300 mb-2"
                >
                  Price Ratio
                  <InfoModal content="test" />
                </label>
                <input
                  type="text"
                  id="price-ratio"
                  value="27.01"
                  class="bg-[#374151] border border-gray-600 text-white text-sm rounded-lg focus:outline-none block w-full pl-3 py-1"
                />
                <p class="mt-2 text-xs text-gray-300 dark:text-gray-300">
                  Average Price to Free Cash Flow over the past 5 year(s) is:
                  27.01
                </p>
              </div>

              <div>
                <label
                  for="discount-rate"
                  class="flex items-center text-sm font-medium text-gray-300 mb-2"
                >
                  Discount Rate
                  <InfoModal content="test" />
                </label>
                <div class="relative">
                  <span
                    class="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-300 dark:text-gray-300"
                    >%</span
                  >
                  <input
                    type="text"
                    id="discount-rate"
                    value="10"
                    class="bg-[#374151] border border-gray-600 text-white text-sm rounded-lg focus:outline-none block w-full pl-7 py-1"
                  />
                </div>
                <p class="mt-2 text-xs text-gray-300 dark:text-gray-300">
                  A sane discount rate to start with is: 10%
                </p>
              </div>
              <!--
              <div>
                <label
                  for="metric-override"
                  class="flex items-center text-sm font-medium text-gray-300 mb-2"
                >
                  Most Recent Metric Override (Advanced)
                  <span class="ml-1 text-gray-300 dark:text-gray-300 cursor-pointer">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      ><path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.79 4 4s-1.79 4-4 4c-1.742 0-3.223-.835-3.772-2m-1.152-1.556a3.46 3.46 0 00-.012 3.112A4.002 4.002 0 008.228 15a4 4 0 100-6 4.002 4.002 0 00-2.43.835z"
                      /></svg
                    >
                  </span>
                </label>
                <input
                  type="text"
                  id="metric-override"
                  value="66728"
                  class="bg-[#374151] border border-gray-600 text-white text-sm rounded-lg focus:outline-none block w-full p-2.5"
                />
                <p class="mt-2 text-xs text-gray-300 dark:text-gray-300">Values in millions</p>
              </div>
              -->
            </div>
          </div>
        </aside>
      </div>
    </div>
  </div>
</section>
