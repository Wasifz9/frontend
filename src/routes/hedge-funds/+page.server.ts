export const load = async ({ locals,  }) => {
  const getData = async () => {
    const { apiURL, apiKey } = locals;
    const response = await fetch(apiURL + "/all-hedge-funds", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
    });

    const output = await response.json();

    return output;
  };


 
  // Make sure to return a promise
  return {
    getData: await getData(),
  };
};
