<script lang="ts">
    import { displayCompanyName, stockTicker } from "$lib/store";
    import { abbreviateNumber, removeCompanyStrings } from "$lib/utils";
    import SEO from "$lib/components/SEO.svelte";
    import Infobox from "$lib/components/Infobox.svelte";
    import TableHeader from "$lib/components/Table/TableHeader.svelte";
    import { onMount } from "svelte";
    import DownloadData from "$lib/components/DownloadData.svelte";
    import NextEarnings from "$lib/components/NextEarnings.svelte";

    import highcharts from "$lib/highcharts.ts";

    export let data;

    // raw earnings & prices from backend
    let rawData: Array<any> = data?.getData || [];

    // ensure data is sorted descending by earnings date (latest first)
    rawData = [...rawData]?.sort(
        (a, b) => new Date(b?.date).getTime() - new Date(a?.date).getTime(),
    );

    // visible slice for table
    let tableList = rawData?.slice(0, 50) || [];

    const todayDateStr = new Date().toISOString().slice(0, 10);

    function isFutureDate(dateStr: string) {
        if (!dateStr) return false;
        // dates are in 'YYYY-MM-DD' so lexicographic compare works
        return dateStr > todayDateStr;
    }

    async function handleScroll() {
        const scrollThreshold = document.body.offsetHeight * 0.8; // 80% of page height
        const isBottom = window.innerHeight + window.scrollY >= scrollThreshold;
        if (isBottom && tableList?.length < rawData?.length) {
            const nextIndex = tableList.length;
            const newResults = rawData.slice(nextIndex, nextIndex + 20);
            tableList = [...tableList, ...newResults];
        }
    }

    function safeParseFloat(v: any, fallback = 0) {
        const n = parseFloat(v);
        return Number.isFinite(n) ? n : fallback;
    }

    // Table columns & sorting
    let columns = [
        { key: "date", label: "Date", align: "left" },
        { key: "period", label: "Quarter", align: "center" },
        { key: "eps", label: "EPS", align: "right" },
        { key: "eps_est", label: "EPS Est.", align: "right" },
        { key: "revenue", label: "Revenue", align: "right" },
        { key: "revenue_est", label: "Rev Est.", align: "right" },
    ];

    let sortOrders = {
        date: { order: "none", type: "date" },
        period: { order: "none", type: "string" },
        eps: { order: "none", type: "number" },
        eps_est: { order: "none", type: "number" },
        revenue: { order: "none", type: "number" },
        revenue_est: { order: "none", type: "number" },
    };

    const sortData = (key) => {
        // reset others
        for (const k in sortOrders) {
            if (k !== key) sortOrders[k].order = "none";
        }

        const orderCycle = ["none", "asc", "desc"];
        const currentIndex = orderCycle.indexOf(sortOrders[key].order);
        sortOrders[key].order =
            orderCycle[(currentIndex + 1) % orderCycle.length];
        const order = sortOrders[key].order;

        // original data is sorted descending by date already
        const originalData = [...rawData];

        if (order === "none") {
            tableList = originalData.slice(0, 20);
            return;
        }

        const compare = (a, b) => {
            const type = sortOrders[key].type;
            let va: any = a[key];
            let vb: any = b[key];

            if (key === "period") {
                // derived key
                va = `${a.period} ${a.period_year}`;
                vb = `${b.period} ${b.period_year}`;
            }

            if (type === "date") {
                va = new Date(va).getTime();
                vb = new Date(vb).getTime();
            } else if (type === "number") {
                va = safeParseFloat(va, 0);
                vb = safeParseFloat(vb, 0);
            } else {
                va = (va || "").toString().toUpperCase();
                vb = (vb || "").toString().toUpperCase();
            }

            if (order === "asc") return va < vb ? -1 : va > vb ? 1 : 0;
            return va > vb ? -1 : va < vb ? 1 : 0;
        };

        tableList = originalData.sort(compare).slice(0, 20);
    };

    onMount(() => {
        window.addEventListener("scroll", handleScroll);
        return () => {
            window.removeEventListener("scroll", handleScroll);
        };
    });
</script>

