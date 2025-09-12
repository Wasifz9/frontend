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
    import { mode } from "mode-watcher";

    export let data;

    // raw earnings & prices from backend
    let rawData: Array<any> = data?.getData?.historicalEarnings || [];
    let rawPrices: Array<any> = data?.getData?.historicalPrice || [];

    // ensure data is sorted descending by earnings date (latest first)
    rawData = [...rawData].sort(
        (a, b) => new Date(b?.date).getTime() - new Date(a?.date).getTime(),
    );
    rawPrices = [...rawPrices].sort(
        (a, b) => new Date(a?.date).getTime() - new Date(b?.date).getTime(),
    ); // ascending for priceSeries

    // visible slice for table
    let tableList = rawData?.slice(0, 20) || [];

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

    // utility: find closest price point (by absolute time diff)
    function findClosestPrice(dateStr: string) {
        if (!rawPrices || rawPrices.length === 0) return null;
        const t = new Date(dateStr).getTime();
        let best = null;
        let bestDiff = Infinity;
        for (let i = 0; i < rawPrices.length; i++) {
            const p = rawPrices[i];
            const pt = new Date(p.date).getTime();
            const diff = Math.abs(pt - t);
            if (diff < bestDiff) {
                bestDiff = diff;
                best = p;
            }
            // optimization: if price dates are ascending and pt > t and diff starts increasing afterwards
            // but keep simple for readability
        }
        return best;
    }

    function safeParseFloat(v: any, fallback = 0) {
        const n = parseFloat(v);
        return Number.isFinite(n) ? n : fallback;
    }

    // Chart config
    let config = null;

    function plotData() {
        if (
            !rawData ||
            rawData.length === 0 ||
            !rawPrices ||
            rawPrices.length === 0
        ) {
            return {};
        }

        // Helper function to calculate price change after earnings
        function calculatePriceImpact(earningsDate, prices) {
            const dateMs = new Date(earningsDate).getTime();
            const dayAfter = dateMs + 24 * 60 * 60 * 1000;
            const weekAfter = dateMs + 7 * 24 * 60 * 60 * 1000;

            const priceOnDate = findClosestPrice(earningsDate);
            const priceNextDay = findClosestPrice(
                new Date(dayAfter).toISOString().split("T")[0],
            );
            const priceNextWeek = findClosestPrice(
                new Date(weekAfter).toISOString().split("T")[0],
            );

            return {
                immediate: priceOnDate,
                nextDay: priceNextDay,
                nextWeek: priceNextWeek,
                dayChange:
                    priceNextDay && priceOnDate
                        ? ((parseFloat(priceNextDay.price) -
                              parseFloat(priceOnDate.price)) /
                              parseFloat(priceOnDate.price)) *
                          100
                        : null,
                weekChange:
                    priceNextWeek && priceOnDate
                        ? ((parseFloat(priceNextWeek.price) -
                              parseFloat(priceOnDate.price)) /
                              parseFloat(priceOnDate.price)) *
                          100
                        : null,
            };
        }

        // Prepare price series
        const priceSeries = rawPrices
            .map((h) => [
                new Date(h.date).getTime(),
                safeParseFloat(h.price, null),
            ])
            .filter((p) => p[1] !== null);

        // Prepare earnings events with enhanced data
        const earningsEvents = [];
        const beatEvents = [];
        const missEvents = [];
        const plotBands = [];
        const annotations = [];

        for (const e of rawData) {
            const matched = findClosestPrice(e.date);
            if (!matched) continue;

            const yPrice = safeParseFloat(matched.price, null);
            if (yPrice === null) continue;

            const epsSurprise = safeParseFloat(e.eps_surprise, 0);
            const epsSurprisePercent = safeParseFloat(
                e.eps_surprise_percent,
                0,
            );
            const priceImpact = calculatePriceImpact(e.date, rawPrices);

            // Determine if beat or miss
            const isBeat = epsSurprise > 0;
            const eventTime = new Date(e.date).getTime();

            // Create event data point
            const eventPoint = {
                x: eventTime,
                y: yPrice,
                eps: e.eps,
                eps_est: e.eps_est,
                eps_surprise: epsSurprise,
                eps_surprise_percent: epsSurprisePercent,
                period: `${e.period} ${e.period_year}`,
                revenue: e.revenue,
                revenue_est: e.revenue_est,
                date: e.date,
                priceImpact: priceImpact,
                isBeat: isBeat,
            };

            // Separate beat and miss events for different styling
            if (isBeat) {
                beatEvents.push({
                    ...eventPoint,
                    marker: {
                        radius: Math.min(
                            12,
                            6 + Math.abs(epsSurprisePercent) / 5,
                        ),
                        fillColor: "rgba(34, 197, 94, 0.8)",
                        lineColor: "rgba(34, 197, 94, 1)",
                        lineWidth: 2,
                        symbol: "circle",
                    },
                });
            } else {
                missEvents.push({
                    ...eventPoint,
                    marker: {
                        radius: Math.min(
                            12,
                            6 + Math.abs(epsSurprisePercent) / 5,
                        ),
                        fillColor: "rgba(239, 68, 68, 0.8)",
                        lineColor: "rgba(239, 68, 68, 1)",
                        lineWidth: 2,
                        symbol: "circle",
                    },
                });
            }

            // Add plot band for earnings date
            plotBands.push({
                from: eventTime - 12 * 60 * 60 * 1000, // 12 hours before
                to: eventTime + 12 * 60 * 60 * 1000, // 12 hours after
                color: isBeat
                    ? "rgba(34, 197, 94, 0.08)"
                    : "rgba(239, 68, 68, 0.08)",
                zIndex: 1,
            });

            // Add annotation for significant surprises
            if (Math.abs(epsSurprisePercent) > 10) {
                annotations.push({
                    labels: [
                        {
                            point: {
                                xAxis: 0,
                                yAxis: 0,
                                x: eventTime,
                                y: yPrice,
                            },
                            text: `${isBeat ? "↑" : "↓"} ${Math.abs(epsSurprisePercent).toFixed(0)}%`,
                            backgroundColor: isBeat
                                ? "rgba(34, 197, 94, 0.9)"
                                : "rgba(239, 68, 68, 0.9)",
                            borderColor: "transparent",
                            style: {
                                color: "white",
                                fontSize: "11px",
                                fontWeight: "bold",
                            },
                            borderRadius: 3,
                            padding: 3,
                            y: isBeat ? -25 : 25,
                        },
                    ],
                });
            }
        }

        const isDarkMode = $mode === "dark";
        const textColor = isDarkMode ? "#e5e7eb" : "#374151";
        const bgColor = isDarkMode ? "#09090B" : "#ffffff";
        const gridColor = isDarkMode ? "#1f2937" : "#f3f4f6";

        const options = {
            credits: { enabled: false },
            chart: {
                backgroundColor: bgColor,
                plotBackgroundColor: bgColor,
                height: 500,
                animation: false,
                zoomType: "x",
                panning: true,
                panKey: "shift",
            },
            title: {
                text: `<div class="mt-3 -mb-3">
                <h3 class="text-lg sm:text-xl font-semibold">Earnings Impact on Stock Price</h3>
                <p class="text-xs sm:text-sm opacity-70 mt-1">
                    <span style="color: #22c55e;">● Earnings Beat</span> 
                    <span style="color: #ef4444; margin-left: 12px;">● Earnings Miss</span>
                    <span style="margin-left: 12px; opacity: 0.6;">Bubble size = surprise magnitude</span>
                </p>
            </div>`,
                useHTML: true,
                align: "left",
                style: { color: textColor },
            },
            xAxis: {
                type: "datetime",
                crosshair: {
                    width: 1,
                    color: isDarkMode
                        ? "rgba(255, 255, 255, 0.2)"
                        : "rgba(0, 0, 0, 0.1)",
                    dashStyle: "ShortDot",
                },
                plotBands: plotBands,
                labels: {
                    style: { color: textColor },
                },
                gridLineWidth: 0,
            },
            yAxis: {
                title: {
                    text: "Stock Price ($)",
                    style: { color: textColor, fontWeight: "500" },
                },
                labels: {
                    style: { color: textColor },
                    formatter: function () {
                        return (
                            "$" +
                            (this.value?.toFixed
                                ? this.value.toFixed(0)
                                : this.value)
                        );
                    },
                },
                gridLineWidth: 1,
                gridLineColor: gridColor,
                gridLineDashStyle: "ShortDot",
            },
            tooltip: {
                shared: false,
                useHTML: true,
                backgroundColor: isDarkMode
                    ? "rgba(17, 24, 39, 0.95)"
                    : "rgba(255, 255, 255, 0.95)",
                borderColor: isDarkMode
                    ? "rgba(55, 65, 81, 0.5)"
                    : "rgba(229, 231, 235, 0.8)",
                borderWidth: 1,
                borderRadius: 8,
                shadow: {
                    color: "rgba(0, 0, 0, 0.1)",
                    offsetX: 0,
                    offsetY: 2,
                    opacity: 0.5,
                    width: 3,
                },
                style: {
                    color: textColor,
                    fontSize: "13px",
                    padding: "0",
                },
                formatter: function () {
                    if (this.series.name === "Stock Price") {
                        return `<div class="p-2">
                        <div class="font-semibold">${Highcharts.dateFormat("%b %d, %Y", this.x)}</div>
                        <div class="mt-1">Price: <span class="font-semibold">$${this.y.toFixed(2)}</span></div>
                    </div>`;
                    } else {
                        const p = this.point;
                        const surpriseColor = p.isBeat ? "#22c55e" : "#ef4444";
                        const surpriseIcon = p.isBeat ? "▲" : "▼";
                        const dayChangeColor =
                            p.priceImpact?.dayChange > 0
                                ? "#22c55e"
                                : "#ef4444";
                        const weekChangeColor =
                            p.priceImpact?.weekChange > 0
                                ? "#22c55e"
                                : "#ef4444";

                        return `
                        <div class="p-3" style="min-width: 280px;">
                            <div class="font-bold text-base mb-2" style="color: ${surpriseColor};">
                                ${surpriseIcon} ${p.period} Earnings ${p.isBeat ? "Beat" : "Miss"}
                            </div>
                            <div class="text-xs opacity-60 mb-2">${p.date}</div>
                            
                            <div class="border-t pt-2 mb-2" style="border-color: ${isDarkMode ? "#374151" : "#e5e7eb"};">
                                <div class="flex justify-between mb-1">
                                    <span>EPS Actual:</span>
                                    <span class="font-semibold">${p.eps}</span>
                                </div>
                                <div class="flex justify-between mb-1">
                                    <span>EPS Estimate:</span>
                                    <span>${p.eps_est}</span>
                                </div>
                                <div class="flex justify-between mb-1">
                                    <span>Surprise:</span>
                                    <span class="font-semibold" style="color: ${surpriseColor};">
                                        ${p.eps_surprise > 0 ? "+" : ""}${p.eps_surprise} (${p.eps_surprise_percent > 0 ? "+" : ""}${p.eps_surprise_percent.toFixed(1)}%)
                                    </span>
                                </div>
                            </div>
                            
                            ${
                                p.revenue
                                    ? `
                            <div class="border-t pt-2 mb-2" style="border-color: ${isDarkMode ? "#374151" : "#e5e7eb"};">
                                <div class="flex justify-between mb-1">
                                    <span>Revenue:</span>
                                    <span class="font-semibold">${abbreviateNumber(p.revenue)}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span>Rev. Estimate:</span>
                                    <span>${abbreviateNumber(p.revenue_est || 0)}</span>
                                </div>
                            </div>
                            `
                                    : ""
                            }
                            
                            ${
                                p.priceImpact?.dayChange !== null
                                    ? `
                            <div class="border-t pt-2" style="border-color: ${isDarkMode ? "#374151" : "#e5e7eb"};">
                                <div class="font-semibold mb-1">Price Impact:</div>
                                <div class="flex justify-between mb-1">
                                    <span>Next Day:</span>
                                    <span class="font-semibold" style="color: ${dayChangeColor};">
                                        ${p.priceImpact.dayChange > 0 ? "+" : ""}${p.priceImpact.dayChange.toFixed(2)}%
                                    </span>
                                </div>
                                ${
                                    p.priceImpact?.weekChange !== null
                                        ? `
                                <div class="flex justify-between">
                                    <span>Next Week:</span>
                                    <span class="font-semibold" style="color: ${weekChangeColor};">
                                        ${p.priceImpact.weekChange > 0 ? "+" : ""}${p.priceImpact.weekChange.toFixed(2)}%
                                    </span>
                                </div>
                                `
                                        : ""
                                }
                            </div>
                            `
                                    : ""
                            }
                        </div>
                    `;
                    }
                },
            },
            plotOptions: {
                series: {
                    animation: false,
                    turboThreshold: 0,
                    states: {
                        hover: {
                            lineWidthPlus: 0,
                        },
                    },
                },
                area: {
                    lineWidth: 2,
                    fillOpacity: 0.1,
                    marker: {
                        enabled: false,
                        states: {
                            hover: {
                                enabled: true,
                                radius: 4,
                            },
                        },
                    },
                },
                scatter: {
                    cursor: "pointer",
                    states: {
                        hover: {
                            enabled: true,
                        },
                    },
                },
            },
            legend: {
                enabled: false,
            },
            annotations: annotations,
            series: [
                {
                    name: "Stock Price",
                    type: "area",
                    data: priceSeries,
                    color: "#6366f1",
                    fillColor: {
                        linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                        stops: [
                            [
                                0,
                                isDarkMode
                                    ? "rgba(99, 102, 241, 0.2)"
                                    : "rgba(99, 102, 241, 0.15)",
                            ],
                            [
                                1,
                                isDarkMode
                                    ? "rgba(99, 102, 241, 0.02)"
                                    : "rgba(99, 102, 241, 0.01)",
                            ],
                        ],
                    },
                    zIndex: 1,
                },
                {
                    name: "Earnings Beat",
                    type: "scatter",
                    data: beatEvents,
                    color: "#22c55e",
                    zIndex: 5,
                },
                {
                    name: "Earnings Miss",
                    type: "scatter",
                    data: missEvents,
                    color: "#ef4444",
                    zIndex: 5,
                },
            ],
        };

        return options;
    }
    $: config = plotData();

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
                                class="flex flex-col sm:flex-row items-start sm:items-center w-full mt-3"
                            >
                                <h2 class="text-xl sm:text-2xl font-bold">
                                    Historical Chart
                                </h2>
                            </div>

                            <div class="chart-driver">
                                <div class="grow">
                                    <div class="relative">
                                        <div
                                            class=" border border-gray-300 dark:border-gray-800 rounded"
                                            use:highcharts={config}
                                        ></div>
                                    </div>
                                </div>
                            </div>

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
