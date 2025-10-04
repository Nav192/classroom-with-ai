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
const ILOVEPDF_PUBLIC_KEY = Deno.env.get("ILOVEPDF_PUBLIC_KEY");
const ILOVEPDF_SECRET_KEY = Deno.env.get("ILOVEPDF_SECRET_KEY");

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// --- HELPER FUNCTION for Ilovepdf Auth ---
async function getIlovepdfAuthToken() {
  const response = await fetch('https://api.ilovepdf.com/v1/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ public_key: ILOVEPDF_PUBLIC_KEY, secret_key: ILOVEPDF_SECRET_KEY }),
  });
  if (!response.ok) throw new Error('Ilovepdf authentication failed');
  const data = await response.json();
  return data.token;
}

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
    const { data: material } = await supabase.from("materials").select("storage_path, filename").eq("id", material_id).single().throwOnError();
    if (!material) throw new Error("Material not found in database.");

    // 2. Download file from Supabase Storage
    const { data: fileData, error: fileError } = await supabase.storage.from("materials").download(material.storage_path);
    if (fileError) throw fileError;
    if (!fileData) throw new Error("Failed to download material from storage.");

    let materialContent = '';
    const fileExtension = material.filename.split('.').pop().toLowerCase();

    // 3. Process file content (PDF via Ilovepdf, TXT directly)
    if (fileExtension === 'pdf') {
      const token = await getIlovepdfAuthToken();
      const headers = { 'Authorization': `Bearer ${token}` };

      // 1. Start extract task
      const startRes = await fetch('https://api.ilovepdf.com/v1/start/extract', { method: 'GET', headers });
      if (!startRes.ok) throw new Error(`Ilovepdf start task failed: ${await startRes.text()}`);
      const startData = await startRes.json();

      // 2. Upload file
      const formData = new FormData();
      formData.append('task', startData.task);
      formData.append('file', fileData, material.filename);
      const uploadRes = await fetch(`https://${startData.server}/v1/upload`, { method: 'POST', headers, body: formData });
      if (!uploadRes.ok) throw new Error(`Ilovepdf upload failed: ${await uploadRes.text()}`);
      const uploadData = await uploadRes.json();

      // 3. Process file using the server_filename from the upload response
      const processHeaders = { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      const processBody = JSON.stringify({
        task: startData.task,
        tool: 'extract',
        files: [
          {
            server_filename: uploadData.server_filename,
            filename: material.filename
          }
        ]
      });
      const processRes = await fetch(`https://${startData.server}/v1/process`, { method: 'POST', headers: processHeaders, body: processBody });
      if (!processRes.ok) throw new Error(`Ilovepdf process failed: ${await processRes.text()}`);

      // 4. Download result
      const downloadRes = await fetch(`https://${startData.server}/v1/download/${startData.task}`, { headers });
      if (!downloadRes.ok) throw new Error(`Ilovepdf download failed: ${await downloadRes.text()}`);
      materialContent = await downloadRes.text();

    } else if (fileExtension === 'txt') {
      materialContent = await fileData.text();
    } else {
      throw new Error(`File type .${fileExtension} is not supported for AI generation. Please use PDF or TXT.`);
    }

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