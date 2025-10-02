<script lang="ts">
  import ArrowLogo from "lucide-svelte/icons/move-up-right";
  import SEO from "$lib/components/SEO.svelte";
  import Infobox from "$lib/components/Infobox.svelte";

  export let data;

  let timePeriod = "oneWeek";
  let rawData = data?.getData;
  let stockList = rawData?.slice(0, 50);
</script>

<SEO
  title="Reddit Stock Tracker - WallStreetBets Analytics & WSB Sentiment "
  description="Track WallStreetBets (WSB) stock discussions, sentiment analysis, and trending stocks from Reddit. Monitor r/wallstreetbets mentions, sentiment scores, and social trading insights. Free Reddit stock tracker with real-time data."
  keywords="wallstreetbets, wsb tracker, reddit stocks, wsb sentiment, reddit trading, wallstreetbets tracker, wsb analytics, reddit stock mentions, social trading, wsb data"
  structuredData={{
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Reddit Stock Tracker",
    description:
      "WallStreetBets and Reddit stock discussion tracker with sentiment analysis",
    url: "https://stocknear.com/reddit-tracker",
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
          name: "Reddit Tracker",
          item: "https://stocknear.com/reddit-tracker",
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

          <Infobox text="Latest Breaking news why the priced moved" />

          {#if stockList?.length > 0}
            <table
              class="border-t border-gray-300 dark:border-gray-800 text-sm sm:text-[1rem] mt-6"
            >
              <tbody>
                {#each stockList as item}
                  <tr class="border-b border-gray-300 dark:border-gray-800"
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
                        class="inline-block rounded badge border border-gray-300 dark:border-gray-800 shadow-xs duration-0 bg-blue-100 dark:bg-primary font-semibold dark:font-normal rounded-sm ml-1 px-2 m-auto text-blue-800 dark:text-blue-400 dark:sm:hover:text-white sm:hover:text-muted"
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
        </main>

        <aside class="hidden lg:block relative fixed w-1/4 ml-4">
          <div
            class="w-full border border-gray-300 dark:border-gray-600 rounded h-fit pb-4 mt-4 cursor-pointer sm:hover:shadow-lg dark:sm:hover:bg-secondary transition ease-out duration-100"
          >
            <a
              href="/potus-tracker"
              class="w-auto lg:w-full p-1 flex flex-col m-auto px-2 sm:px-0"
            >
              <div class="w-full flex justify-between items-center p-3 mt-3">
                <h2 class="text-start text-xl font-bold ml-3">POTUS Tracker</h2>
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
                <h2 class="text-start text-xl font-bold ml-3">
                  Insider Tracker
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
