// api/create-phonepe-payment.js
import { v4 as uuidv4 } from "uuid";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  // --- Validate env vars early ---
  const required = [
    "PHONEPE_CLIENT_ID",
    "PHONEPE_CLIENT_SECRET",
    "PHONEPE_CLIENT_VERSION",
    "PHONEPE_MERCHANT_ID",
  ];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    return res.status(500).json({
      message: "Missing required environment variables",
      missing,
    });
  }

  try {
    const clientId = process.env.PHONEPE_CLIENT_ID;
    const clientSecret = process.env.PHONEPE_CLIENT_SECRET;
    const clientVersion = process.env.PHONEPE_CLIENT_VERSION;
    const merchantId = process.env.PHONEPE_MERCHANT_ID;

    // --------- STEP 1: OAuth token (PRODUCTION) ----------
    const tokenResp = await fetch(
      "https://api.phonepe.com/apis/pg/v1/oauth/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: clientId,
          client_secret: clientSecret,
          client_version: clientVersion,
        }),
      }
    );

    const tokenText = await tokenResp.text();
    let tokenData;
    try {
      tokenData = JSON.parse(tokenText);
    } catch {
      tokenData = { raw: tokenText };
    }

    if (!tokenResp.ok || !tokenData?.access_token) {
      return res.status(500).json({
        message: "Failed to get PhonePe access token",
        httpStatus: tokenResp.status,
        tokenResponse: tokenData,
        sent: {
          client_id: clientId,
          client_version: clientVersion,
        },
      });
    }

    const accessToken = tokenData.access_token;

    // --------- STEP 2: Create payment ----------
    const amountRupees = parseInt(req.body?.amount ?? "0", 10);
    if (!Number.isFinite(amountRupees) || amountRupees <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    const amountPaise = amountRupees * 100;
    const merchantTransactionId = uuidv4();
    const redirectUrl = "https://hakunamatatagamingcafe.site/success.html";

    const payload = {
      merchantId,
      merchantTransactionId,
      merchantUserId: "USER123",
      amount: amountPaise,
      redirectUrl,
      redirectMode: "REDIRECT",
      callbackUrl: redirectUrl,
      paymentInstrument: { type: "PAY_PAGE" },
    };

    const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");

    const payResp = await fetch("https://api.phonepe.com/apis/pg/v1/pay", {
      method: "POST",
      headers: {
        Authorization: `O-Bearer ${accessToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ request: base64Payload }),
    });

    const payText = await payResp.text();
    let payData;
    try {
      payData = JSON.parse(payText);
    } catch {
      payData = { raw: payText };
    }

    const redirectInfo = payData?.data?.instrumentResponse?.redirectInfo;
    if (!payResp.ok || !redirectInfo?.url) {
      return res.status(500).json({
        message: "Payment creation failed",
        httpStatus: payResp.status,
        details: payData,
      });
    }

    return res.status(200).json({ redirectUrl: redirectInfo.url });
  } catch (err) {
    console.error("PhonePe API error:", err);
    return res.status(500).json({
      message: "Error processing payment",
      details: err?.message || String(err),
    });
  }
}
