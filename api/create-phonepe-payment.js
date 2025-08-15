const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { amount } = req.body;

    // 🔑 Replace with your actual values
    const merchantId = process.env.PHONEPE_MERCHANT_ID;
    const saltKey = process.env.PHONEPE_SALT_KEY;
    const saltIndex = process.env.PHONEPE_SALT_INDEX || "1";
    const callbackUrl = process.env.PHONEPE_CALLBACK_URL;

    const transactionId = uuidv4();

    const payload = {
      merchantId,
      transactionId,
      merchantUserId: "MUID123",
      amount: amount * 100, // convert to paise
      redirectUrl: callbackUrl,
      redirectMode: "POST",
      callbackUrl,
      paymentInstrument: {
        type: "PAY_PAGE",
      },
    };

    const payloadString = JSON.stringify(payload);
    const base64Payload = Buffer.from(payloadString).toString("base64");

    const stringToHash = base64Payload + "/pg/v1/pay" + saltKey;
    const sha256 = crypto.createHash("sha256").update(stringToHash).digest("hex");
    const checksum = sha256 + "###" + saltIndex;

    const phonePeResponse = await axios.post(
      "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay",
      { request: base64Payload },
      {
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": checksum,
          accept: "application/json",
        },
      }
    );

    const result = phonePeResponse.data;

    if (
      result &&
      result.data &&
      result.data.instrumentResponse &&
      result.data.instrumentResponse.redirectInfo
    ) {
      const redirectUrl = result.data.instrumentResponse.redirectInfo.url;
      return res.status(200).json({ redirectUrl });
    } else {
      console.error("PhonePe error response:", JSON.stringify(result, null, 2));
      return res.status(400).json({
        message: "Payment creation failed",
        details: result,
      });
    }
  } catch (error) {
    console.error("PhonePe API error:", error.response?.data || error.message);
    return res.status(500).json({
      message: "Error processing payment",
      error: error.response?.data || error.message,
    });
  }
};
