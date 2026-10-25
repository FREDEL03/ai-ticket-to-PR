import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Gemini API key is not configured." },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const audio = formData.get("audio");

    if (!(audio instanceof File)) {
      return NextResponse.json(
        { error: "No audio recording provided." },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const buffer = Buffer.from(await audio.arrayBuffer());

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: audio.type || "audio/webm",
                data: buffer.toString("base64"),
              },
            },
            {
              text: "Transcribe the spoken words in this audio exactly. Return only the transcribed text, nothing else. No explanation.",
            },
          ],
        },
      ],
    });

    return NextResponse.json({
      text: (response.text || "").trim(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Voice transcription failed." },
      { status: 500 }
    );
  }
}
