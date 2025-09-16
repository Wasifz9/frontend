<script lang="ts">
  import SEO from "$lib/components/SEO.svelte";
  import { displayCompanyName, stockTicker, screenWidth } from "$lib/store";
  import InfoModal from "$lib/components/InfoModal.svelte";

  import highcharts from "$lib/highcharts.ts";
  import { mode } from "mode-watcher";
  export let data;

  let configHistoricalChart = null;

  function plotHistoricalPriceChart() {
    const historicalData = data?.getData?.historicalPrice;

    if (!historicalData || historicalData.length === 0) return null;

    const prices = historicalData.map((item) => [
      new Date(item.date).getTime(),
      item.price,
    ]);

    const priceToFCFRatios = historicalData
      .filter((item) => item.priceToFCFRatio != null)
      .map((item) => [new Date(item.date).getTime(), item.priceToFCFRatio]);

    const options = {
      credits: {
        enabled: false,
      },
      chart: {
        backgroundColor: $mode === "light" ? "#fff" : "#09090B",
        plotBackgroundColor: $mode === "light" ? "#fff" : "#09090B",
        type: "line",
        height: $screenWidth < 640 ? 300 : 400,
        animation: false,
      },
      title: {
        text: "GOOG Historical Price & P/FCF Ratio",
        style: {
          color: $mode === "light" ? "#333" : "#fff",
          fontSize: "18px",
          fontWeight: "600",
        },
      },
      xAxis: {
        type: "datetime",
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
            text: "Price ($)",
            style: {
              color: "#10b981",
            },
          },
          labels: {
            style: {
              color: "#10b981",
            },
            format: "${value}",
          },
          gridLineColor: $mode === "light" ? "#e0e0e0" : "#2a2a2a",
        },
        {
          title: {
            text: "P/FCF Ratio",
            style: {
              color: "#f59e0b",
            },
          },
          labels: {
            style: {
              color: "#f59e0b",
            },
            format: "{value}x",
          },
          opposite: true,
        },
      ],
      tooltip: {
        backgroundColor: $mode === "light" ? "#fff" : "#1a1a1a",
        style: {
          color: $mode === "light" ? "#333" : "#fff",
        },
        shared: true,
        formatter: function () {
          let tooltip = `<b>${new Date(this.x).toLocaleDateString()}</b><br/>`;
          this.points.forEach((point) => {
            if (point.series.name === "Price") {
              tooltip += `<span style="color:${point.color}">●</span> Price: $${point.y.toFixed(2)}<br/>`;
            } else {
              tooltip += `<span style="color:${point.color}">●</span> P/FCF Ratio: ${point.y.toFixed(2)}x`;
            }
          });
          return tooltip;
        },
      },
      plotOptions: {
        line: {
          lineWidth: 2,
          marker: {
            enabled: false,
            states: {
              hover: {
                enabled: true,
                radius: 5,
              },
            },
          },
          states: {
            hover: {
              lineWidth: 3,
            },
          },
        },
      },
      series: [
        {
          name: "Price",
          data: prices,
          color: "#10b981",
          yAxis: 0,
          animation: false,
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
        y: 25,
        floating: true,
        backgroundColor:
          $mode === "light" ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.9)",
        borderColor: $mode === "light" ? "#ccc" : "#444",
        borderWidth: 1,
        borderRadius: 3,
        itemStyle: {
          color: $mode === "light" ? "#333" : "#fff",
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

          <div class="mb-3 mt-8">
            <h2 class="mb-1 text-xl sm:text-2xl font-bold">DCF Calculator</h2>
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
                    class="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-300 dark:text-gray-600"
                    >%</span
                  >
                  <input
                    type="text"
                    id="metric-growth"
                    value="16.45"
                    class="bg-[#374151] border border-gray-600 text-white text-sm rounded-lg focus:outline-none block w-full pl-7 py-1"
                  />
                </div>
                <p class="mt-2 text-xs text-gray-300 dark:text-gray-600">
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
                    class="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-300 dark:text-gray-600"
                    >%</span
                  >
                  <input
                    type="text"
                    id="shares-growth"
                    value="-2.35"
                    class="bg-[#374151] border border-gray-600 text-white text-sm rounded-lg focus:outline-none block w-full pl-7 py-1"
                  />
                </div>
                <p class="mt-2 text-xs text-gray-300 dark:text-gray-600">
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
                    class="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-300 dark:text-gray-600"
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
                <p class="mt-2 text-xs text-gray-300 dark:text-gray-600">
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
                    class="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-300 dark:text-gray-600"
                    >%</span
                  >
                  <input
                    type="text"
                    id="discount-rate"
                    value="10"
                    class="bg-[#374151] border border-gray-600 text-white text-sm rounded-lg focus:outline-none block w-full pl-7 py-1"
                  />
                </div>
                <p class="mt-2 text-xs text-gray-300 dark:text-gray-600">
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
                  <span class="ml-1 text-gray-300 dark:text-gray-600 cursor-pointer">
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
                <p class="mt-2 text-xs text-gray-300 dark:text-gray-600">Values in millions</p>
              </div>
              -->
            </div>
          </div>
        </aside>
      </div>
    </div>
  </div>
</section>
