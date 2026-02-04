
const buyAirtime = async (phone_number, amount, provider_id) => {
  const API_URL =
    "https://www.cheapdatahub.ng/api/v1/resellers/airtime/purchase/";
  console.log("Placing airtime order!");

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer 801ba9d5d7a609ddd7c3f567a9bafe32b368a561",
      },
      body: JSON.stringify({
        provider_id,
        phone_number,
        amount,
      })
    });
    const data = await res.json();
    console.log(data);
    if (!res.ok || data.status === "false") {
      console.log(`Airtime purchase failed (${res.status}): ${data.message}`);
      return;
    }

    console.log(`Successfully purchased ${amount} airtime to ${phone_number}`);
    return data.details;
  } catch (e) {
    console.log("Airtime purchase error: ", e);
    return false;
  }
};


const buyData = async (phone_number, bundle_id) => {
  const API_URL =
    "https://www.cheapdatahub.ng/api/v1/resellers/data/purchase/";
  console.log("Placing data order!");

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer 801ba9d5d7a609ddd7c3f567a9bafe32b368a561",
      },
      body: JSON.stringify({
        bundle_id,
        phone_number
      })
    });

    const data = await res.json();

    console.log(data);

    if (!res.ok || data.status === "false") {
      console.log(`Data purchase failed (${res.status}): ${data.message}`);
      return false;
    }
    console.log(`Successfully purchased data to ${phone_number}`);
    return true;
  } catch (e) {
    console.log("Data purchase error: ", e);
    return false;
  }
};



module.exports = {
  buyAirtime,
  buyData
};