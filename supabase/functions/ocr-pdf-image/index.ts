import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";

// Ensure you have your Google Gemini API key set as a Supabase secret
// SUPABASE_SECRETS = { "GEMINI_API_KEY": "YOUR_GEMINI_API_KEY" }

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { image_base64 } = await req.json();

    if (!image_base64) {
      return new Response(
        JSON.stringify({ error: "Missing image_base64 in request body" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY not set in Supabase secrets" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Call Gemini API for OCR
    const geminiResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": geminiApiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: "Extract all text from this image:" },
                {
                  inline_data: {
                    mime_type: "image/png", // Assuming PNG, adjust if needed
                    data: image_base64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1, // Lower temperature for more factual extraction
            topK: 1,
            topP: 1,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API error:", errorText);
      return new Response(
        JSON.stringify({
          error: `Gemini API call failed: ${geminiResponse.status} - ${errorText}`,
        }),
        {
          status: geminiResponse.status,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const geminiData = await geminiResponse.json();
    const extractedText =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    return new Response(JSON.stringify({ extracted_text: extractedText }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in OCR Edge Function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});