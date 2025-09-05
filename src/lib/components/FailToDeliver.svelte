<script lang="ts">
  import {
    displayCompanyName,
    stockTicker,
    assetType,
    etfTicker,
  } from "$lib/store";
  import { abbreviateNumber, removeCompanyStrings } from "$lib/utils";
  import { goto } from "$app/navigation";
  import highcharts from "$lib/highcharts.ts";
  import { mode } from "mode-watcher";

  export let data;
  export let rawData = [];

  let config = null;

  let avgFailToDeliver;
  let weightedFTD;

  let activeIdx = 0;
  const tabs = [
    {
      title: "Monthly",
    },
    {
      title: "Quarterly",
    },
  ];

  let tableList;
  function changeTimePeriod(i) {
    activeIdx = i;
    tableList = data?.getData || [];

    if (activeIdx === 1) {
      // Quarterly filter as before
      tableList = filterByPeriod([...tableList]);
    } else if (activeIdx === 0) {
      // New monthly filter: one result per month at the beginning of each month
      tableList = filterByMonth([...tableList]);
    }
  }

  function filterByPeriod(data) {
    if (!Array.isArray(data) || data.length === 0) return [];

    data = data?.sort((a, b) => new Date(b?.date) - new Date(a?.date));

    // Quarterly: one result per year-quarter.
    const seenPeriods = new Set();
    return data.filter((item) => {
      const dt = new Date(item.date);
      const year = dt.getFullYear();
      const quarter = Math.floor(dt.getMonth() / 3) + 1; // Quarter 1 to 4
      const key = `${year}-Q${quarter}`;
      if (!seenPeriods.has(key)) {
        seenPeriods.add(key);
        return true;
      }
      return false;
    });
  }

  function filterByMonth(data) {
    if (!Array.isArray(data) || data.length === 0) return [];

    data = data?.sort((a, b) => new Date(b?.date) - new Date(a?.date));

    // Monthly: one result per month.
    const seenMonths = new Set();
    return data.filter((item) => {
      const dt = new Date(item.date);
      const year = dt.getFullYear();
      const month = dt.getMonth(); // Month as a number (0-11)
      const key = `${year}-${month}`;
      if (!seenMonths.has(key)) {
        seenMonths.add(key);
        return true;
      }
      return false;
    });
  }

  function plotData() {
    let dates = [];
    let priceList = [];
    let failToDeliverList = [];
    rawData?.forEach((item) => {
      dates?.push(item?.date);
      priceList?.push(Number(item?.price));
      failToDeliverList?.push(item?.failToDeliver);
    });

    const totalNumber = failToDeliverList?.reduce((acc, item) => acc + item, 0);
    avgFailToDeliver = Math?.floor(totalNumber / failToDeliverList?.length);

    // Calculate max and min FTD values for bubble scaling
    const maxFTD = Math.max(...(failToDeliverList || [0]));
    const minFTD = Math.min(...(failToDeliverList || [0]));

    // Calculate dynamic threshold for significant FTD spikes
    const avgFTD =
      failToDeliverList?.reduce((sum, item) => sum + item, 0) /
      (failToDeliverList?.length || 1);
    const ftdThreshold = Math.min(avgFTD * 1.5, maxFTD * 0.3); // Show meaningful spikes

    // Create FTD impact bubbles for significant spikes
    const ftdImpactPoints =
      rawData
        ?.filter((item, index) => failToDeliverList[index] > ftdThreshold)
        ?.map((item, index) => {
          const originalIndex = rawData.indexOf(item);
          const x = originalIndex; // Use index for category axis
          const y = Number(item?.price) || 0;
          const z = failToDeliverList[originalIndex] || 0;

          // Only return valid data points with meaningful FTD
          return x !== undefined && y && z > 0 ? { x, y, z } : null;
        })
        ?.filter(Boolean) || []; // Remove null/undefined values

    const options = {
      credits: {
        enabled: false,
      },
      chart: {
        backgroundColor: $mode === "light" ? "#fff" : "#09090B",
        plotBackgroundColor: $mode === "light" ? "#fff" : "#09090B",
        height: 360,
        animation: false,
      },
      title: {
        text: `<h3 class="mt-3 mb-1 text-[1rem] sm:text-lg">${removeCompanyStrings($displayCompanyName)} FTD</h3>`,
        style: {
          color: $mode === "light" ? "black" : "white",
        },
        useHTML: true,
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
      tooltip: {
        shared: true,
        useHTML: true,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        borderColor: "rgba(255, 255, 255, 0.2)",
        borderWidth: 1,
        borderRadius: 4,
        style: { color: "#fff", fontSize: "14px", padding: "10px" },

        formatter: function () {
          const dateVal = dates?.[this.x] ?? this.x;
          const dateStr = new Date(dateVal).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            timeZone: "UTC",
          });

          let html = `<div class="text-[1rem] font-[501] mb-1">${dateStr}</div>`;

          // `this.points` is an array of point objects (one per visible series at x)
          this.points.forEach((p) => {
            if (p.series.type === "line") {
              html += `<div class="text-sm">Stock Price: <strong>$${(p.y ?? 0).toFixed(2)}</strong></div>`;
            } else {
              html += `<div class="text-sm">${p.series.name}: <strong>${p.y?.toLocaleString("en-US") ?? 0}</strong></div>`;
            }
          });

          return `<div class="p-1">${html}</div>`;
        },
      },
      xAxis: {
        endOnTick: false,
        categories: dates,
        crosshair: {
          color: $mode === "light" ? "black" : "white",
          width: 1,
          dashStyle: "Solid",
        },
        labels: {
          style: { color: $mode === "light" ? "black" : "white" },
          distance: 10,
          formatter: function () {
            return new Date(this.value).toLocaleDateString("en-US", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              timeZone: "UTC",
            });
          },
        },
      },
      yAxis: [
        {
          gridLineWidth: 1,
          gridLineColor: $mode === "light" ? "#e5e7eb" : "#111827",
          labels: {
            enabled: false,
          },
          title: {
            text: null,
          },
          opposite: true,
        },
        {
          gridLineWidth: 1,
          gridLineColor: $mode === "light" ? "#e5e7eb" : "#111827",
          labels: {
            enabled: false,
          },
          title: {
            text: null,
          },
          opposite: true,
        },
      ],
      series: [
        {
          // Price line series drawn on top of area
          name: "Stock Price",
          type: "line",
          data: priceList,
          color: $mode === "light" ? "#2C6288" : "#fff",
          marker: {
            enabled: false,
            states: {
              hover: {
                enabled: false,
              },
            },
          },
          lineWidth: 2,
          zIndex: 2, // Middle z-index
        },
        {
          name: "FTD Shares",
          type: "column",
          data: failToDeliverList,
          fillOpacity: 1,
          yAxis: 1,
          color: "#E11D48",
          borderColor: "#E11D48",
          marker: {
            enabled: false,
            states: {
              hover: {
                enabled: false,
              },
            },
          },
          zIndex: 1, // Lowest z-index
        },
      ],
    };

    return options;
  }
  $: {
    if ($stockTicker || $etfTicker || $mode) {
      const ticker = $assetType === "stock" ? $stockTicker : $etfTicker;
      if (ticker) {
        if (rawData?.length > 0) {
          weightedFTD = (
            (rawData?.slice(-1)?.at(0)?.failToDeliver /
              data?.getStockQuote?.avgVolume) *
            100
          )?.toFixed(2);
          config = plotData();
          changeTimePeriod(0);
        }
      }
    }
  }
