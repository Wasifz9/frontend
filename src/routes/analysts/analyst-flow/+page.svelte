<script lang="ts">
  import TableHeader from "$lib/components/Table/TableHeader.svelte";
  import UpgradeToPro from "$lib/components/UpgradeToPro.svelte";
  import SEO from "$lib/components/SEO.svelte";
  import AnalystInfo from "$lib/components/AnalystInfo.svelte";
  import DownloadData from "$lib/components/DownloadData.svelte";
  import Infobox from "$lib/components/Infobox.svelte";

  import { screenWidth } from "$lib/store";
  import { onMount } from "svelte";

  export let data;

  let rawData = data?.getData;
  let inputValue = "";
  let searchWorker: Worker | undefined;

  let stockList = rawData?.slice(0, 50);

  async function handleScroll() {
    const scrollThreshold = document.body.offsetHeight * 0.8; // 80% of the website height
    const isBottom = window.innerHeight + window.scrollY >= scrollThreshold;
    if (isBottom && stockList?.length !== rawData?.length) {
      const nextIndex = stockList?.length;
      const filteredNewResults = rawData?.slice(nextIndex, nextIndex + 25);
      stockList = [...stockList, ...filteredNewResults];
    }
  }

  async function resetTableSearch() {
    inputValue = "";
    search();
  }

  async function search() {
    inputValue = inputValue?.toLowerCase();

    setTimeout(async () => {
      if (inputValue?.length > 0) {
        await loadSearchWorker();
      } else {
        // Reset to original data if filter is empty
        rawData = data?.getData || [];
        stockList = rawData?.slice(0, 50);
      }
    }, 100);
  }

  const loadSearchWorker = async () => {
    if (searchWorker && rawData?.length > 0) {
      searchWorker.postMessage({
        rawData: data?.getData,
        inputValue: inputValue,
      });
    }
  };

  const handleSearchMessage = (event) => {
    if (event.data?.message === "success") {
      rawData = event.data?.output ?? [];
      stockList = rawData?.slice(0, 50);
    }
  };

  onMount(async () => {
    if (!searchWorker) {
      const SearchWorker = await import(
        "$lib/workers/tableSearchWorker?worker"
      );
      searchWorker = new SearchWorker.default();
      searchWorker.onmessage = handleSearchMessage;
    }

    if (["Pro", "Plus"]?.includes(data?.user?.tier)) {
      window.addEventListener("scroll", handleScroll);
      return () => {
        window.removeEventListener("scroll", handleScroll);
      };
    }
  });

  $: columns = [
    { key: "analystScore", label: "Rank", align: "left" },
    { key: "analystName", label: "Analyst", align: "left" },
    { key: "symbol", label: "Symbol", align: "left" },
    { key: "name", label: "Name", align: "left" },
    { key: "rating_current", label: "Action", align: "left" },
    { key: "adjusted_pt_current", label: "Price Target", align: "right" },
    { key: "upside", label: "Upside [%]", align: "right" },
    { key: "date", label: "Date", align: "right" },
  ];

  let sortOrders = {
    analystName: { order: "none", type: "string" },
    analystScore: { order: "none", type: "number" },
    filingDate: { order: "none", type: "date" },
    symbol: { order: "none", type: "string" },
    name: { order: "none", type: "string" },
    rating_current: { order: "none", type: "string" },
    adjusted_pt_current: { order: "none", type: "number" },
    upside: { order: "none", type: "number" },
    date: { order: "none", type: "date" },
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
      stockList = [...originalData]?.slice(0, 50); // Reset to original data (spread to avoid mutation)
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
    stockList = [...originalData].sort(compareValues)?.slice(0, 50);
  };

  $: charNumber = $screenWidth < 640 ? 20 : 40;
</script>

<SEO
  title="Analyst Flow - Latest Wall Street Analyst Ratings & Stock Recommendations"
  description="Real-time Wall Street analyst ratings, stock upgrades, downgrades, and price target changes. Track the latest analyst recommendations, buy/sell ratings, and investment insights from top research firms."
  keywords="analyst flow, latest analyst ratings, stock upgrades, stock downgrades, analyst price targets, Wall Street recommendations, real-time analyst activity, buy sell ratings, research analyst updates"
  structuredData={{
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Analyst Flow - Latest Ratings",
    description:
      "Real-time feed of Wall Street analyst ratings and stock recommendations",
    url: "https://stocknear.com/analysts/analyst-flow",
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
          name: "Analysts",
          item: "https://stocknear.com/analysts",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Analyst Flow",
          item: "https://stocknear.com/analysts/analyst-flow",
        },
      ],
    },
    mainEntity: {
      "@type": "ItemList",
      name: "Latest Analyst Ratings",
      description:
        "Real-time feed of analyst ratings and stock recommendations",
      numberOfItems: rawData?.length || 0,
    },
  }}
/>

<section
  class="w-full max-w-3xl sm:max-w-[1400px] overflow-hidden min-h-screen pb-20 pt-5 px-4 lg:px-3"
