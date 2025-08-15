import axios from "axios";
import crypto from "crypto";
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

    // Step 1: Get access token
    const tokenResp = await axios.post(
      "https://api.phonepe.com/apis/pg/v1/oauth/token",
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
        client_version: clientVersion,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const accessToken = tokenResp.data.access_token;

    if (!accessToken) {
      return res.status(500).json({ message: "Failed to get PhonePe access token" });
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

    // Step 3: Make payment request with access token
    const payResp = await axios.post(
      "https://api.phonepe.com/apis/pg/v1/pay",
      { request: Buffer.from(JSON.stringify(payload)).toString("base64") },
      {
        headers: {
          Authorization: `O-Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    const redirectInfo = payResp.data?.data?.instrumentResponse?.redirectInfo;

    if (!redirectInfo?.url) {
      return res.status(500).json({
        message: "Payment creation failed",
        details: payResp.data,
      });
    }

    res.status(200).json({ redirectUrl: redirectInfo.url });
  } catch (err) {
    console.error("PhonePe API error:", err.response?.data || err.message);
    res.status(500).json({
      message: "Error processing payment",
      details: err.response?.data || err.message,
    });
  }
}
