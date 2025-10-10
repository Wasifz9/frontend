<script lang="ts">
  import TableHeader from "$lib/components/Table/TableHeader.svelte";
  import * as DropdownMenu from "$lib/components/shadcn/dropdown-menu/index.js";
  import { Button } from "$lib/components/shadcn/button/index.js";
  import { page } from "$app/stores";

  import { abbreviateNumber, formatString } from "$lib/utils";
  import { onMount } from "svelte";
  import SEO from "$lib/components/SEO.svelte";
  import DownloadData from "$lib/components/DownloadData.svelte";
  import Infobox from "$lib/components/Infobox.svelte";

  export let data;

  let originalData = data?.getData;
  let rawData = originalData;
  let displayList = [];
  let inputValue = "";
  let searchWorker: Worker | undefined;

  let pagePathName = $page?.url?.pathname;

  // Pagination state
  let currentPage = 1;
  let rowsPerPage = 20;
  let rowsPerPageOptions = [20, 50, 100];
  let totalPages = 1;

  // Pagination functions
  function updatePaginatedData() {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const dataSource = inputValue?.length > 0 ? rawData : originalData;
    displayList = dataSource?.slice(startIndex, endIndex) || [];
    totalPages = Math.ceil((dataSource?.length || 0) / rowsPerPage);
  }

  function goToPage(page) {
    if (page >= 1 && page <= totalPages) {
      currentPage = page;
      updatePaginatedData();
    }
  }

  function changeRowsPerPage(newRowsPerPage) {
    rowsPerPage = newRowsPerPage;
    currentPage = 1; // Reset to first page when changing rows per page
    updatePaginatedData();
    saveRowsPerPage(); // Save to localStorage
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Save rows per page preference to localStorage
  function saveRowsPerPage() {
    if (!pagePathName || typeof localStorage === "undefined") return;

    try {
      const paginationKey = `${pagePathName}_rowsPerPage`;
      localStorage.setItem(paginationKey, String(rowsPerPage));
    } catch (e) {
      console.warn("Failed to save rows per page preference:", e);
    }
  }

  // Load rows per page preference from localStorage
  function loadRowsPerPage() {
    const currentPath = pagePathName || $page?.url?.pathname;

    if (!currentPath || typeof localStorage === "undefined") {
      rowsPerPage = 20; // Default value
      return;
    }

    try {
      const paginationKey = `${currentPath}_rowsPerPage`;
      const savedRows = localStorage.getItem(paginationKey);

      if (savedRows && rowsPerPageOptions.includes(Number(savedRows))) {
        rowsPerPage = Number(savedRows);
      } else {
        rowsPerPage = 20; // Default if invalid or not found
      }
    } catch (e) {
      console.warn("Failed to load rows per page preference:", e);
      rowsPerPage = 20; // Default on error
    }
  }

  async function resetTableSearch() {
    inputValue = "";
    rawData = originalData;
    currentPage = 1; // Reset to first page
    updatePaginatedData();
  }

  async function search() {
    inputValue = inputValue?.toLowerCase();

    setTimeout(async () => {
      if (inputValue?.length > 0) {
        await loadSearchWorker();
      } else {
        // Reset to original data if filter is empty
        rawData = originalData || [];
        currentPage = 1; // Reset to first page
        updatePaginatedData();
      }
    }, 100);
  }

  const loadSearchWorker = async () => {
    if (searchWorker && originalData?.length > 0) {
      searchWorker.postMessage({
        rawData: originalData,
        inputValue: inputValue,
      });
    }
  };

  const handleSearchMessage = (event) => {
    if (event.data?.message === "success") {
      rawData = event.data?.output ?? [];
      currentPage = 1; // Reset to first page after search
      updatePaginatedData();
    }
  };

  onMount(async () => {
    // Load pagination preference
    loadRowsPerPage();

    if (!searchWorker) {
      const SearchWorker = await import(
        "$lib/workers/tableSearchWorker?worker"
      );
      searchWorker = new SearchWorker.default();
      searchWorker.onmessage = handleSearchMessage;
    }

    // Initialize pagination
    updatePaginatedData();
  });

  // Reactive statement to load pagination settings when page changes
  $: if ($page?.url?.pathname && $page?.url?.pathname !== pagePathName) {
    pagePathName = $page?.url?.pathname;
    loadRowsPerPage(); // Load pagination preference for new page
    updatePaginatedData(); // Update display with loaded preference
  }

  let columns = [
    { key: "rank", label: "Rank", align: "left" },
    { key: "name", label: "Name", align: "left" },
    { key: "marketValue", label: "AUM", align: "right" },
    { key: "numberOfStocks", label: "Holdings", align: "right" },
    { key: "turnover", label: "Turnover", align: "right" },
    { key: "performancePercentage3Year", label: "3-Year Perf", align: "right" },
    { key: "winRate", label: "Win Rate", align: "right" },
  ];

  let sortOrders = {
    rank: { order: "none", type: "number" },
    name: { order: "none", type: "string" },
    marketValue: { order: "none", type: "number" },
    numberOfStocks: { order: "none", type: "number" },
    turnover: { order: "none", type: "number" },
    performancePercentage3Year: { order: "none", type: "number" },
    winRate: { order: "none", type: "number" },
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
    const currentOrderIndex = orderCycle.indexOf(
      sortOrders[key]?.order || "none",
    );
    sortOrders[key] = {
      ...(sortOrders[key] || {}),
      order: orderCycle[(currentOrderIndex + 1) % orderCycle.length],
    };
    const sortOrder = sortOrders[key]?.order;

    // Reset to original data when 'none' and stop further sorting
    if (sortOrder === "none") {
      if (inputValue?.length > 0) {
        // If searching, re-run the search to get the original filtered order
        search();
      } else {
        // Reset to original unsorted state
        originalData = data?.getData || [];
        rawData = [...originalData];
        currentPage = 1; // Reset to first page
        updatePaginatedData(); // Reset displayed data
      }
      return;
    }

    // Generic comparison function
    const compareValues = (a, b) => {
      const { type } = sortOrders[key];
      let valueA, valueB;

      switch (type) {
        case "date":
          valueA = new Date(a[key]);
          valueB = new Date(b[key]);
          break;
        case "rating":
        case "string":
          // Retrieve values
          valueA = a[key];
          valueB = b[key];

          // Handle null or undefined values, always placing them at the bottom
          if (valueA == null && valueB == null) {
            return 0; // Both are null/undefined, no need to change the order
          } else if (valueA == null) {
            return 1; // null goes to the bottom
          } else if (valueB == null) {
            return -1; // null goes to the bottom
          }

          // Convert the values to uppercase for case-insensitive comparison
          valueA = valueA?.toUpperCase();
          valueB = valueB?.toUpperCase();

          // Perform the sorting based on ascending or descending order
          return sortOrder === "asc"
            ? valueA?.localeCompare(valueB)
            : valueB?.localeCompare(valueA);
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

    // Get the data to sort and sort it
    const dataToSort = inputValue?.length > 0 ? rawData : originalData;
    const sortedData = [...dataToSort].sort(compareValues);

    // Update the appropriate data source based on whether we're filtering or not
    if (inputValue?.length > 0) {
      rawData = sortedData;
    } else {
      originalData = sortedData;
      rawData = sortedData; // Keep rawData in sync for consistency
    }

    currentPage = 1; // Reset to first page when sorting
    updatePaginatedData(); // Update the displayed data

    // Force reactivity by triggering the sortOrders reactivity
    sortOrders = { ...sortOrders };
  };
</script>

<SEO
  title="Hedge Fund Tracker - Top Hedge Fund Holdings & 13F Filings "
  description="Track top hedge fund holdings, 13F filings, and institutional investor portfolios. Monitor what hedge funds are buying and selling with detailed position analysis. Free hedge fund tracking tool."
  keywords="hedge fund tracker, hedge fund holdings, 13F filings, institutional investors, hedge fund positions, top hedge funds, institutional holdings, hedge fund portfolios, berkshire hathaway holdings"
  structuredData={{
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Hedge Fund Tracker",
    description:
      "Comprehensive tracking of hedge fund holdings and institutional investments",
    url: "https://stocknear.com/hedge-funds",
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://stocknear.com",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Hedge Funds",
          item: "https://stocknear.com/hedge-funds",
        },
      ],
    },
    mainEntity: {
      "@type": "ItemList",
      name: "Hedge Fund List",
      description:
        "List of hedge funds and institutional investors with their holdings",
      numberOfItems: originalData?.length || 0,
    },
  }}