</script>

<section class="overflow-hidden h-full pb-8">
  <main class="overflow-hidden">
    <div class="flex flex-row items-center w-full mt-3">
      <h1 class="text-xl sm:text-2xl font-bold">FTD Chart</h1>
    </div>

    {#if rawData?.length > 0}
      <div class="text-[1rem] mt-2 mb-2 w-full">
        As of <strong
          >{new Date(rawData?.slice(-1)?.at(0)?.date).toLocaleDateString(
            "en-US",
            { month: "short", day: "numeric", year: "numeric" },
          )}</strong
        >,
        <strong>{$displayCompanyName}</strong> has
        <strong
          >{rawData
            ?.slice(-1)
            ?.at(0)
            ?.failToDeliver?.toLocaleString("en-US")}</strong
        >
        shares failed to deliver, representing <strong>{weightedFTD}%</strong>
        of the average daily volume of
        <strong
          >{data?.getStockQuote?.avgVolume?.toLocaleString("en-US")}</strong
        >
        shares.
      </div>

      <div
        class="chart-driver shadow-xs mt-5 border border-gray-300 dark:border-gray-800 rounded"
        use:highcharts={config}
      ></div>

      <div
        class="mt-5 flex flex-col sm:flex-row items-start sm:items-center w-full justify-between sm:border-y border-gray-300 dark:border-gray-800 sm:pt-2 sm:pb-2"
      >
        <h3 class="history-driver text-xl sm:text-2xl font-bold mb-2 sm:mb-0">
          FTD History
        </h3>

        <div
          class="inline-flex justify-center w-full rounded sm:w-auto sm:ml-auto"
        >
          <div
            class="timeframe-toggle-driver bg-default text-white dark:bg-secondary w-full min-w-24 sm:w-fit relative flex flex-wrap items-center justify-center rounded p-1"
          >
            {#each tabs as item, i}
              <button
                on:click={() => changeTimePeriod(i)}
                class="cursor-pointer group relative z-1 rounded-full w-1/2 min-w-24 md:w-auto px-5 py-1 {activeIdx ===
                i
                  ? 'z-0'
                  : ''} "
              >
                {#if activeIdx === i}
                  <div class="absolute inset-0 rounded bg-[#fff]"></div>
                {/if}
                <span
                  class="relative text-sm block font-semibold whitespace-nowrap {activeIdx ===
                  i
                    ? 'text-black'
                    : ''}"
                >
                  {item.title}
                </span>
              </button>
            {/each}
          </div>
        </div>
      </div>

      <div class="w-full overflow-x-auto">
        <table
          class="table table-sm table-compact no-scrollbar rounded-none sm:rounded w-full border border-gray-300 dark:border-gray-800 m-auto mt-4"
        >
          <thead class="text-white bg-default">
            <tr>
              <th class=" font-semibold text-start text-sm sm:text-[1rem]"
                >Date</th
              >
              <th class=" font-semibold text-end text-sm sm:text-[1rem]"
                >Price</th
              >
              <th class=" font-semibold text-end text-sm sm:text-[1rem]"
                >FTD Shares</th
              >
              <th class=" font-semibold text-end text-sm sm:text-[1rem]"
                >% Change</th
              >
            </tr>
          </thead>
          <tbody>
            {#each tableList as item, index}
              <!-- row -->
              <tr
                class="dark:sm:hover:bg-[#245073]/10 odd:bg-[#F6F7F8] dark:odd:bg-odd"
              >
                <td class=" text-sm sm:text-[1rem] whitespace-nowrap">
                  {new Date(item?.date)?.toLocaleDateString("en-US", {
                    day: "2-digit", // Include day number
                    month: "short", // Display short month name
                    year: "numeric", // Include year
                  })}
                </td>

                <td
                  class=" text-sm sm:text-[1rem] text-right whitespace-nowrap"
                >
                  {item?.price}
                </td>

                <td
                  class=" text-sm sm:text-[1rem] text-right whitespace-nowrap"
                >
                  {item?.failToDeliver?.toLocaleString("en-US")}
                </td>

                <td class=" text-sm sm:text-[1rem] whitespace-nowrap text-end">
                  {#if index === tableList?.length - 1}
                    n/a
                  {:else if item?.failToDeliver > tableList[index + 1]?.failToDeliver}
                    <span class="text-green-800 dark:text-[#00FC50]">
                      +{(
                        ((item?.failToDeliver -
                          tableList[index + 1]?.failToDeliver) /
                          tableList[index + 1]?.failToDeliver) *
                        100
                      )?.toFixed(2)}%
                    </span>
                  {:else if item?.failToDeliver < tableList[index + 1]?.failToDeliver}
                    <span class="text-red-800 dark:text-[#FF2F1F]">
                      -{(
                        Math.abs(
                          (item?.failToDeliver -
                            tableList[index + 1]?.failToDeliver) /
                            tableList[index + 1]?.failToDeliver,
                        ) * 100
                      )?.toFixed(2)}%
                    </span>
                  {:else}
                    n/a
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </main>
</section>
