const { InferenceClient } = require("@huggingface/inference");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = process.env.HF_TOKEN;
  if (!token) {
    return res.status(500).json({
      error: "Missing HF_TOKEN environment variable on the server."
    });
  }

  const { model, inputs, parameters } = req.body || {};

  if (!model || !inputs) {
    return res.status(400).json({
      error: "Request must include model and inputs."
    });
  }

  try {
    const client = new InferenceClient(token);
    const imageBlob = await client.textToImage({
      model,
      inputs,
      ...(parameters || {})
    });
    const buffer = Buffer.from(await imageBlob.arrayBuffer());

    res.setHeader("Content-Type", imageBlob.type || "image/png");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(buffer);
  } catch (error) {
    const status = error?.status || error?.response?.status || 500;
    const details = error?.message || "Unknown inference error.";
    return res.status(status).json({
      error: "Hugging Face request failed.",
      details
    });
  }
};
