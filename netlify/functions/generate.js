const { InferenceClient } = require("@huggingface/inference");

exports.handler = async function handler(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { Allow: "POST" },
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  const token = process.env.HF_TOKEN;
  if (!token) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Missing HF_TOKEN environment variable on the server."
      })
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON body." })
    };
  }

  const { model, inputs, parameters } = body;

  if (!model || !inputs) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Request must include model and inputs."
      })
    };
  }

  try {
    const client = new InferenceClient(token);
    const imageBlob = await client.textToImage({
      model,
      inputs,
      ...(parameters || {})
    });
    const buffer = Buffer.from(await imageBlob.arrayBuffer());

    return {
      statusCode: 200,
      headers: {
        "Content-Type": imageBlob.type || "image/png",
        "Cache-Control": "no-store"
      },
      body: buffer.toString("base64"),
      isBase64Encoded: true
    };
  } catch (error) {
    const status = error?.status || error?.response?.status || 500;
    const details = error?.message || "Unknown inference error.";
    return {
      statusCode: status,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        error: "Hugging Face request failed.",
        details
      })
    };
  }
};
