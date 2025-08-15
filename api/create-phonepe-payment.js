const { v4: uuidv4 } = require("uuid");

// ✅ Force Node.js runtime
export const config = {
  runtime: "nodejs",
};

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { amount } = req.body;

    // 🔑 Environment variables from Vercel
    const clientId = process.env.PHONEPE_CLIENT_ID;
    const clientVersion = process.env.PHONEPE_CLIENT_VERSION;
    const clientSecret = process.env.PHONEPE_CLIENT_SECRET;
    const merchantId = process.env.PHONEPE_MERCHANT_ID;

    // 1️⃣ Step 1: Get Access Token
    const tokenResponse = await fetch(
      "https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_version: clientVersion,
          client_secret: clientSecret,
          grant_type: "client_credentials",
        }),
      }
    );

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error("Failed to get access token:", tokenData);
      return res.status(500).json({
        message: "Failed to get PhonePe access token",
        details: tokenData,
      });
    }

    // 2️⃣ Step 2: Create Payment Request
    const transactionId = uuidv4();
    const redirectUrl = "https://hakunamatatagamingcafe.site/success.html";
    const callbackUrl = "https://<your-vercel-domain>/api/phonepe-callback";

    const paymentResponse = await fetch(
      "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `O-Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          merchantId,
          transactionId,
          merchantUserId: "MUID123",
          amount: amount * 100, // convert rupees → paise
          redirectUrl,
          redirectMode: "REDIRECT",
          callbackUrl,
          paymentInstrument: { type: "PAY_PAGE" },
        }),
      }
    );

    const result = await paymentResponse.json();

    // ✅ Handle success/failure safely
    if (
      result &&
      result.data &&
      result.data.instrumentResponse &&
      result.data.instrumentResponse.redirectInfo
    ) {
      const redirectUrl = result.data.instrumentResponse.redirectInfo.url;
      return res.status(200).json({ redirectUrl });
    } else {
      console.error("PhonePe error response:", result);
      return res.status(400).json({
        message: "Payment creation failed",
        details: result,
      });
    }
  } catch (error) {
    console.error("PhonePe API error:", error);
    return res.status(500).json({
      message: "Error processing payment",
      error: error.message,
    });
  }
};
