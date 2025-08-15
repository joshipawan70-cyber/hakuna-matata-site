import { v4 as uuidv4 } from "uuid";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const clientId = process.env.PHONEPE_CLIENT_ID;
    const clientSecret = process.env.PHONEPE_CLIENT_SECRET;
    const clientVersion = process.env.PHONEPE_CLIENT_VERSION;
    const merchantId = process.env.PHONEPE_MERCHANT_ID;

    // Step 1: Get access token using fetch
    const tokenResp = await fetch("https://api.phonepe.com/apis/pg/v1/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
        client_version: clientVersion,
      }),
    });

    const tokenData = await tokenResp.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return res.status(500).json({ message: "Failed to get PhonePe access token", details: tokenData });
    }

    // Step 2: Create payment payload
    const amount = parseInt(req.body.amount) * 100; // paise
    const transactionId = uuidv4();
    const redirectUrl = "https://hakunamatatagamingcafe.site/success.html";

    const payload = {
      merchantId,
      merchantTransactionId: transactionId,
      merchantUserId: "USER123",
      amount,
      redirectUrl,
      redirectMode: "REDIRECT",
      callbackUrl: redirectUrl,
      paymentInstrument: { type: "PAY_PAGE" },
    };

    const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");

    // Step 3: Call PhonePe pay API with fetch
    const payResp = await fetch("https://api.phonepe.com/apis/pg/v1/pay", {
      method: "POST",
      headers: {
        Authorization: `O-Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ request: base64Payload }),
    });

    const payData = await payResp.json();
    const redirectInfo = payData?.data?.instrumentResponse?.redirectInfo;

    if (!redirectInfo?.url) {
      return res.status(500).json({ message: "Payment creation failed", details: payData });
    }

    return res.status(200).json({ redirectUrl: redirectInfo.url });
  } catch (err) {
    console.error("PhonePe API error:", err);
    return res.status(500).json({ message: "Error processing payment", details: err.message });
  }
}
