<script lang="ts">
  import { onMount } from "svelte";
  import * as DropdownMenu from "$lib/components/shadcn/dropdown-menu/index.js";
  import { Button } from "$lib/components/shadcn/button/index.js";
  import TableHeader from "$lib/components/Table/TableHeader.svelte";
  import highcharts from "$lib/highcharts.ts";
  import { mode } from "mode-watcher";
  import { goto } from "$app/navigation";

  export let data;
  export let ticker;
  let config = null;

  let rawData = [];
  let displayList = [];

  let dateList = [
    "All",
    ...Object?.keys(data?.getData ?? {})?.sort(
      (a, b) => new Date(a) - new Date(b),
    ),
  ];

  // New variables for multiple selection
  let selectedDates = new Set(["All"]); // Start with "All" selected
  let checkedDates = new Set(["All"]); // Track which dates are checked

  let currentPrice = null;

  function formatDate(dateStr) {
    try {
      let date = new Date(dateStr + "T00:00:00Z");
      let options = {
        timeZone: "UTC",
        month: "short",
        day: "numeric",
        year: "numeric",
      };
      let formatter = new Intl.DateTimeFormat("en-US", options);
      return formatter?.format(date);
    } catch (e) {
      return "n/a";
    }
  }

  // Function to handle date selection changes
  async function handleDateChange(dateValue) {
    if (dateValue === "All") {
      // If "All" is selected, clear other selections
      if (checkedDates.has("All")) {
        checkedDates.delete("All");
        selectedDates.delete("All");
      } else {
        checkedDates.clear();
        selectedDates.clear();
        checkedDates.add("All");
        selectedDates.add("All");
      }
    } else {
      // If a specific date is selected
      if (checkedDates.has(dateValue)) {
        checkedDates.delete(dateValue);
        selectedDates.delete(dateValue);
      } else {
        // Remove "All" if it was selected
        checkedDates.delete("All");
        selectedDates.delete("All");
        checkedDates.add(dateValue);
        selectedDates.add(dateValue);
      }
    }

    // If no dates are selected, default to "All"
    if (selectedDates.size === 0) {
      checkedDates.add("All");
      selectedDates.add("All");
    }

    // Update the arrays to trigger reactivity
    selectedDates = new Set(selectedDates);
    checkedDates = new Set(checkedDates);

    // Recalculate data
    updateDataForSelectedDates();
    dateList = [...dateList];
  }

  function isDateChecked(dateValue) {
    return checkedDates.has(dateValue);
  }

  function updateDataForSelectedDates() {
    if (selectedDates.has("All")) {
      rawData = aggregateDict(data?.getData) || [];
    } else {
      // Aggregate data for selected dates only
      const selectedData = {};
      selectedDates.forEach((date) => {
        if (data?.getData[date]) {
          selectedData[date] = data?.getData[date];
        }
      });
      rawData = aggregateDict(selectedData) || [];
    }

    rawData = rawData?.map((item) => {
      return {
        ...item,
        put_call_ratio:
          item?.call_oi > 0
            ? Math.abs((item?.put_oi || 0) / item?.call_oi)
            : null,
      };
    });

    displayList = rawData?.slice(0, 20);
    config = plotData() || null;
  }

  // Get display text for selected dates
  function getSelectedDatesText() {
    if (selectedDates.has("All")) {
      return "All Expiries";
    } else if (selectedDates.size === 1) {
      const singleDate = Array.from(selectedDates)[0];
      return formatDate(singleDate);
    } else {
      return `${selectedDates.size} Expiries Selected`;
    }
  }

  function aggregateDict(data) {
    const map = new Map();
    const callKey = "call_oi";
    const putKey = "put_oi";

    for (const pts of Object?.values(data)) {
      for (const pt of pts) {
        const { strike } = pt;
        if (!map?.has(strike)) {
          map?.set(strike, {
            strike,
            call_oi: 0,
            put_oi: 0,
          });
        }
        const agg = map.get(strike);
        agg[callKey] += pt[callKey] ?? 0;
        agg[putKey] += pt[putKey] ?? 0;
      }
    }

    return Array?.from(map?.values())?.sort((a, b) => a?.strike - b?.strike);
  }

  function plotData() {
    currentPrice = Number(data?.getStockQuote?.price?.toFixed(2));
    const processedData = rawData
      ?.map((d) => ({
        strike: d?.strike,
        callValue: d?.call_oi,
        putValue: d?.put_oi,
      }))
      ?.sort((a, b) => a.strike - b.strike);

    const strikes = processedData?.map((d) => d.strike);
    const allStrikes = Array.from(
      new Set([...strikes, ...[currentPrice]]),
    )?.sort((a, b) => a - b);

    const callValues = processedData?.map((d) =>
      parseFloat(d.callValue.toFixed(2)),
    );
    const putValues = processedData?.map((d) =>
      parseFloat(d.putValue.toFixed(2)),
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
        align: "center",
        verticalAlign: "top",
        layout: "horizontal",
        itemStyle: {
          color: $mode === "light" ? "black" : "white",
        },
        symbolWidth: 14,
        symbolRadius: 1,
        squareSymbol: true,
      },
      title: {
        text: `<h3 class="mt-3 mb-1 text-[1rem] sm:text-lg">${ticker} Open Interest By Strike</h3>`,
        useHTML: true,
        style: { color: $mode === "light" ? "black" : "white" },
      },
      xAxis: {
        categories: allStrikes,
        gridLineWidth: 0,
        crosshair: {
          color: $mode === "light" ? "black" : "white",
          width: 1,
          dashStyle: "Solid",
        },
        plotLines: [
          {
            value: allStrikes?.findIndex((s) => s === currentPrice),
            color: $mode === "light" ? "#000" : "#fff",
            dashStyle: "Dash",
            width: 1.5,
            label: {
              text: `Current Price ${currentPrice}`,
              style: { color: $mode === "light" ? "#000" : "#fff" },
            },
            zIndex: 5,
          },
        ],
        labels: {
          style: {
            color: $mode === "light" ? "#545454" : "white",
          },
          rotation: -45,
          formatter: function () {
            return this.pos % 4 === 0 ? this.value : "";
          },
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
          let tooltipContent = `<span class="text-white m-auto text-black text-[1rem] font-[501]">Strike ${this?.x}</span><br>`;
          this.points.forEach((point) => {
            tooltipContent += `
        <span style="display:inline-block; width:10px; height:10px; background-color:${point.color}; border-radius:50%; margin-right:5px;"></span>
        <span class="text-white font-semibold text-sm">${point.series.name}:</span> 
        <span class="text-white font-normal text-sm">${point.y?.toLocaleString("en-US")}</span><br>`;
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
    const scrollThreshold = document.body.offsetHeight * 0.8;
    const isBottom = window.innerHeight + window.scrollY >= scrollThreshold;

    if (isBottom && displayList?.length !== rawData?.length) {
      const nextIndex = displayList?.length;
      const filteredNewResults = rawData?.slice(nextIndex, nextIndex + 50);
      displayList = [...displayList, ...filteredNewResults];
    }
  }

  onMount(() => {
    window.addEventListener("scroll", handleScroll);
    updateDataForSelectedDates(); // Initialize data
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  });

  $: columns = [
    { key: "strike", label: "Strike Price", align: "left" },
    { key: "call_oi", label: `Call OI`, align: "right" },
    { key: "put_oi", label: `Put OI`, align: "right" },
    { key: "put_call_ratio", label: `P/C OI`, align: "right" },
  ];

  $: sortOrders = {
    strike: { order: "none", type: "number" },
    call_oi: { order: "none", type: "number" },
    put_oi: { order: "none", type: "number" },
    put_call_ratio: { order: "none", type: "number" },
  };

  const sortData = (key) => {
    for (const k in sortOrders) {
      if (k !== key) {
        sortOrders[k].order = "none";
      }
    }

    const orderCycle = ["none", "asc", "desc"];
    let originalData = rawData;
    const currentOrderIndex = orderCycle.indexOf(sortOrders[key].order);
    sortOrders[key].order =
      orderCycle[(currentOrderIndex + 1) % orderCycle.length];
    const sortOrder = sortOrders[key].order;

    if (sortOrder === "none") {
      originalData = [...rawData];
      displayList = originalData;
      return;
    }

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

    displayList = [...originalData].sort(compareValues);
  };

  // Reactive statement to update when mode changes
  $: if ($mode) {
    config = plotData() || null;
  }
</script>

<div class="sm:pl-7 sm:pb-7 sm:pt-7 w-full m-auto mt-2 sm:mt-0">
  <h2 class=" flex flex-row items-center text-xl sm:text-2xl font-bold w-fit">
    {ticker} Open Interest Chart
  </h2>

  <p class="mt-3 mb-2">
    {#if rawData?.length > 0}
      Open interest data for <strong>{ticker}</strong> options contracts.
      {#if selectedDates.has("All")}
        Displaying aggregated open interest across all expiration dates.
      {:else if selectedDates.size === 1}
        Showing open interest for contracts expiring on <strong
          >{formatDate(Array.from(selectedDates)[0])}</strong
        >.
      {:else}
        Showing aggregated open interest for <strong
          >{selectedDates.size}</strong
        > selected expiration dates.
      {/if}
      Current stock price is <strong>${currentPrice}</strong>. Total call open
      interest is
      <strong
        >{rawData
          ?.reduce((sum, item) => sum + (item?.call_oi || 0), 0)
          ?.toLocaleString("en-US")}</strong
      >
      contracts, while put open interest is
      <strong
        >{rawData
          ?.reduce((sum, item) => sum + (item?.put_oi || 0), 0)
          ?.toLocaleString("en-US")}</strong
      >
      contracts. The overall put-call open interest ratio is
      <strong
        >{(
          rawData.reduce((sum, item) => sum + (item?.put_oi || 0), 0) /
            rawData.reduce((sum, item) => sum + (item?.call_oi || 0), 0) || 0
        )?.toFixed(2)}</strong
      >, indicating a
      <strong
        >{rawData.reduce((sum, item) => sum + (item?.put_oi || 0), 0) /
          rawData.reduce((sum, item) => sum + (item?.call_oi || 0), 0) >
        1
          ? "bearish"
          : "bullish"}</strong
      >
      bias in open interest positioning.
    {:else}
      No open interest data available for the selected period.
    {/if}
  </p>

  <div class="mt-7">
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild let:builder>
        <Button
          builders={[builder]}
          class="border border-gray-300 dark:border-gray-700 text-white bg-black sm:hover:bg-default dark:default h-[38px] flex flex-row justify-between items-center min-w-[130px] max-w-[240px] sm:w-auto px-3 rounded truncate"
        >
          <span class="truncate text-sm">
            Date Expiration | {getSelectedDatesText()}
          </span>
          <svg
            class="-mr-1 ml-2 h-5 w-5 inline-block"
            viewBox="0 0 20 20"
            fill="currentColor"
            style="max-width:40px"
            aria-hidden="true"
          >
            <path
              fill-rule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clip-rule="evenodd"
            ></path>
          </svg>
        </Button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content
        side="bottom"
        align="end"
        sideOffset={10}
        alignOffset={0}
        class="min-w-56 w-auto max-w-60 max-h-[400px] overflow-y-auto scroller relative"
      >
        <DropdownMenu.Group class="pb-2">
          {#each dateList as item, index}
            {#if data?.user?.tier === "Pro" || index === 0}
              <DropdownMenu.Item
                class="sm:hover:bg-gray-300 dark:sm:hover:bg-primary"
              >
                <div
                  on:click|capture={(event) => event.preventDefault()}
                  class="flex items-center"
                >
                  <label
                    class="cursor-pointer"
                    on:click={() => handleDateChange(item)}
                    for={item}
                  >
                    <input type="checkbox" checked={isDateChecked(item)} />
                    <span class="ml-2">
                      {item === "All" ? "All Expiries" : formatDate(item)}
                    </span>
                  </label>
                </div>
              </DropdownMenu.Item>
            {:else}
              <DropdownMenu.Item
                on:click={() => goto("/pricing")}
                class="cursor-pointer sm:hover:bg-gray-200 dark:sm:hover:bg-primary"
              >
                {formatDate(item)}
                <svg
                  class="ml-1 size-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  style="max-width: 40px;"
                >
                  <path
                    fill-rule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clip-rule="evenodd"
                  >
                  </path>
                </svg>
              </DropdownMenu.Item>
            {/if}
          {/each}
        </DropdownMenu.Group>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  </div>

  <div class="w-full overflow-hidden m-auto sm:mt-3 shadow-xs">
    {#if config !== null}
      <div>
        <div class="grow">
          <div class="relative">
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
            <td class=" text-sm sm:text-[1rem] text-start whitespace-nowrap">
              {item?.strike}
            </td>
            <td class=" text-sm sm:text-[1rem] text-end whitespace-nowrap">
              {item?.call_oi?.toLocaleString("en-US")}
            </td>
            <td class=" text-sm sm:text-[1rem] text-end whitespace-nowrap">
              {item?.put_oi?.toLocaleString("en-US")}
            </td>
            <td class=" text-sm sm:text-[1rem] text-end whitespace-nowrap">
              {#if item?.put_call_ratio <= 1 && item?.put_call_ratio !== null}
                <span class=" text-green-800 dark:text-[#00FC50]"
                  >{item?.put_call_ratio?.toFixed(2)}</span
                >
              {:else if item?.put_call_ratio > 1 && item?.put_call_ratio !== null}
                <span class=" text-red-800 dark:text-[#FF2F1F]"
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
