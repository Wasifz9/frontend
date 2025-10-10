<script lang="ts">
  import { abbreviateNumber } from "$lib/utils";
  import { onMount } from "svelte";
  import TableHeader from "$lib/components/Table/TableHeader.svelte";
  import highcharts from "$lib/highcharts.ts";
  import { mode } from "mode-watcher";

  export let data;
  export let ticker;

  let rawData = data?.getData || [];

  const today = new Date();

  rawData = rawData?.reduce((result, item) => {
    const itemDate = new Date(item?.expiry);
    if (itemDate >= today) {
      result.push({
        ...item,
        put_call_ratio:
          item?.call_oi > 0
            ? Math.abs((item?.put_oi || 0) / item.call_oi)
            : null,
      });
    }
    return result;
  }, []);

  let displayList = rawData?.slice(0, 150);

  function plotData() {
    const processedData = rawData?.map((d) => ({
      expiry: d?.expiry,
      callValue: d?.call_oi,
      putValue: d?.put_oi,
    }));

    const categories = processedData?.map((d) => d.expiry);
    const callValues = processedData?.map(
      (d) => parseFloat(d.callValue?.toFixed(2)) || 0,
    );
    const putValues = processedData?.map(
      (d) => parseFloat(d.putValue?.toFixed(2)) || 0,
    );

    const options = {
      chart: {
        backgroundColor: $mode === "light" ? "#fff" : "#09090B",
        animation: false,
        height: 360,
      },
      credits: { enabled: false },
      legend: {
        enabled: true,
        align: "center", // Positions legend at the left edge
        verticalAlign: "top", // Positions legend at the top
        layout: "horizontal", // Align items horizontally (use 'vertical' if preferred)
        itemStyle: {
          color: $mode === "light" ? "black" : "white",
        },
        symbolWidth: 14, // Controls the width of the legend symbol
        symbolRadius: 1, // Creates circular symbols (adjust radius as needed)
        squareSymbol: true, // Ensures symbols are circular, not square
      },
      title: {
        text: `<h3 class="mt-3 mb-1 text-[1rem] sm:text-lg">${ticker} Open Interest By Expiry</h3>`,
        useHTML: true,
        style: { color: $mode === "light" ? "black" : "white" },
      },
      xAxis: {
        type: "category",
        categories: categories,
        crosshair: {
          color: $mode === "light" ? "black" : "white",
          width: 1,
          dashStyle: "Solid",
        },
        labels: {
          style: {
            color: $mode === "light" ? "#545454" : "white",
          },
          distance: 10, // Adjust space between labels and axis
          formatter: function () {
            const date = new Date(this.value);
            return date.toLocaleDateString("en-US", {
              day: "2-digit",
              month: "short", // "Jan", "Feb", etc.
              year: "numeric",
              timeZone: "UTC",
            });
          },
        },
        tickInterval: Math.max(1, Math.floor(categories.length / 5)), // Ensures better spacing
        tickPositioner: function () {
          const positions = [];
          const tickCount = 5; // Reduce number of ticks displayed
          const totalPoints = this.categories.length;
          const interval = Math.max(1, Math.floor(totalPoints / tickCount));

          for (let i = 0; i < totalPoints; i += interval) {
            positions.push(i);
          }
          return positions;
        },
      },

      yAxis: {
        gridLineWidth: 1,
        gridLineColor: $mode === "light" ? "#e5e7eb" : "#111827",
        labels: {
          style: { color: $mode === "light" ? "#545454" : "white" },
        },
        title: { text: null },
        opposite: true,
      },
      tooltip: {
        shared: true,
        useHTML: true,
        backgroundColor: "rgba(0, 0, 0, 0.8)", // Semi-transparent black
        borderColor: "rgba(255, 255, 255, 0.2)", // Slightly visible white border
        borderWidth: 1,
        style: {
          color: "#fff",
          fontSize: "16px",
          padding: "10px",
        },
        borderRadius: 4,
        formatter: function () {
          // Format the x value to display time in a custom format
          let tooltipContent = `<span class="m-auto text-[1rem] font-[501]">${new Date(
            this?.x,
          ).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}</span><br>`;

          // Loop through each point in the shared tooltip
          this.points.forEach((point) => {
            tooltipContent += `
        <span style="display:inline-block; width:10px; height:10px; background-color:${point.color}; border-radius:50%; margin-right:5px;"></span>
        <span class="font-semibold text-sm">${point.series.name}:</span> 
        <span class="font-normal text-sm">${point.y?.toLocaleString("en-US")}</span><br>`;
          });

          return tooltipContent;
        },
      },
      plotOptions: {
        animation: false,
        column: {
          grouping: true,
          shadow: false,
          borderWidth: 0,
        },
      },

      series: [
        {
          name: "Put",
          type: "column",
          data: putValues,
          color: "#CC2619",
          borderColor: "#CC2619",
          borderRadius: "1px",
          animation: false,
        },
        {
          name: "Call",
          type: "column",
          data: callValues,
          color: "#00C440",
          borderColor: "#00C440",
          borderRadius: "1px",
          animation: false,
        },
      ],
    };

    return options;
  }

  async function handleScroll() {
    const scrollThreshold = document.body.offsetHeight * 0.8; // 80% of the website height
    const isBottom = window.innerHeight + window.scrollY >= scrollThreshold;

    if (isBottom && displayList?.length !== rawData?.length) {
      const nextIndex = displayList?.length;
      const filteredNewResults = rawData?.slice(nextIndex, nextIndex + 50);
      displayList = [...displayList, ...filteredNewResults];
    }
  }

  onMount(() => {
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  });

  $: columns = [
    { key: "expiry", label: "Expiry Date", align: "left" },
    {
      key: "call_oi",
      label: `Call OI`,
      align: "right",
    },
    {
      key: "put_oi",
      label: `Put OI`,
      align: "right",
    },
    {
      key: "put_call_ratio",
      label: `P/C OI`,
      align: "right",
    },
  ];

  $: sortOrders = {
    expiry: { order: "none", type: "date" },
    call_oi: { order: "none", type: "number" },
    put_oi: { order: "none", type: "number" },
    put_call_ratio: { order: "none", type: "number" },
  };

  const sortData = (key) => {
    // Reset all other keys to 'none' except the current key
    for (const k in sortOrders) {
      if (k !== key) {
        sortOrders[k].order = "none";
      }
    }

    // Cycle through 'none', 'asc', 'desc' for the clicked key
    const orderCycle = ["none", "asc", "desc"];
    let originalData = rawData;
    const currentOrderIndex = orderCycle.indexOf(sortOrders[key].order);
    sortOrders[key].order =
      orderCycle[(currentOrderIndex + 1) % orderCycle.length];
    const sortOrder = sortOrders[key].order;

    // Reset to original data when 'none' and stop further sorting
    if (sortOrder === "none") {
      originalData = [...rawData]; // Reset originalData to rawDataVolume
      displayList = originalData;
      return;
    }

    // Define a generic comparison function
    const compareValues = (a, b) => {
      const { type } = sortOrders[key];
      let valueA, valueB;

      switch (type) {
        case "date":
          valueA = new Date(a[key]);
          valueB = new Date(b[key]);
          break;
        case "string":
          valueA = a[key].toUpperCase();
          valueB = b[key].toUpperCase();
          return sortOrder === "asc"
            ? valueA.localeCompare(valueB)
            : valueB.localeCompare(valueA);
        case "number":
        default:
          valueA = parseFloat(a[key]);
          valueB = parseFloat(b[key]);
          break;
      }

      if (sortOrder === "asc") {
        return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
      } else {
        return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
      }
    };

    // Sort using the generic comparison function
    displayList = [...originalData].sort(compareValues);
  };

  let config = null;

  $: {
    if ($mode) {
      config = plotData() || null;
    }
  }
