export const load = async ({ locals }) => {
  const { apiURL, apiKey, user } = locals;

  const getFlowData = async () => {
    // make the POST request to the endpoint
    const response = await fetch(apiURL + "/dark-pool-flow-feed", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
    });
    let output = await response.json();
    output = user?.tier !== "Pro" ? output?.slice(-6) : output;

    return output;
  };


  return {
    getFlowData: await getFlowData(),
  };
};