>
  <div class="text-sm sm:text-[1rem] breadcrumbs">
    <ul>
      <li><a href="/" class="text-muted dark:text-gray-300">Home</a></li>
      <li class="text-muted dark:text-gray-300">Analyst Live Flow</li>
    </ul>
  </div>

  <div class="w-full overflow-hidden m-auto mt-5">
    <div class="sm:p-0 flex justify-center w-full m-auto overflow-hidden">
      <div
        class="relative flex justify-center items-start overflow-hidden w-full"
      >
        <main class="w-full lg:pr-5">
          <div class=" border-[#2C6288] dark:border-white border-b-[2px]">
            <h1 class="mb-3 text-2xl sm:text-3xl font-bold">
              Latest Analyst Ratings
            </h1>
          </div>

          <Infobox
            text="Latest insights from Wall Street analysts in real-time."
          />

          <div class="items-center lg:overflow-visible px-1 py-1 mt-4">
            <div
              class="col-span-2 flex flex-col lg:flex-row items-start sm:items-center lg:order-2 lg:grow py-1 border-t border-b border-gray-300 dark:border-gray-800"
            >
              <h2
                class="text-start whitespace-nowrap text-xl sm:text-2xl font-semibold py-1 border-b border-gray-300 dark:border-gray-800 lg:border-none w-full"
              >
                {rawData?.length?.toLocaleString("en-US")} Ratings
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

          <div class="w-full m-auto mt-4">
            <div
              class="w-full m-auto rounded-none sm:rounded mb-4 overflow-x-auto"
            >
              <table
                class="table table-sm table-compact no-scrollbar rounded-none sm:rounded w-full border border-gray-300 dark:border-gray-800 m-auto"
              >
                <thead>
                  <TableHeader {columns} {sortOrders} {sortData} />
                </thead>
                <tbody>
                  {#each ["Plus", "Pro"]?.includes(data?.user?.tier) ? stockList : stockList?.slice(0, 6) as item, index}
                    <tr
                      class="dark:sm:hover:bg-[#245073]/10 odd:bg-[#F6F7F8] dark:odd:bg-odd {index +
                        1 ===
                        (!['Pro', 'Plus']?.includes(data?.user?.tier)
                          ? stockList?.slice(0, 6)?.length
                          : 0) && !['Pro', 'Plus']?.includes(data?.user?.tier)
                        ? 'opacity-[0.1]'
                        : ''}"
                    >
                      <td
                        class="text-sm sm:text-[1rem] whitespace-nowrap flex flex-row mt-2.5 sm:mt-0 items-center"
                      >
                        <div>{item?.analystScore?.toFixed(1)}</div>
                        <svg
                          class="ml-1 w-4 h-4"
                          aria-hidden="true"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="#FFA500"
                          viewBox="0 0 22 20"
                        >
                          <path
                            d="M20.924 7.625a1.523 1.523 0 0 0-1.238-1.044l-5.051-.734-2.259-4.577a1.534 1.534 0 0 0-2.752 0L7.365 5.847l-5.051.734A1.535 1.535 0 0 0 1.463 9.2l3.656 3.563-.863 5.031a1.532 1.532 0 0 0 2.226 1.616L11 17.033l4.518 2.375a1.534 1.534 0 0 0 2.226-1.617l-.863-5.03L20.537 9.2a1.523 1.523 0 0 0 .387-1.575Z"
                          />
                        </svg>
                      </td>

                      <td
                        class="text-sm sm:text-[1rem] text-start whitespace-nowrap"
                      >
                        <a
                          href={`/analysts/${item?.analystId}`}
                          class="text-blue-800 sm:hover:text-muted dark:text-blue-400 dark:sm:hover:text-white"
                          >{item?.analystName}</a
                        >
                      </td>

                      <td
                        class="text-sm sm:text-[1rem] text-start whitespace-nowrap"
                      >
                        <a
                          href={`/stocks/${item?.symbol}`}
                          class="text-blue-800 sm:hover:text-muted dark:text-blue-400 dark:sm:hover:text-white"
                          >{item?.symbol}</a
                        >
                      </td>

                      <td
                        class="text-sm sm:text-[1rem] text-start whitespace-nowrap"
                      >
                        {item?.name?.length > charNumber
                          ? item?.name?.slice(0, charNumber) + "..."
                          : item?.name}
                      </td>

                      <td
                        class="text-sm sm:text-[1rem] text-start whitespace-nowrap"
                      >
                        <div class="flex flex-col sm:flex-row items-start">
                          <span class="mr-1">{item?.action}:</span>
                          <span>
                            {item?.rating_current}
                          </span>
                        </div>
                      </td>

                      <td class=" text-sm sm:text-[1rem] whitespace-nowrap">
                        <div class="flex flex-row items-center justify-end">
                          {#if Math?.ceil(item?.adjusted_pt_prior) !== 0}
                            <span
                              class="text-muted dark:text-gray-100 font-normal"
                              >{Math?.ceil(item?.adjusted_pt_prior)}</span
                            >
                            <svg
                              class="w-3 h-3 ml-1 mr-1 inline-block"
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              ><path
                                fill="none"
                                stroke="currentColor"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="1.5"
                                d="M4 12h16m0 0l-6-6m6 6l-6 6"
                              /></svg
                            >
                            <span class=" font-semibold"
                              >{Math?.ceil(item?.adjusted_pt_current)}</span
                            >
                          {:else if Math?.ceil(item?.adjusted_pt_current) !== 0}
                            <span class=" font-semibold"
                              >{Math?.ceil(item?.adjusted_pt_current)}</span
                            >
                          {:else}
                            n/a
                          {/if}
                        </div>
                      </td>

                      <td
                        class="{item?.upside >= 0 && item?.upside !== null
                          ? "before:content-['+'] text-green-800 dark:text-[#00FC50]"
                          : item?.upside < 0 && item?.upside !== null
                            ? 'text-red-800 dark:text-[#FF2F1F]'
                            : ''} text-end text-sm sm:text-[1rem] whitespace-nowrap"
                      >
                        {item?.upside !== null ? item?.upside + "%" : "n/a"}
                      </td>

                      <td
                        class=" text-end text-sm sm:text-[1rem] whitespace-nowrap"
                      >
                        {new Date(item?.date).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          daySuffix: "2-digit",
                        })}
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>

          <UpgradeToPro {data} />
          <AnalystInfo />
        </main>
      </div>
    </div>
  </div>
</section>
