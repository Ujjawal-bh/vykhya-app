const SARVAM_URL = "https://api.sarvam.ai/text-to-speech";

const ALLOWED_LANGUAGES = new Set(["en-IN", "hi-IN"]);

/**
 * Sarvam REST uses header `api-subscription-key` (OpenAPI: ApiKeyAuth).
 * Env `SARVAM_API_KEY` holds that subscription key value.
 */
function sarvamHeaders(apiKey) {
  return {
    "Content-Type": "application/json",
    "api-subscription-key": apiKey,
  };
}

export async function POST(request) {
  const apiKey = process.env.SARVAM_API_KEY?.trim();
  if (!apiKey) {
    return Response.json(
      { error: "Server is not configured with SARVAM_API_KEY." },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { text, language } = body ?? {};

  if (typeof text !== "string" || !text.trim()) {
    return Response.json({ error: "Field `text` is required." }, { status: 400 });
  }

  if (typeof language !== "string" || !ALLOWED_LANGUAGES.has(language)) {
    return Response.json(
      {
        error: "Field `language` must be one of: en-IN, hi-IN.",
      },
      { status: 400 }
    );
  }

  let sarvamRes;
  try {
    sarvamRes = await fetch(SARVAM_URL, {
      method: "POST",
      headers: sarvamHeaders(apiKey),
      body: JSON.stringify({
        text: text.trim(),
        target_language_code: language,
        model: "bulbul:v3",
        output_audio_codec: "mp3",
      }),
    });
  } catch (err) {
    return Response.json(
      { error: "Failed to reach Sarvam API.", detail: String(err?.message ?? err) },
      { status: 502 }
    );
  }

  const raw = await sarvamRes.text();
  let data;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    return Response.json(
      { error: "Unexpected non-JSON response from Sarvam API." },
      { status: 502 }
    );
  }

  if (!sarvamRes.ok) {
    const message =
      data?.error?.message ?? data?.message ?? `Sarvam API returned ${sarvamRes.status}.`;
    const status =
      sarvamRes.status === 401 || sarvamRes.status === 403 ? 401 : 502;
    return Response.json({ error: message, code: data?.error?.code }, { status });
  }

  const audioBase64 = data?.audios?.[0];
  if (typeof audioBase64 !== "string" || !audioBase64.length) {
    return Response.json(
      { error: "Sarvam response did not include audio data." },
      { status: 502 }
    );
  }

  return Response.json({
    mimeType: "audio/mpeg",
    audioBase64,
    requestId: data.request_id ?? null,
  });
}
