<script lang="ts">
  import { displayCompanyName, stockTicker } from "$lib/store";

  import SEO from "$lib/components/SEO.svelte";
  import FinancialSection from "$lib/components/FinancialSection.svelte";

  export let data;

  const statementConfig = [
    {
      propertyName: "cashAndCashEquivalents",
      growthPropertyName: "growthCashAndCashEquivalents",
      label: "Cash & Equivalents",
    },
    {
      propertyName: "shortTermInvestments",
      growthPropertyName: "growthShortTermInvestments",
      label: "Short-Term Investments",
    },
    {
      propertyName: "longTermInvestments",
      growthPropertyName: "growthLongTermInvestments",
      label: "Long-Term Investments",
    },
    {
      propertyName: "otherNonCurrentAssets",
      growthPropertyName: "growthOtherNonCurrentAssets",
      label: "Other Long-Term Assets",
    },
    {
      propertyName: "netReceivables",
      growthPropertyName: "growthNetReceivables",
      label: "Receivables",
    },
    {
      propertyName: "inventory",
      growthPropertyName: "growthInventory",
      label: "Inventory",
    },
    {
      propertyName: "otherCurrentAssets",
      growthPropertyName: "growthOtherCurrentAssets",
      label: "Other Current Assets",
    },
    {
      propertyName: "totalCurrentAssets",
      growthPropertyName: "growthTotalCurrentAssets",
      label: "Total Current Assets",
    },
    {
      propertyName: "propertyPlantEquipmentNet",
      growthPropertyName: "growthPropertyPlantEquipmentNet",
      label: "Property-Plant & Equipment",
    },
    {
      propertyName: "goodwillAndIntangibleAssets",
      growthPropertyName: "growthGoodwillAndIntangibleAssets",
      label: "Goodwill & Intangibles",
    },
    {
      propertyName: "totalNonCurrentAssets",
      growthPropertyName: "growthTotalNonCurrentAssets",
      label: "Total Long-Term Assets",
    },
    {
      propertyName: "totalAssets",
      growthPropertyName: "growthTotalAssets",
      label: "Total Assets",
    },
    {
      propertyName: "accountPayables",
      growthPropertyName: "growthAccountPayables",
      label: "Account Payables",
    },
    {
      propertyName: "deferredRevenue",
      growthPropertyName: "growthDeferredRevenue",
      label: "Deferred Revenue",
    },
    {
      propertyName: "shortTermDebt",
      growthPropertyName: "growthShortTermDebt",
      label: "Short-Term Debt",
      text: "Current debt is company debt that needs to be paid within one year. It also includes the portion of long-term debt that is due within a year.",
    },
    {
      propertyName: "otherCurrentLiabilities",
      growthPropertyName: "growthOtherCurrentLiabilities",
      label: "Other Current Liabilities",
    },
    {
      propertyName: "totalCurrentLiabilities",
      growthPropertyName: "growthTotalCurrentLiabilities",
      label: "Total Current Liabilities",
    },
    {
      propertyName: "longTermDebt",
      growthPropertyName: "growthLongTermDebt",
      label: "Long-Term Debt",
    },
    {
      propertyName: "otherNonCurrentLiabilities",
      growthPropertyName: "growthOtherNonCurrentLiabilities",
      label: "Other Long-Term Liabilities",
    },
    {
      propertyName: "totalNonCurrentLiabilities",
      growthPropertyName: "growthTotalNonCurrentLiabilities",
      label: "Total Long-Term Liabilities",
    },
    {
      propertyName: "totalLiabilities",
      growthPropertyName: "growthTotalLiabilities",
      label: "Total Liabilities",
    },
    {
      propertyName: "totalDebt",
      growthPropertyName: "growthTotalDebt",
      label: "Total Debt",
    },
    {
      propertyName: "bookValue",
      label: "Book Value",
    },
    {
      propertyName: "bookValuePerShare",
      label: "Book Value Per Share",
    },
    {
      propertyName: "commonStock",
      growthPropertyName: "growthCommonStock",
      label: "Common Stock",
    },
    {
      propertyName: "retainedEarnings",
      growthPropertyName: "growthRetainedEarnings",
      label: "Retained Earnings",
    },
    {
      propertyName: "accumulatedOtherComprehensiveIncomeLoss",
      growthPropertyName: "growthAccumulatedOtherComprehensiveIncomeLoss",
      label: "Comprehensive Income",
    },
    {
      propertyName: "totalStockholdersEquity",
      growthPropertyName: "growthTotalStockholdersEquity",
      label: "Shareholders Equity",
    },
    {
      propertyName: "totalInvestments",
      growthPropertyName: "growthTotalInvestments",
      label: "Total Investments",
    },
  ];
</script>

<SEO
  title={`${$displayCompanyName} (${$stockTicker}) Balance Sheet Analysis - Assets, Liabilities & Financial Position`}
  description={`Comprehensive balance sheet analysis for ${$displayCompanyName} (${$stockTicker}) with detailed breakdown of assets, liabilities, shareholders equity, debt levels, and financial position. Track ${$stockTicker} financial health with cash positions, working capital, debt-to-equity ratios, and asset quality metrics over multiple periods.`}
  keywords={`${$stockTicker} balance sheet, ${$displayCompanyName} assets, ${$stockTicker} liabilities, balance sheet analysis, shareholders equity, debt analysis, working capital, financial position, asset quality, cash position, debt-to-equity ratio, book value`}
  structuredData={{
    "@context": "https://schema.org",
    "@type": ["FinancialProduct", "WebPage", "AnalysisNewsArticle"],
    name: `${$displayCompanyName} (${$stockTicker}) Balance Sheet Analysis`,
    headline: `${$displayCompanyName} Financial Position - Balance Sheet & Asset Analysis`,
    description: `Detailed balance sheet analysis for ${$displayCompanyName} (${$stockTicker}) including assets, liabilities, equity, and financial position metrics`,
    url: `https://stocknear.com/stocks/${$stockTicker}/financials/balance-sheet`,

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
      name: "Balance Sheet Analysis",
      description:
        "Financial statement analysis focused on assets, liabilities, and financial position",
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
          name: "Balance Sheet",
          item: `https://stocknear.com/stocks/${$stockTicker}/financials/balance-sheet`,
        },
      ],
    },
  }}
/>

<FinancialSection {data} title="Balance Sheet Statement" {statementConfig} />
