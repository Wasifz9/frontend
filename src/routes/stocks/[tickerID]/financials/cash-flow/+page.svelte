<script lang="ts">
  import { displayCompanyName, stockTicker } from "$lib/store";

  import SEO from "$lib/components/SEO.svelte";
  import FinancialSection from "$lib/components/FinancialSection.svelte";

  export let data;

  const statementConfig = [
    {
      propertyName: "netIncome",
      label: "Net Income",
    },
    {
      propertyName: "depreciationAndAmortization",
      label: "Depreciation & Amortization",
    },
    {
      propertyName: "stockBasedCompensation",
      label: "Stock-Based Compensation",
    },
    {
      propertyName: "otherWorkingCapital",
      label: "Other Working Capital",
    },
    {
      propertyName: "otherNonCashItems",
      label: "Other Non-Cash Items",
    },
    {
      propertyName: "deferredIncomeTax",
      label: "Deferred Income Tax",
    },
    {
      propertyName: "changeInWorkingCapital",
      label: "Change in Working Capital",
    },
    {
      propertyName: "netCashProvidedByOperatingActivities",
      label: "Operating Cash Flow",
    },
    {
      propertyName: "capitalExpenditure",
      label: "Capital Expenditures",
    },
    {
      propertyName: "acquisitionsNet",
      label: "Cash Acquisitions",
    },
    {
      propertyName: "purchasesOfInvestments",
      label: "Purchase of Investments",
    },
    {
      propertyName: "salesMaturitiesOfInvestments",
      label: "Sales Maturities Of Investments",
    },
    {
      propertyName: "otherInvestingActivities",
      label: "Other Investing Acitivies",
    },
    {
      propertyName: "netCashProvidedByInvestingActivities",
      label: "Investing Cash Flow",
    },
    {
      propertyName: "netDebtIssuance",
      label: "Debt Repayment",
    },
    {
      propertyName: "commonStockRepurchased",
      label: "Common Stock Repurchased",
    },
    {
      propertyName: "netDividendsPaid",
      label: "Dividend Paid",
    },
    {
      propertyName: "otherFinancingActivities",
      label: "Other Financial Acitivies",
    },
    {
      propertyName: "netCashProvidedByFinancingActivities",
      label: "Financial Cash Flow",
    },
    {
      propertyName: "netChangeInCash",
      label: "Net Cash Flow",
    },
    {
      propertyName: "freeCashFlow",
      label: "Free Cash Flow",
    },
  ];
</script>

<SEO
  title={`${$displayCompanyName} (${$stockTicker}) Cash Flow Statement Analysis - Operating Cash Flow, CapEx & Free Cash Flow`}
  description={`Comprehensive cash flow statement analysis for ${$displayCompanyName} (${$stockTicker}) with detailed breakdown of operating cash flow, capital expenditures, free cash flow, and cash generation patterns. Track ${$stockTicker} cash management with investing activities, financing activities, and working capital changes over multiple periods.`}
  keywords={`${$stockTicker} cash flow, ${$displayCompanyName} free cash flow, ${$stockTicker} operating cash flow, cash flow statement, capital expenditures, cash flow analysis, free cash flow yield, working capital, cash generation, investing activities, financing activities`}
  structuredData={{
    "@context": "https://schema.org",
    "@type": ["FinancialProduct", "WebPage", "AnalysisNewsArticle"],
    name: `${$displayCompanyName} (${$stockTicker}) Cash Flow Statement Analysis`,
    headline: `${$displayCompanyName} Cash Generation - Cash Flow Statement & Free Cash Flow Analysis`,
    description: `Detailed cash flow statement analysis for ${$displayCompanyName} (${$stockTicker}) including operating, investing, and financing cash flows`,
    url: `https://stocknear.com/stocks/${$stockTicker}/financials/cash-flow`,

    author: {
      "@type": "Organization",
      name: "Stocknear",
      url: "https://stocknear.com",
    },
    publisher: {
      "@type": "Organization",
      name: "Stocknear",
      url: "https://stocknear.com",
      logo: {
        "@type": "ImageObject",
        url: "https://stocknear.com/favicon.png",
      },
    },
    dateModified: new Date().toISOString(),
    datePublished: new Date().toISOString(),
    mainEntity: {
      "@type": "Corporation",
      name: $displayCompanyName,
      tickerSymbol: $stockTicker,
    },
    about: {
      "@type": "Thing",
      name: "Cash Flow Statement Analysis",
      description:
        "Financial statement analysis focused on cash generation and cash flow patterns",
    },
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
          name: "Stocks",
          item: "https://stocknear.com/stocks",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: `${$displayCompanyName} (${$stockTicker})`,
          item: `https://stocknear.com/stocks/${$stockTicker}`,
        },
        {
          "@type": "ListItem",
          position: 4,
          name: "Financial Statements",
          item: `https://stocknear.com/stocks/${$stockTicker}/financials`,
        },
        {
          "@type": "ListItem",
          position: 5,
          name: "Cash Flow Statement",
          item: `https://stocknear.com/stocks/${$stockTicker}/financials/cash-flow`,
        },
      ],
    },
  }}
/>

<FinancialSection {data} title="Cash Flow Statement" {statementConfig} />
