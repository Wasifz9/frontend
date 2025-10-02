<script lang="ts">
  import ArrowLogo from "lucide-svelte/icons/move-up-right";
  import SEO from "$lib/components/SEO.svelte";
  import Infobox from "$lib/components/Infobox.svelte";
  import Pagination from "$lib/components/Table/Pagination.svelte";
  import { mode } from "mode-watcher";

  export let data;

  let rawData = data?.getData;

  // Pagination state
  let currentPage = 1;
  let rowsPerPage = 20;
  let rowsPerPageOptions = [20, 50, 100];
  let totalPages = 1;
  let stockList = [];

  // Function to update paginated data
  function updatePaginatedData() {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    stockList = rawData?.slice(startIndex, endIndex) || [];
    totalPages = Math.ceil((rawData?.length || 0) / rowsPerPage);
  }

  // Handle page change event from Pagination component
  function handlePageChange(event) {
    currentPage = event.detail.page;
    updatePaginatedData();
  }

  // Handle rows per page change event from Pagination component
  function handleRowsPerPageChange(event) {
    rowsPerPage = event.detail.rowsPerPage;
    currentPage = 1; // Reset to first page when changing rows per page
    updatePaginatedData();
  }

  // Update pagination when rawData changes
  $: if (rawData && rawData.length > 0) {
    updatePaginatedData();
  }
</script>

<SEO
  title="Stock Market News Flow - Real-Time Financial News & Market Updates"
  description="Track real-time stock market news and understand why prices moved. Get instant access to breaking financial news, market updates, and stock price movements with detailed explanations. Free real-time news flow tracker."
  keywords="stock market news, financial news, market updates, stock news flow, real-time news, breaking news stocks, price movement news, market news tracker, stock alerts, financial updates"
  structuredData={{
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Stock Market News Flow",
    description:
      "Real-time stock market news tracker with price movement explanations",
    url: "https://stocknear.com/news-flow",
    applicationCategory: "FinanceApplication",
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
          name: "News Flow",
          item: "https://stocknear.com/news-flow",
        },
      ],
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  }}
/>

<section
  class="w-full max-w-3xl sm:max-w-[1400px] overflow-hidden min-h-screen pb-20 pt-5 px-4 lg:px-3 text-muted dark:text-white"
