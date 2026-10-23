import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_DESCRIPTION_LENGTH = 10_000;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export async function POST(request: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Gemini API key is not configured." },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const formData = await request.formData();
    const image = formData.get("image");
    const descriptionValue = formData.get("description");
    const description =
      typeof descriptionValue === "string" ? descriptionValue.trim() : "";

    if (!(image instanceof File) && !description) {
      return NextResponse.json(
        { error: "Upload a ticket screenshot or enter a ticket description." },
        { status: 400 }
      );
    }

    if (description.length > MAX_DESCRIPTION_LENGTH) {
      return NextResponse.json(
        { error: "Ticket description must not exceed 10,000 characters." },
        { status: 400 }
      );
    }

    if (image instanceof File && !ALLOWED_TYPES.includes(image.type)) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, and WebP images are supported." },
        { status: 400 }
      );
    }

    if (image instanceof File && image.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Image size must not exceed 5 MB." },
        { status: 400 }
      );
    }

    const inputPart = image instanceof File
      ? {
          inlineData: {
            mimeType: image.type,
            data: Buffer.from(await image.arrayBuffer()).toString("base64"),
          },
        }
      : { text: `Ticket description:\n${description}` };

    const prompt = `
You are an experienced software developer helping prepare
development tickets for a Bitbucket or GitHub pull request.

Read and analyze the supplied ticket screenshot or ticket description.
Detect any ticket key or ID (for example: PROD-109, JIRA-123, TASK-45, ABC-109, etc.).

Generate these four fields:
1. branchName
2. commitMessage
3. prTitle
4. prDescription

Rules:
- Identify the ticket ID/key from the provided input (e.g. PROD-109).
- For branchName: Start with the ticket ID if present, followed by concise kebab-case description (example: "PROD-109-login-validation"). Do NOT use prefixes like feat/, fix/, chore/, or bug/.
- For commitMessage: Include the ticket ID, followed by a concise direct message (example: "PROD-109: Improve login validation" or "PROD-109 Improve login validation"). Do NOT use conventional prefixes like feat:, fix:, chore:.
- For prTitle: Include the ticket ID (example: "[PROD-109] Fix login validation").
- For prDescription: Write a useful PR description with Summary and Testing sections.
- Use the ticket's actual meaning. Never invent requirements.
- If important details are unclear, mention the uncertainty in the PR description instead of making up facts.
- Do not claim tests have passed unless the provided input says so.
- Return ONLY a valid JSON object matching the requested fields.
- All four values must be strings.

Example format (when ticket is PROD-109):
{
  "branchName": "PROD-109-login-validation",
  "commitMessage": "PROD-109: Improve login validation",
  "prTitle": "[PROD-109] Fix login validation",
  "prDescription": "## Summary\\n- Improve login validation.\\n\\n## Testing\\n- Not yet tested."
}
`;

    const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }, inputPart],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            branchName: { type: "STRING" },
            commitMessage: { type: "STRING" },
            prTitle: { type: "STRING" },
            prDescription: { type: "STRING" },
          },
          required: [
            "branchName",
            "commitMessage",
            "prTitle",
            "prDescription",
          ],
        },
      },
    });

    const text = response.text;

    if (!text) {
      throw new Error("The AI returned an empty response.");
    }

    const result = JSON.parse(text);

    const fields = [
      "branchName",
      "commitMessage",
      "prTitle",
      "prDescription",
    ] as const;

    for (const field of fields) {
      if (
        typeof result[field] !== "string" ||
        !result[field].trim()
      ) {
        throw new Error("The AI returned an invalid result.");
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Ticket scan error:", error);

    const message =
      error instanceof Error ? error.message : "Unable to analyze the ticket.";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 }
    );
  }
}
