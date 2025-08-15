// ✅ Force Node.js runtime
export const runtime = "nodejs";

import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return response.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    // --- CONFIGURATION ---
    const merchantId = process.env.PHONEPE_MERCHANT_ID;
    const saltKey = process.env.PHONEPE_SALT_KEY;
    const saltIndex = process.env.PHONEPE_SALT_INDEX;

    const phonepeEndpoint =
      "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay";

    // --- DATA FROM FRONTEND ---
    const amount = parseInt(request.body.amount) * 100; // convert to paise
    const userId = "MUID123";
    const merchantTransactionId = uuidv4();

    // --- REDIRECT URL ---
    const redirectUrl = "https://hakunamatatagamingcafe.site/success.html";

    // --- PAYLOAD ---
    const payload = {
      merchantId,
      merchantTransactionId,
      merchantUserId: userId,
      amount,
      redirectUrl,
      redirectMode: "REDIRECT",
      callbackUrl: redirectUrl,
      mobileNumber: "9999999999",
      paymentInstrument: {
        type: "PAY_PAGE",
      },
    };

    // --- CHECKSUM ---
    const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");
    const stringToHash = base64Payload + "/pg/v1/pay" + saltKey;
    const sha256 = crypto.createHash("sha256").update(stringToHash).digest("hex");
    const checksum = sha256 + "###" + saltIndex;

    // --- MAKE API REQUEST USING fetch ---
    const phonepeResponse = await fetch(phonepeEndpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        "X-VERIFY": checksum,
      },
      body: JSON.stringify({ request: base64Payload }),
    });

    const data = await phonepeResponse.json();

    // --- RESPONSE TO FRONTEND ---
    const paymentUrl = data.data.instrumentResponse.redirectInfo.url;
    return response.status(200).json({ redirectUrl: paymentUrl });
  } catch (error) {
    console.error("PhonePe API error:", error);
    return response
      .status(500)
      .json({ message: "Error processing payment", error: error.message });
  }
}
