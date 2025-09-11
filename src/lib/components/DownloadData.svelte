<script lang="ts">
  import { goto } from "$app/navigation";
  import { Button } from "$lib/components/shadcn/button/index.js";
  import * as DropdownMenu from "$lib/components/shadcn/dropdown-menu";

  export let data;
  export let rawData;
  export let title;

  let isSubscribed = ["Pro", "Plus"]?.includes(data?.user?.tier) ?? false;
  const download = (format: string) => {
    if (!["Pro", "Plus"].includes(data?.user?.tier)) {
      goto("/pricing");
      return;
    }

    if (!rawData?.length) return;

    if (format === "csv") {
      exportCSV();
    } else if (format === "excel") {
      exportExcel();
    }
  };

  const generateCSVContent = () => {
    const csvRows: string[] = [];

    // Clean data first
    const cleanedData = rawData.map((row) => {
      const cleanedRow = { ...row };
      if (cleanedRow["name"]) {
        cleanedRow["name"] = cleanedRow["name"].replace(/,/g, "");
      }
      return cleanedRow;
    });

    let headers = Object.keys(cleanedData[0]);
    if (headers.includes("rank")) {
      headers = ["rank", ...headers.filter((h) => h !== "rank")];
    }

    csvRows.push(headers.join(","));

    for (const row of cleanedData) {
      const csvRow = headers
        .map((header) => {
          let value = row[header] ?? "";
          if (typeof value === "string" && /[",\n]/.test(value)) {
            value = `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(",");
      csvRows.push(csvRow);
    }

    return csvRows.join("\n");
  };

  const exportCSV = () => {
    const csv = generateCSVContent();
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("hidden", "");
    a.setAttribute("href", url);
    a.setAttribute("download", `${title}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const exportExcel = async () => {
    const { utils, writeFile } = await import("xlsx");

    const worksheet = utils.json_to_sheet(rawData);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Sheet1");
    writeFile(workbook, `${title}.xlsx`);
  };
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger asChild let:builder>
    <Button
      builders={[builder]}
      class="transition-all duration-50 border border-gray-300 dark:border-gray-700 text-white bg-black sm:hover:bg-default dark:bg-primary dark:sm:hover:bg-secondary  flex flex-row justify-between items-center  max-w-[240px] sm:w-auto px-3 rounded truncate"
    >
      <span class="truncate text-[0.85rem] sm:text-sm"> Download </span>
      <svg
        class="-mr-1 ml-1 h-5 w-5 inline-block"
        viewBox="0 0 20 20"
        fill="currentColor"
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
    class="min-w-36 w-auto max-w-60 max-h-[400px] overflow-y-auto scroller relative"
  >
    <DropdownMenu.Group>
      <DropdownMenu.Item
        on:click={() => download("csv")}
        class="sm:hover:bg-gray-300 dark:sm:hover:bg-primary cursor-pointer flex flex-row items-center justify-between"
      >
        <span>Download to CSV</span>
        {#if !isSubscribed}
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
        {/if}
      </DropdownMenu.Item>

      <DropdownMenu.Item
        on:click={() => download("excel")}
        class="sm:hover:bg-gray-300 dark:sm:hover:bg-primary cursor-pointer flex flex-row items-center justify-between"
      >
        <span>Download to Excel</span>
        {#if !isSubscribed}
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
        {/if}
      </DropdownMenu.Item>
    </DropdownMenu.Group>
  </DropdownMenu.Content>
</DropdownMenu.Root>