>
  <div class="text-sm sm:text-[1rem] breadcrumbs">
    <ul>
      <li><a href="/" class="text-muted dark:text-gray-300">Home</a></li>
      <li class="text-muted dark:text-gray-300">News Flow</li>
    </ul>
  </div>

  <div class="w-full overflow-hidden m-auto mt-5">
    <div class="sm:p-0 flex justify-center w-full m-auto overflow-hidden">
      <div
        class="relative flex justify-center items-start overflow-hidden w-full"
      >
        <main class="w-full lg:w-3/4 lg:pr-5">
          <div class="mb-3">
            <h1 class="mb-1 text-2xl sm:text-3xl font-bold">News Flow</h1>
          </div>

          <Infobox text="Track the latest breaking news and understand why stock prices moved in real-time" />

          {#if stockList?.length > 0}
            <table
              class="border-t border-gray-300 dark:border-gray-800 text-sm sm:text-[1rem] mt-6"
            >
              <tbody>
                {#each stockList as item, index}
                  {@const isPositive = item?.changesPercentage > 0}
                  {@const isNegative = item?.changesPercentage < 0}
                  <tr
                    class="border-b border-gray-300 dark:border-gray-800 transition-all duration-200"
                    style="background: {(() => {
                      const baseColor =
                        $mode === 'light' ? '#ffffff' : '#09090B';

                      if ($mode === 'light') {
                        if (isPositive) {
                          return `linear-gradient(90deg, ${baseColor} 0%, rgba(34, 197, 94, 0.1) 50%, rgba(34, 197, 94, 0.13) 100%)`;
                        }
                        if (isNegative) {
                          return `linear-gradient(90deg, ${baseColor} 0%, rgba(238, 83, 101, 0.1) 50%, rgba(238, 83, 101, 0.13) 100%)`;
                        }
                      } else {
                        // Dark mode
                        if (isPositive) {
                          return `linear-gradient(90deg, ${baseColor} 0%, rgba(0, 252, 80, 0.1) 50%, rgba(0, 252, 80, 0.16) 100%)`;
                        }
                        if (isNegative) {
                          return `linear-gradient(90deg, ${baseColor} 0%, rgba(238, 83, 101, 0.1) 50%, rgba(238, 83, 101, 0.16) 100%)`;
                        }
                      }
                      return baseColor;
                    })()}"
                    ><td
                      class="hidden sm:inline-block pr-1 pt-2 align-top text-sm whitespace-nowrap font-bold"
                      >{item?.timeAgo}</td
                    >
                    <td class="py-2 pl-2">
                      <span class="sm:hidden font-semibold"
                        >{item?.timeAgo} ago -</span
                      >
                      {item?.text}

                      <a
                        href={`/${item?.assetType}/${item?.ticker}`}
                        class="inline-block rounded badge border border-gray-300 dark:border-gray-800 shadow-xs duration-0 bg-blue-100 dark:bg-secondary font-semibold dark:font-normal rounded-sm ml-1 px-2 m-auto text-blue-800 dark:text-blue-400 dark:sm:hover:text-white sm:hover:text-muted"
                        >{item?.ticker}</a
                      >
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          {:else}
            <Infobox
              text="There are no major stock market news available yet."
            />
          {/if}

          {#if stockList?.length > 0}
            <Pagination
              {currentPage}
              {totalPages}
              {rowsPerPage}
              {rowsPerPageOptions}
              on:pageChange={handlePageChange}
              on:rowsPerPageChange={handleRowsPerPageChange}
            />
          {/if}
        </main>

        <aside class="hidden lg:block relative fixed w-1/4 ml-4">
          <div
            class="w-full border border-gray-300 dark:border-gray-600 rounded h-fit pb-4 mt-4 cursor-pointer sm:hover:shadow-lg dark:sm:hover:bg-secondary transition ease-out duration-100"
          >
            <a
              href="/market-flow"
              class="w-auto lg:w-full p-1 flex flex-col m-auto px-2 sm:px-0"
            >
              <div class="w-full flex justify-between items-center p-3 mt-3">
                <h2 class="text-start text-xl font-bold ml-3">Market Flow</h2>
                <ArrowLogo
                  class="w-8 h-8 mr-3 shrink-0 text-gray-400 dark:text-white"
                />
              </div>
              <span class=" p-3 ml-3 mr-3">
                Follow the latest executive orders of the US President
              </span>
            </a>
          </div>

          <div
            class="w-full border border-gray-300 dark:border-gray-600 rounded h-fit pb-4 mt-4 cursor-pointer sm:hover:shadow-lg dark:sm:hover:bg-secondary transition ease-out duration-100"
          >
            <a
              href="/insider-tracker"
              class="w-auto lg:w-full p-1 flex flex-col m-auto px-2 sm:px-0"
            >
              <div class="w-full flex justify-between items-center p-3 mt-3">
                <h2 class="text-start text-xl font-bold ml-3">Options Flow</h2>
                <ArrowLogo
                  class="w-8 h-8 mr-3 shrink-0 text-gray-400 dark:text-white"
                />
              </div>
              <span class=" p-3 ml-3 mr-3">
                Get the latest unusual insider trading in realtime
              </span>
            </a>
          </div>
          <div
            class="w-full border border-gray-300 dark:border-gray-600 rounded h-fit pb-4 mt-4 cursor-pointer sm:hover:shadow-lg dark:sm:hover:bg-secondary transition ease-out duration-100"
          >
            <a
              href="/dark-pool-flow"
              class="w-auto lg:w-full p-1 flex flex-col m-auto px-2 sm:px-0"
            >
              <div class="w-full flex justify-between items-center p-3 mt-3">
                <h2 class="text-start text-xl font-bold ml-3">
                  Dark Pool Flow
                </h2>
                <ArrowLogo
                  class="w-8 h-8 mr-3 shrink-0 text-gray-400 dark:text-white"
                />
              </div>
              <span class=" p-3 ml-3 mr-3">
                Get the latest unusual insider trading in realtime
              </span>
            </a>
          </div>
        </aside>
      </div>
    </div>
  </div>
</section>
