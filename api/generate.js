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

  const { model, inputs, parameters, options } = req.body || {};

  if (!model || !inputs) {
    return res.status(400).json({
      error: "Request must include model and inputs."
    });
  }

  const endpoint = `https://api-inference.huggingface.co/models/${encodeURIComponent(model)}`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs,
        parameters: parameters || {},
        options: options || { wait_for_model: true }
      })
    });

    const contentType = response.headers.get("content-type") || "application/octet-stream";

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({
        error: "Hugging Face request failed.",
        details: errorText
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(buffer);
  } catch (error) {
    return res.status(500).json({
      error: "Proxy request failed.",
      details: error.message
    });
  }
};
