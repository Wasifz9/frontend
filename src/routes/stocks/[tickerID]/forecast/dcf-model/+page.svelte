<script lang="ts">
  import SEO from "$lib/components/SEO.svelte";
  import { displayCompanyName, stockTicker, screenWidth } from "$lib/store";
  import { abbreviateNumber, removeCompanyStrings } from "$lib/utils";
  import InfoModal from "$lib/components/InfoModal.svelte";
  import Infobox from "$lib/components/Infobox.svelte";

  import highcharts from "$lib/highcharts.ts";
  import { mode } from "mode-watcher";
  export let data;

  let configHistoricalChart = null;
  let configFCFChart = null;
  let showSteps = false;
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
  // Initialize with default values from API, but allow user override
  let fcfGrowthRate = valuationData?.freeCashFlowGrowth || 0;
  let sharesGrowthRate = valuationData?.sharesGrowth || 0;
  let dividendGrowthRate = valuationData?.dividendGrowth || 0;
  let priceRatioAvg = valuationData?.priceRatioAvg || 0;

  // Update default values when data changes but preserve user input
  $: if (valuationData && !userHasModifiedInputs) {
    fcfGrowthRate = valuationData?.freeCashFlowGrowth || 0;
    sharesGrowthRate = valuationData?.sharesGrowth || 0;
    dividendGrowthRate = valuationData?.dividendGrowth || 0;
    priceRatioAvg = valuationData?.priceRatioAvg || 0;
  }

  let futureFCF;
  let futureShares;
  let futureStockPrice;
  let presentValue;
  let totalDividends;
  let totalFutureValue;
  let discountedValueList = [];
  // Use Google's actual diluted shares outstanding
  let dilutedShares = data?.getStockQuote?.sharesOutstanding || 0;
  let forwardDividend = data?.getStockDeck?.annualDividend;
  let discountRate = 10; // Default 10%
  let yearsToProject = 5;
  let upsideTotalFutureValue = 0;
  let upsidePresentValue = 0;
  let currentPrice = data?.getStockQuote?.price || 0;
  let userHasModifiedInputs = false;

  // Calculate DCF projections
  function calculateDCF() {
    discountedValueList = [];
    const historicalData = data?.getData?.historicalPrice;

    const lastDate = new Date(historicalData[historicalData.length - 1].date);

    // Step 1: Project Free Cash Flow for the next N years
    futureFCF = latestFCF * Math.pow(1 + fcfGrowthRate / 100, yearsToProject);

    // Step 2: Project Future Diluted Shares Outstanding
    futureShares =
      dilutedShares * Math.pow(1 + sharesGrowthRate / 100, yearsToProject);

    // Step 3: Project Future Stock Price
    futureStockPrice = Math.floor((futureFCF / futureShares) * priceRatioAvg);
    // Step 4: Project Future Dividends Paid
    totalDividends =
      forwardDividend *
      yearsToProject *
      Math.pow(1 + dividendGrowthRate / 100, yearsToProject / 2);

    // Step 5: Discount the Projected Stock Price
    totalFutureValue = (futureStockPrice + totalDividends)?.toFixed(2);

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

    upsideTotalFutureValue = (
      ((totalFutureValue - currentPrice) / currentPrice) *
      100
    )?.toFixed(2);

    upsidePresentValue = (
      ((presentValue - currentPrice) / currentPrice) *
      100
    )?.toFixed(2);
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

    // Create connection line data
    const connectionLine = [];
    if (prices.length > 0 && discountedValueList.length > 0) {
      // Get the last point from stock prices
      const lastPricePoint = prices[prices.length - 1];
      // Get the first point from DCF projection (where projection starts)
      const firstDCFPoint = discountedValueList[0];

      // Create a line connecting these two points
      connectionLine.push([lastPricePoint[0], lastPricePoint[1]]);
      connectionLine.push([firstDCFPoint[0], firstDCFPoint[1]]);
    }

    const options = {
      credits: {
        enabled: false,
      },
      chart: {
        backgroundColor: $mode === "light" ? "#fff" : "#09090B",
        plotBackgroundColor: $mode === "light" ? "#fff" : "#09090B",
        type: "spline",
        height: $screenWidth < 640 ? 360 : 450,
        animation: false,
      },
      title: {
        text: "",
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
          let tooltip = `<b>${new Date(this.x)?.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}</b><br/>`;
          this.points.forEach((point) => {
            if (point.series.name === "Stock Price") {
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
          name: "Stock Price",
          data: prices,
          color: $mode === "light" ? "#000" : "#fff",
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
          name: "Connection",
          type: "line",
          data: connectionLine,
          color: "#ffffff",
          yAxis: 0,
          animation: false,
          dashStyle: "Dash",
          lineWidth: 1,
          marker: {
            enabled: false,
          },
          showInLegend: false,
          enableMouseTracking: false,
          zIndex: 4,
        },
        {
          name: "P/FCF Ratio",
          data: priceToFCFRatios,
          color: "#2c6288",
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

  function plotFCFChart() {
    const fcfHistory = valuationData?.freeCashFlowHistory || [];
    if (!fcfHistory || fcfHistory.length === 0) return null;

    // Historical FCF data as TTM (Trailing Twelve Months)
    const historicalFCF = [];
    for (let i = 3; i < fcfHistory.length; i++) {
      // Calculate TTM by summing the last 4 quarters
      const ttmFCF = fcfHistory
        .slice(i - 3, i + 1)
        .reduce((sum, q) => sum + q.freeCashFlow, 0);
      historicalFCF.push([
        new Date(fcfHistory[i].date).getTime(),
        ttmFCF, // Keep raw value for chart
      ]);
    }

    // Project future FCF quarterly
    const projectedFCF = [];
    const lastHistoricalDate = new Date(fcfHistory[fcfHistory.length - 1].date);
    const totalQuarters = yearsToProject * 4;

    for (let quarter = 1; quarter <= totalQuarters; quarter++) {
      const projectedDate = new Date(lastHistoricalDate);
      projectedDate.setMonth(projectedDate.getMonth() + quarter * 3);

      const yearsFraction = quarter / 4;
      const projectedValue =
        latestFCF * Math.pow(1 + fcfGrowthRate / 100, yearsFraction);
      projectedFCF.push([projectedDate.getTime(), projectedValue]);
    }

    // Create connection line between historical and projected
    const connectionLine = [];
    if (historicalFCF.length > 0 && projectedFCF.length > 0) {
      const lastHistoricalPoint = historicalFCF[historicalFCF.length - 1];
      const firstProjectedPoint = projectedFCF[0];
      connectionLine.push([lastHistoricalPoint[0], lastHistoricalPoint[1]]);
      connectionLine.push([firstProjectedPoint[0], firstProjectedPoint[1]]);
    }

    const options = {
      credits: { enabled: false },
      chart: {
        backgroundColor: $mode === "light" ? "#fff" : "#09090B",
        plotBackgroundColor: $mode === "light" ? "#fff" : "#09090B",
        type: "spline",
        height: $screenWidth < 640 ? 360 : 450,
        animation: false,
      },
      title: {
        text: "",
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
        labels: { style: { color: $mode === "light" ? "#666" : "#aaa" } },
        gridLineColor: $mode === "light" ? "#e0e0e0" : "#2a2a2a",
      },
      yAxis: {
        title: {
          text: "Free Cash Flow TTM",
          style: { color: $mode === "light" ? "#545454" : "white" },
        },
        gridLineWidth: 1,
        gridLineColor: $mode === "light" ? "#e5e7eb" : "#111827",
        labels: {
          style: { color: $mode === "light" ? "#545454" : "white" },
          formatter: function () {
            return abbreviateNumber(this.value);
          },
        },
      },
      tooltip: {
        shared: true,
        useHTML: true,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        borderColor: "rgba(255, 255, 255, 0.2)",
        borderWidth: 1,
        style: { color: "#fff", fontSize: "16px", padding: "10px" },
        borderRadius: 4,
        formatter: function () {
          let tooltip = `<b>${new Date(this.x)?.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}</b><br/>`;
          this.points.forEach((point) => {
            if (point.series.name === "Historical FCF") {
              tooltip += `<span style="color:${point.color}">●</span> Historical FCF (TTM): ${abbreviateNumber(point.y)}<br/>`;
            } else if (point.series.name === "Projected FCF") {
              tooltip += `<span style="color:${point.color}">●</span> Projected FCF (TTM): ${abbreviateNumber(point.y)}<br/>`;
            }
          });
          return tooltip;
        },
      },
      plotOptions: {
        series: {
          legendSymbol: "rectangle",
          animation: false,
          states: { hover: { enabled: false } },
        },
        spline: {
          marker: {
            enabled: false,
            states: { hover: { enabled: false } },
          },
        },
      },
      series: [
        {
          name: "Historical FCF",
          data: historicalFCF,
          color: $mode === "light" ? "#000" : "#fff",
          animation: false,
          zIndex: 2,
        },
        {
          name: "Projected FCF",
          data: projectedFCF,
          color: "#ef4444",
          animation: false,
          dashStyle: "ShortDot",
          lineWidth: 2,
          marker: { enabled: true, radius: 4, symbol: "circle" },
          zIndex: 3,
        },
        {
          name: "Connection",
          type: "line",
          data: connectionLine,
          color: "#ffffff",
          animation: false,
          dashStyle: "Dash",
          lineWidth: 1,
          marker: { enabled: false },
          showInLegend: false,
          enableMouseTracking: false,
          zIndex: 4,
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
        itemStyle: { color: $mode === "light" ? "black" : "white" },
      },
    };

    return options;
  }

  // Reactive recalculation when inputs change
  $: {
    if (Object?.keys(valuationData)?.length > 0) {
      calculateDCF();
    }
  }

  $: {
    if (
      $mode &&
      typeof window !== "undefined" &&
      Object?.keys(valuationData)?.length > 0 &&
      yearsToProject &&
      discountRate
    ) {
      configHistoricalChart = plotHistoricalPriceChart() || null;
      configFCFChart = plotFCFChart() || null;
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
        {#if Object?.keys(valuationData)?.length > 0}
          <main class="w-full lg:w-3/4 lg:pr-5">
            <div class="mb-3">
              <h1 class="mb-1 text-2xl sm:text-3xl font-bold">
                DCF Calculator
              </h1>
            </div>

            <div
              class="mt-5 mb-6 grid grid-cols-2 gap-3 xs:mt-6 bp:mt-7 sm:grid-cols-4 sm:gap-6"
            >
              <div>
                Current Price
                <div
                  class="mt-0.5 text-lg bp:text-xl sm:mt-1.5 sm:text-2xl font-bold flex flex-row items-center"
                >
                  {currentPrice}
                </div>
              </div>

              <div>
                Dividends Paid
                <div
                  class="mt-0.5 text-lg font-bold bp:text-xl sm:mt-1.5 sm:text-2xl"
                >
                  {totalDividends ?? "n/a"}
                </div>
              </div>

              <div>
                DCF Fair Value (today)
                <div
                  class="mt-0.5 text-lg bp:text-xl sm:mt-1.5 sm:text-2xl font-bold flex flex-row items-center"
                >
                  {presentValue ?? "n/a"}
                  <span
                    class="ml-2 px-2 py-1 rounded-md font-medium text-sm
        {upsidePresentValue >= 0
                      ? 'bg-green-200 text-green-800 dark:bg-green-900/20 dark:text-[#00FC50]'
                      : 'bg-red-200 text-red-800 dark:bg-red-900/20 dark:text-[#FF2F1F]'}"
                  >
                    {upsidePresentValue >= 0 ? "+" : ""}{upsidePresentValue}%
                  </span>
                </div>
              </div>

              <div>
                Projected Value in {yearsToProject} years
                <div
                  class="mt-0.5 text-lg bp:text-xl sm:mt-1.5 sm:text-2xl font-bold flex flex-row items-center"
                >
                  {totalFutureValue ?? "n/a"}
                  <span
                    class="ml-2 px-2 py-1 rounded-md font-medium text-sm
        {upsideTotalFutureValue >= 0
                      ? 'bg-green-200 text-green-800 dark:bg-green-900/20 dark:text-[#00FC50]'
                      : 'bg-red-200 text-red-800 dark:bg-red-900/20 dark:text-[#FF2F1F]'}"
                  >
                    {upsideTotalFutureValue >= 0
                      ? "+"
                      : ""}{upsideTotalFutureValue}%
                  </span>
                </div>
              </div>
            </div>

            <!-- DCF Calculation Steps -->

            <div class="flex items-center justify-between mb-4">
              <label
                for="showSteps"
                class="cursor-pointer text-sm px-3 py-1 rounded-md border text-white border border-gray-300 dark:border-gray-600 bg-black sm:hover:bg-muted dark:bg-primary dark:sm:hover:bg-secondary"
              >
                Show Calculation Steps
              </label>
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

            {#if valuationData?.freeCashFlowHistory?.length > 0}
              <h2 class="text-xl sm:text-2xl font-bold text-start mr-auto mb-4">
                Historical and Projected Free Cash Flow
              </h2>

              <div class="mb-8">
                <div class="grow">
                  <div class="relative">
                    <div
                      class="sm:p-3 shadow-xs border border-gray-300 dark:border-gray-800 rounded"
                      use:highcharts={configFCFChart}
                    ></div>
                  </div>
                </div>
              </div>
            {/if}
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
                    class="bg-[#374151] border border-gray-600 text-white text-sm rounded-lg focus:outline-none block w-full pl-3 py-1 cursor-pointer"
                  >
                    <option selected>Free Cash Flow</option>
                    <option>Book Value</option>
                    <option>Operating Cash Flow</option>
                    <option>Operating Income</option>
                  </select>
                </div>

                <div>
                  <label
                    for="years"
                    class="flex items-center text-sm font-medium text-gray-300 mb-2"
                  >
                    Number of Years To Project
                    <InfoModal
                      content="The number of years to project the company's future performance. Typical range is 5-10 years. Longer projections become increasingly unreliable as unpredictable events and changes occur over time. The DCF calculator applies all your inputs over this timeframe to calculate the final projected value. Shorter periods are more reliable but may miss long-term value creation."
                    />
                  </label>
                  <select
                    id="years"
                    bind:value={yearsToProject}
                    on:change={() => (userHasModifiedInputs = true)}
                    class="bg-[#374151] border border-gray-600 text-white text-sm rounded-lg focus:outline-none block w-full pl-3 py-1 cursor-pointer"
                  >
                    <option class="cursor-pointer" value={3}>3</option>
                    <option class="cursor-pointer" value={5}>5</option>
                    <option class="cursor-pointer" value={10}>10</option>
                  </select>
                </div>

                <div>
                  <label
                    for="metric-growth"
                    class="flex items-center text-sm font-medium text-gray-300 mb-2"
                  >
                    Metric Growth Rate
                    <InfoModal
                      content="Expected annual growth rate for Free Cash Flow. We show the 5-year historical average as a starting point, but many investors use lower rates for larger companies since growth naturally slows as scale increases (doubling $1B is harder than doubling $1M). Conservative projections below historical averages provide a margin of safety and account for future uncertainties."
                    />
                  </label>
                  <div class="relative">
                    <span
                      class="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-300 dark:text-gray-300"
                      >%</span
                    >
                    <input
                      type="number"
                      step="0.01"
                      id="metric-growth"
                      bind:value={fcfGrowthRate}
                      on:input={() => (userHasModifiedInputs = true)}
                      class="bg-[#374151] border border-gray-600 text-white text-sm rounded-lg focus:outline-none block w-full pl-7 py-1"
                    />
                  </div>
                  <p class="mt-2 text-xs text-gray-300 dark:text-gray-300">
                    Annual Free Cash Flow growth over the past 5 year(s) is:
                    {valuationData?.freeCashFlowGrowth || 0}%
                  </p>
                </div>

                <div>
                  <label
                    for="shares-growth"
                    class="flex items-center text-sm font-medium text-gray-300 mb-2"
                  >
                    Diluted Shares Growth Rate
                    <InfoModal
                      content="Expected annual change in diluted shares outstanding, which directly impacts future share price growth. More shares dilute value and slow price appreciation, while fewer shares from buybacks accelerate it. We show the 5-year historical average: negative values indicate buyback history (share count decreasing), positive values indicate dilution history (share count increasing). This trend significantly affects projected share price performance."
                    />
                  </label>
                  <div class="relative">
                    <span
                      class="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-300 dark:text-gray-300"
                      >%</span
                    >
                    <input
                      type="number"
                      step="0.01"
                      id="shares-growth"
                      bind:value={sharesGrowthRate}
                      on:input={() => (userHasModifiedInputs = true)}
                      class="bg-[#374151] border border-gray-600 text-white text-sm rounded-lg focus:outline-none block w-full pl-7 py-1"
                    />
                  </div>
                  <p class="mt-2 text-xs text-gray-300 dark:text-gray-300">
                    Annual diluted shares outstanding growth over the past 5
                    year(s) is: {valuationData?.sharesGrowth || 0}%
                  </p>
                </div>

                <div>
                  <label
                    for="dividend-growth"
                    class="flex items-center text-sm font-medium text-gray-300 mb-2"
                  >
                    Dividend Growth Rate
                    <InfoModal
                      content="Expected annual growth rate for dividends per share, which significantly impacts total investor returns beyond share price appreciation. We show the 5-year historical average to indicate whether the company has been increasing (positive) or decreasing (negative) dividends over time. Growing dividends enhance total returns, while declining dividends reduce them. Set to 0 for non-dividend paying companies."
                    />
                  </label>
                  <div class="relative">
                    <span
                      class="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-300 dark:text-gray-300"
                      >%</span
                    >
                    <input
                      type="number"
                      step="0.01"
                      id="dividend-growth"
                      bind:value={dividendGrowthRate}
                      on:input={() => (userHasModifiedInputs = true)}
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
                    <InfoModal
                      content="The expected price ratio represents how the market will value the company in the future. We show the 5-year historical average as a reference point. However, past ratios don't guarantee future performance - if margins contract or growth slows, the market may assign lower ratios. Many investors use a conservative ratio below the historical average to build in a margin of safety."
                    />
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    id="price-ratio"
                    bind:value={priceRatioAvg}
                    on:input={() => (userHasModifiedInputs = true)}
                    class="bg-[#374151] border border-gray-600 text-white text-sm rounded-lg focus:outline-none block w-full pl-3 py-1"
                  />
                  <p class="mt-2 text-xs text-gray-300 dark:text-gray-300">
                    Average Price to Free Cash Flow over the past 5 year(s) is:
                    {valuationData?.priceRatioAvg || 0}
                  </p>
                </div>

                <div>
                  <label
                    for="discount-rate"
                    class="flex items-center text-sm font-medium text-gray-300 mb-2"
                  >
                    Discount Rate
                    <InfoModal
                      content="Your target annual rate of return from this investment. For example, a 10% discount rate calculates what price you'd need to buy the stock today to achieve a 10% annual return. We project the future stock price, then discount it back by your desired return rate. Higher discount rates result in lower buy prices but don't change the future estimated value."
                    />
                  </label>
                  <div class="relative">
                    <span
                      class="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-300 dark:text-gray-300"
                      >%</span
                    >
                    <input
                      type="number"
                      step="0.01"
                      id="discount-rate"
                      bind:value={discountRate}
                      on:input={() => (userHasModifiedInputs = true)}
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
        {:else}
          <div class="w-full">
            <Infobox text="No valuation data available." />
          </div>
        {/if}
      </div>
    </div>
  </div>
</section>

<input type="checkbox" id="showSteps" class="modal-toggle" />

<dialog id="showSteps" class="modal p-3 sm:p-0 text-muted dark:text-white">
  <label for="showSteps" class="cursor-pointer modal-backdrop bg-[#000]/30"
  ></label>

  <!-- Mobile modal content -->
  <div
    class="modal-box rounded border border-gray-300 dark:border-gray-600 w-full bg-white dark:bg-secondary flex flex-col items-center"
  >
    <div class="mx-auto h-1.5 w-20 shrink-0 rounded-full" />
    <div class="mb-5 text-center overflow-y-auto max-h-[80vh]">
      <h3 class="font-bold text-xl sm:text-2xl mb-5 text-start">
        DCF Calculation Breakdown
      </h3>
      <span class="text-[1rem] font-normal text-start">
        <div class="space-y-6">
          <!-- Step 1 -->
          <div>
            <h3 class="font-semibold mb-2">Step 1: Project Free Cash Flow</h3>
            <p class="text-sm">
              The most recent Free Cash Flow (TTM) value is
              <span class="font-semibold">{abbreviateNumber(latestFCF)}</span>
              as of {new Date(latestDate)?.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}.
            </p>
            <p class="text-sm">
              We will project this out {yearsToProject} years with a yearly growth
              rate of
              <span class="font-semibold">{fcfGrowthRate}%</span>.
            </p>
            <p class="text-sm">
              Starting with {abbreviateNumber(latestFCF)} and growing at
              {fcfGrowthRate}% for {yearsToProject} years, we estimate Free Cash
              Flow will be
              <span class="font-semibold">{abbreviateNumber(futureFCF)}</span>.
            </p>
          </div>

          <!-- Step 2 -->
          <div>
            <h3 class="font-semibold mb-2">
              Step 2: Project Future Diluted Shares Outstanding
            </h3>
            <p class="text-sm">
              The most recent Diluted Shares Outstanding value is
              <span class="font-semibold"
                >{abbreviateNumber(dilutedShares)}</span
              >.
            </p>
            <p class="text-sm">
              We will project this out {yearsToProject} year(s) with a growth rate
              of
              <span class="font-semibold">{sharesGrowthRate}%</span>.
            </p>
            <p class="text-sm">
              Estimated Diluted Shares Outstanding:
              <span class="font-semibold">{abbreviateNumber(futureShares)}</span
              >.
            </p>
          </div>

          <!-- Step 3 -->
          <div>
            <h3 class="font-semibold mb-2">
              Step 3: Project Future Stock Price
            </h3>
            <p class="text-sm mb-3">
              Using a price ratio of
              <span class="font-semibold">{priceRatioAvg}</span>, formula:
              (Future Free Cash Flow ÷ Future Diluted Shares Outstanding) ×
              Price Ratio
            </p>
            <p class="text-sm">
              ({abbreviateNumber(futureFCF)} ÷ {abbreviateNumber(futureShares)})
              ×
              {priceRatioAvg} =
              <span class="font-semibold">${futureStockPrice}</span>
            </p>
          </div>

          <!-- Step 4 -->
          <div>
            <h3 class="font-semibold mb-2">
              Step 4: Project Future Dividends Paid
            </h3>
            <p class="text-sm">
              Forward dividend per share:
              <span class="font-semibold">${forwardDividend}</span>.
            </p>
            <p class="text-sm">
              Projected over {yearsToProject} years with a growth rate of
              <span class="font-semibold">{dividendGrowthRate.toFixed(2)}%</span
              >, dividends add to total shareholder return.
            </p>
            <p class="text-sm">
              Expected dividends in {yearsToProject} years:
              <span class="font-semibold">${totalDividends}</span>.
            </p>
          </div>

          <!-- Step 5 -->
          <div>
            <h3 class="font-semibold mb-2">
              Step 5: Discount the Projected Stock Price
            </h3>
            <p class="text-sm">
              Projected stock price:
              <span class="font-semibold">${futureStockPrice}</span>.
            </p>
            <p class="text-sm">
              Including dividends, total future value:
              <span class="font-semibold">${totalFutureValue}</span>.
            </p>
            <p class="text-sm">
              Discounted at <span class="font-semibold">{discountRate}%</span>
              per year over {yearsToProject} years → Fair Value:
              <strong>${presentValue}</strong>.
            </p>
          </div>
        </div>
      </span>
    </div>

    <div class="border-t border-gray-300 dark:border-gray-600 mt-2 w-full">
      <label
        for="showSteps"
        class="mt-4 font-semibold text-xl m-auto flex justify-center cursor-pointer"
      >
        Close
      </label>
    </div>
  </div>
</dialog>