<SEO
    title={`${$displayCompanyName} (${$stockTicker}) Earnings Overview | Historical EPS & Price`}
    description={`Historical earnings, EPS surprises and stock price for ${$displayCompanyName} (${$stockTicker}). Visual earnings impact with price overlay.`}
    keywords={`${$stockTicker} earnings, ${$displayCompanyName} EPS, earnings surprise, historical price`}
    type="website"
    url={`https://stocknear.com/stocks/${$stockTicker}/statistics/earnings`}
/>

<section class=" w-full overflow-hidden h-full">
    <div
        class="w-full flex justify-center w-full sm-auto h-full overflow-hidden"
    >
        <div
            class="w-full relative flex justify-center items-center overflow-hidden"
        >
            <main class="w-full">
                <div class="sm:pl-7 sm:pb-7 sm:pt-7 m-auto mt-2 sm:mt-0">
                    <div
                        class="w-full flex flex-col sm:flex-row justify-between"
                    >
                        <h1 class="text-xl sm:text-2xl font-bold">
                            {removeCompanyStrings($displayCompanyName)} Earnings
                            Overview
                        </h1>
                    </div>

                    {#if rawData?.length > 0}
                        <div class="grid grid-cols-1 gap-2">
                            {#if data?.getNextEarnings && Object.keys(data.getNextEarnings).length > 0 && data?.getEarningsSurprise?.date !== data.getNextEarnings?.date}
                                <div class="mt-3">
                                    <NextEarnings {data} hideTitle={true} />
                                </div>
                            {/if}

                            <div
                                class="flex flex-row items-center w-full justify-between mt-3 border-t border-b border-gray-300 dark:border-gray-800 py-2"
                            >
                                <h3
                                    class=" history-driver text-xl sm:text-2xl font-bold"
                                >
                                    History
                                </h3>

                                <div
                                    class="flex flex-row items-center w-fit w-[50%] ml-auto"
                                >
                                    <DownloadData
                                        {data}
                                        {rawData}
                                        title={`earnings_${$stockTicker}`}
                                    />
                                </div>
                            </div>

                            <div class="w-full overflow-x-auto">
                                <table
                                    class="table table-sm table-compact no-scrollbar rounded-none sm:rounded w-full border border-gray-300 dark:border-gray-800 m-auto mt-2"
                                >
                                    <thead>
                                        <TableHeader
                                            {columns}
                                            {sortOrders}
                                            {sortData}
                                        />
                                    </thead>
                                    <tbody>
                                        {#each tableList as item, index}
                                            {#if index !== 0 && !isFutureDate(item.date)}
                                                <tr
                                                    class="dark:sm:hover:bg-[#245073]/10 odd:bg-[#F6F7F8] dark:odd:bg-odd"
                                                >
                                                    <td
                                                        class=" text-sm sm:text-[1rem] whitespace-nowrap"
                                                    >
                                                        {new Date(
                                                            item.date,
                                                        ).toLocaleDateString(
                                                            "en-US",
                                                            {
                                                                day: "2-digit",
                                                                month: "short",
                                                                year: "numeric",
                                                                timeZone: "UTC",
                                                            },
                                                        )}
                                                    </td>

                                                    <td
                                                        class=" text-sm sm:text-[1rem] text-center whitespace-nowrap"
                                                    >
                                                        {item.period}
                                                    </td>

                                                    <td
                                                        class=" text-sm sm:text-[1rem] text-right whitespace-nowrap"
                                                    >
                                                        {item?.eps ?? "n/a"}
                                                    </td>

                                                    <td
                                                        class=" text-sm sm:text-[1rem] text-right whitespace-nowrap"
                                                    >
                                                        {item?.eps_est ?? "n/a"}
                                                    </td>

                                                    <td
                                                        class=" text-sm sm:text-[1rem] text-right whitespace-nowrap"
                                                    >
                                                        {item.revenue
                                                            ? abbreviateNumber(
                                                                  item.revenue,
                                                              )
                                                            : "n/a"}
                                                    </td>

                                                    <td
                                                        class=" text-sm sm:text-[1rem] text-right whitespace-nowrap"
                                                    >
                                                        {item.revenue_est
                                                            ? abbreviateNumber(
                                                                  item.revenue_est,
                                                              )
                                                            : "n/a"}
                                                    </td>
                                                </tr>
                                            {/if}
                                        {/each}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    {:else}
                        <Infobox text="No data available" />
                    {/if}
                </div>
            </main>
        </div>
    </div>
</section>
