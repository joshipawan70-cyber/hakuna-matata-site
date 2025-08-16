export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return res.status(500).json({ message: "Missing Razorpay keys" });
  }

  try {
    const amount = parseInt(req.body.amount, 10) * 100; // in paise
    const currency = "INR";

    const orderResp = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64"),
      },
      body: JSON.stringify({
        amount,
        currency,
        receipt: "receipt_" + Date.now(),
      }),
    });

    const data = await orderResp.json();

    if (!orderResp.ok) {
      return res.status(500).json({ message: "Order creation failed", data });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error("Razorpay error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
}
