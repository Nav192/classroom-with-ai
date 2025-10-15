import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.14.1";

// --- CONFIGURATION ---
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get API keys from Supabase secrets
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// --- MAIN SERVER LOGIC ---
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { material_id, question_type, num_questions } = await req.json();
    if (!material_id) throw new Error("material_id is required");

    // 1. Get Supabase material data
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    });
    // 1. Retrieve all text chunks for the given material_id from material_embeddings
    const { data: materialChunks, error: chunksError } = await supabase
      .from("material_embeddings")
      .select("text")
      .eq("material_id", material_id)
      .order("chunk_index", { ascending: true });

    if (chunksError) throw chunksError;
    if (!materialChunks || materialChunks.length === 0) {
      throw new Error("No processed text found for this material. Please ensure the material has been uploaded and processed for RAG.");
    }

    const materialContent = materialChunks.map((chunk) => chunk.text).join("\n\n");

    if (!materialContent.trim()) throw new Error("Could not extract any text from the provided material.");

    // 4. Generate quiz with Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `
      Based on the following material (in Bahasa Indonesia), create a quiz with ${num_questions || 5} questions of type "${question_type || 'mcq'}".
      All questions and answers must be in Bahasa Indonesia.
      
      The output must be a valid JSON object with a single key "questions", containing an array of question objects. Do not include any text outside the JSON object.

      - For "mcq", each object must have "text", "options" (an array of 4 strings), "answer", and "type".
      - For "true_false", each object must have "text", "options" (must be ["True", "False"]), "answer", and "type".
      - For "essay", each object must ONLY have "text" and "type".

      Here is an example for a MULTIPLE-CHOICE question:
      {
        "questions": [
          {
            "text": "Siapakah presiden pertama Indonesia?",
            "options": ["Soekarno", "Soeharto", "B.J. Habibie", "Joko Widodo"],
            "answer": "Soekarno",
            "type": "mcq"
          }
        ]
      }

      Here is an example for a TRUE/FALSE question:
      {
        "questions": [
          {
            "text": "Ibukota Indonesia adalah Jakarta.",
            "options": ["True", "False"],
            "answer": "True",
            "type": "true_false"
          }
        ]
      }

      Here is an example for an ESSAY question:
      {
        "questions": [
          {
            "text": "Jelaskan proses proklamasi kemerdekaan Indonesia.",
            "type": "essay"
          }
        ]
      }

      It is critical that you follow the correct structure for the requested question type.

      Material content:
      ---
      ${materialContent.substring(0, 30000)} 
      ---
    `;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = await response.text();
    const jsonMatch = text.match(/\{([\s\S]*)\}/);
    if (!jsonMatch) throw new Error("Failed to parse AI response into JSON.");
    const generatedData = JSON.parse(jsonMatch[0]);

    // 5. Return final result
    return new Response(JSON.stringify(generatedData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});