</script>

<div class="sm:pl-7 sm:pb-7 sm:pt-7 w-full m-auto mt-2 sm:mt-0">
  <h2 class=" flex flex-row items-center text-xl sm:text-2xl font-bold w-fit">
    {ticker} Open Interest Chart
  </h2>

  <p class="mt-3 mb-2">
    {#if rawData?.length > 0}
      Open interest breakdown by expiration date for <strong>{ticker}</strong>
      options contracts. Displaying data for <strong>{rawData?.length}</strong>
      active expiration dates with future expiry.
      {@const totalCallOI = rawData.reduce(
        (sum, item) => sum + (item?.call_oi || 0),
        0,
      )}
      {@const totalPutOI = rawData.reduce(
        (sum, item) => sum + (item?.put_oi || 0),
        0,
      )}
      {@const totalOI = totalCallOI + totalPutOI}

      <br />
      Total open interest across all expiries is
      <strong>{totalOI.toLocaleString("en-US")}</strong>
      contracts, with <strong>{totalCallOI.toLocaleString("en-US")}</strong>
      call contracts and
      <strong>{totalPutOI.toLocaleString("en-US")}</strong> put contracts.
    {:else}
      No active option expiration dates found with future expiry dates.
    {/if}
  </p>

  <div class="w-full overflow-hidden m-auto mt-3 shadow-xs">
    {#if config !== null}
      <div>
        <div class="grow">
          <div class="relative">
            <!-- Apply the blur class to the chart -->
            <div
              class="mt-5 shadow-xs sm:mt-0 sm:border sm:border-gray-300 dark:border-gray-800 rounded"
              use:highcharts={config}
            ></div>
          </div>
        </div>
      </div>
    {/if}
  </div>

  <h3 class="mt-5 text-xl sm:text-2xl font-bold mb-3">Open Interest Table</h3>

  <div class="w-full overflow-x-auto">
    <table
      class="table table-sm table-compact rounded-none sm:rounded w-full border border-gray-300 dark:border-gray-800 m-auto"
    >
      <thead>
        <TableHeader {columns} {sortOrders} {sortData} />
      </thead>
      <tbody>
        {#each displayList as item, index}
          <tr
            class="dark:sm:hover:bg-[#245073]/10 odd:bg-[#F6F7F8] dark:odd:bg-odd"
          >
            <td class="text-sm sm:text-[1rem] text-start whitespace-nowrap">
              {new Date(item?.expiry).toLocaleDateString("en-US", {
                month: "short", // Abbreviated month (e.g., Jan)
                day: "numeric", // Numeric day (e.g., 10)
                year: "numeric", // Full year (e.g., 2025)
              })}
            </td>
            <td class="text-sm sm:text-[1rem] text-end whitespace-nowrap">
              {item?.call_oi?.toLocaleString("en-US")}
            </td>
            <td class=" text-sm sm:text-[1rem] text-end whitespace-nowrap">
              {item?.put_oi?.toLocaleString("en-US")}
            </td>

            <td class=" text-sm sm:text-[1rem] text-end whitespace-nowrap">
              {#if item?.put_call_ratio <= 1 && item?.put_call_ratio !== null}
                <span class="f text-green-800 dark:text-[#00FC50]"
                  >{item?.put_call_ratio?.toFixed(2)}</span
                >
              {:else if item?.put_call_ratio > 1 && item?.put_call_ratio !== null}
                <span class="f text-red-800 dark:text-[#FF2F1F]"
                  >{item?.put_call_ratio?.toFixed(2)}</span
                >
              {:else}
                n/a
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