/>

<section
  class="w-full max-w-3xl sm:max-w-[1400px] overflow-hidden min-h-screen pt-5 pb-40 px-3"
>
  <body class="w-full overflow-hidden m-auto">
    <div class="text-sm sm:text-[1rem] breadcrumbs">
      <ul>
        <li><a href="/" class="text-muted dark:text-gray-300">Home</a></li>
        <li class="text-muted dark:text-gray-300">Hedge Funds</li>
      </ul>
    </div>

    <section class="w-full overflow-hidden m-auto sm:mt-10 px-0 mt-10">
      <div class=" flex justify-center w-full m-auto overflow-hidden">
        <div
          class="relative flex justify-center items-center overflow-hidden w-full"
        >
          <main class="w-full">
            <div class="mb-6 border-[#2C6288] dark:border-white border-b-[2px]">
              <h1 class="mb-1 text-2xl sm:text-3xl font-bold">
                Top Hedge Funds in US
              </h1>
            </div>

            <Infobox
              text="List of all Wall Street Institutions with the highest Asset under Management."
            />

            <div class="items-center lg:overflow-visible px-1 py-1 mt-4">
              <div
                class="col-span-2 flex flex-col lg:flex-row items-start sm:items-center lg:order-2 lg:grow py-1 border-t border-b border-gray-300 dark:border-gray-800"
              >
                <h2
                  class="text-start whitespace-nowrap text-xl sm:text-2xl font-semibold py-1 border-b border-gray-300 dark:border-gray-800 lg:border-none w-full"
                >
                  {originalData?.length?.toLocaleString("en-US")} Institutes
                </h2>
                <div
                  class="mt-1 w-full flex flex-row lg:flex order-1 items-center ml-auto pb-1 pt-1 sm:pt-0 w-full order-0 lg:order-1"
                >
                  <div class="relative lg:ml-auto w-full lg:w-fit">
                    <div
                      class="inline-block cursor-pointer absolute right-2 top-2 text-sm"
                    >
                      {#if inputValue?.length > 0}
                        <label
                          class="cursor-pointer"
                          on:click={() => resetTableSearch()}
                        >
                          <svg
                            class="w-5 h-5"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            ><path
                              fill="currentColor"
                              d="m6.4 18.308l-.708-.708l5.6-5.6l-5.6-5.6l.708-.708l5.6 5.6l5.6-5.6l.708.708l-5.6 5.6l5.6 5.6l-.708.708l-5.6-5.6z"
                            /></svg
                          >
                        </label>
                      {/if}
                    </div>

                    <input
                      bind:value={inputValue}
                      on:input={search}
                      type="text"
                      placeholder="Find..."
                      class=" py-[7px] text-[0.85rem] sm:text-sm border bg-white dark:bg-default shadow focus:outline-hidden border border-gray-300 dark:border-gray-600 rounded placeholder:text-gray-800 dark:placeholder:text-gray-300 px-3 focus:outline-none focus:ring-0 dark:focus:border-gray-800 grow w-full sm:min-w-56 lg:max-w-14"
                    />
                  </div>

                  <div class="ml-2">
                    <DownloadData
                      {data}
                      {rawData}
                      title={"latest_analyst_ratings_data"}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div class="w-full m-auto mt-5">
              <div
                class="w-full m-auto rounded-none sm:rounded mb-4 overflow-x-auto sm:overflow-hidden"
              >
                <table
                  class="table table-sm table-compact rounded-none sm:rounded w-full border border-gray-300 dark:border-gray-800 m-auto"
                >
                  <thead>
                    <TableHeader {columns} {sortOrders} {sortData} />
                  </thead>
                  <tbody>
                    {#each displayList as item, index}
                      <tr
                        class="dark:sm:hover:bg-[#245073]/10 odd:bg-[#F6F7F8] dark:odd:bg-odd{index +
                          1 ===
                          rawData?.length &&
                        !['Pro', 'Plus']?.includes(data?.user?.tier)
                          ? 'opacity-[0.1]'
                          : ''}"
                      >
                        <td class=" text-sm sm:text-[1rem] text-center">
                          {item?.rank}
                        </td>

                        <td
                          class="text-start text-sm sm:text-[1rem] whitespace-nowrap"
                        >
                          <a
                            href={"/hedge-funds/" + item?.cik}
                            class="text-blue-800 sm:hover:text-muted dark:sm:hover:text-white dark:text-blue-400"
                            >{formatString(item?.name)}
                          </a>
                        </td>

                        <td
                          class="text-end text-sm sm:text-[1rem] whitespace-nowrap"
                        >
                          {abbreviateNumber(item?.marketValue)}
                        </td>

                        <td
                          class="text-end text-sm sm:text-[1rem] whitespace-nowrap"
                        >
                          {new Intl.NumberFormat("en", {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(item?.numberOfStocks)}
                        </td>

                        <td
                          class="text-end text-sm sm:text-[1rem] whitespace-nowrap"
                        >
                          {item?.turnover?.toFixed(2)}
                        </td>

                        <!--
                            <td class=" text-sm sm:text-[1rem] whitespace-nowrap  text-end">
                              {item?.mainSectors?.at(0)}
                            </td>
                            -->

                        <td
                          class="text-end text-sm sm:text-[1rem] whitespace-nowrap"
                        >
                          {#if item?.performancePercentage3Year >= 0}
                            <span class="text-green-800 dark:text-[#00FC50]"
                              >+{abbreviateNumber(
                                item?.performancePercentage3Year?.toFixed(2),
                              )}%</span
                            >
                          {:else}
                            <span class="text-red-800 dark:text-[#FF2F1F]"
                              >{abbreviateNumber(
                                item?.performancePercentage3Year?.toFixed(2),
                              )}%
                            </span>
                          {/if}
                        </td>

                        <td
                          class="text-end text-sm sm:text-[1rem] whitespace-nowrap"
                        >
                          {#if item?.winRate >= 0}
                            <span class="text-green-800 dark:text-[#00FC50]"
                              >+{abbreviateNumber(
                                item?.winRate?.toFixed(2),
                              )}%</span
                            >
                          {:else}
                            <span class="text-red-800 dark:text-[#FF2F1F]"
                              >{abbreviateNumber(item?.winRate?.toFixed(2))}%
                            </span>
                          {/if}
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>

              <!-- Pagination controls -->
              {#if displayList?.length > 0}
                <div
                  class="flex flex-row items-center justify-between mt-8 sm:mt-5"
                >
                  <!-- Previous button -->
                  <div class="flex items-center gap-2">
                    <Button
                      on:click={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      class="w-fit transition-all flex flex-row items-center duration-50 border border-gray-300 dark:border-gray-700 text-white bg-black sm:hover:bg-default dark:bg-primary dark:sm:hover:bg-secondary flex flex-row justify-between items-center  sm:w-auto px-1.5 sm:px-3 rounded truncate"
                    >
                      <svg
                        class="h-5 w-5 inline-block shrink-0 rotate-90"
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
                      <span class="hidden sm:inline">Previous</span></Button
                    >
                  </div>

                  <!-- Page info and rows selector in center -->
                  <div class="flex flex-row items-center gap-4">
                    <span class="text-sm sm:text-[1rem]">
                      Page {currentPage} of {totalPages}
                    </span>

                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger asChild let:builder>
                        <Button
                          builders={[builder]}
                          class="w-fit transition-all duration-50 border border-gray-300 dark:border-gray-700 text-white bg-black sm:hover:bg-default dark:bg-primary dark:sm:hover:bg-secondary  flex flex-row justify-between items-center  sm:w-auto px-2 sm:px-3 rounded truncate"
                        >
                          <span class="truncate text-[0.85rem] sm:text-sm"
                            >{rowsPerPage} Rows</span
                          >
                          <svg
                            class="ml-0.5 mt-1 h-5 w-5 inline-block shrink-0"
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
                        class="w-auto min-w-40  max-h-[400px] overflow-y-auto scroller relative"
                      >
                        <!-- Dropdown items -->
                        <DropdownMenu.Group class="pb-2">
                          {#each rowsPerPageOptions as item}
                            <DropdownMenu.Item
                              class="sm:hover:bg-gray-200 dark:sm:hover:bg-primary"
                            >
                              <label
                                on:click={() => changeRowsPerPage(item)}
                                class="inline-flex justify-between w-full items-center cursor-pointer"
                              >
                                <span class="text-sm">{item} Rows</span>
                              </label>
                            </DropdownMenu.Item>
                          {/each}
                        </DropdownMenu.Group>
                      </DropdownMenu.Content>
                    </DropdownMenu.Root>
                  </div>

                  <!-- Next button -->
                  <div class="flex items-center gap-2">
                    <Button
                      on:click={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      class="w-fit transition-all flex flex-row items-center duration-50 border border-gray-300 dark:border-gray-700 text-white bg-black sm:hover:bg-default dark:bg-primary dark:sm:hover:bg-secondary flex flex-row justify-between items-center sm:w-auto px-1.5 sm:px-3 rounded truncate"
                    >
                      <span class="hidden sm:inline">Next</span>
                      <svg
                        class="h-5 w-5 inline-block shrink-0 -rotate-90"
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
                  </div>
                </div>

                <!-- Back to Top button -->
                <div class="flex justify-center mt-4">
                  <button
                    on:click={scrollToTop}
                    class=" cursor-pointer sm:hover:text-muted text-blue-800 dark:sm:hover:text-white dark:text-blue-400 text-sm sm:text-[1rem] font-medium"
                  >
                    Back to Top <svg
                      class="h-5 w-5 inline-block shrink-0 rotate-180"
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
                  </button>
                </div>
              {/if}
            </div>
          </main>
        </div>
      </div>
    </section>
  </body>
</section>
