import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";
import { RecursiveCharacterTextSplitter } from "npm:langchain/text_splitter";

// Initialize Gemini
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
if (!GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is not set in environment variables.");
  // In a real scenario, you might throw an error or return a specific response
}
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "");
const chatModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
const embeddingModel = genAI.getGenerativeModel({
  model: "text-embedding-004",
}); // Changed model name

// Helper to generate embedding for a query
async function generateQueryEmbedding(query: string): Promise<number[]> {
  const result = await embeddingModel.embedContent(query);
  return result.embedding.values;
}

// Helper to chunk text (if needed, though for RAG we'd mostly use pre-chunked embeddings)
function chunkText(
  text: string,
  chunkSize: number = 1000,
  chunkOverlap: number = 200
): string[] {
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
    lengthFunction: (text) => text.length,
  });
  return textSplitter.splitText(text);
}

serve(async (req) => {
  try {
    const { class_id, question } = await req.json();

    if (!class_id || !question) {
      return new Response(
        JSON.stringify({ error: "Missing class_id or question" }),
        {
          headers: { "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // 1. Generate embedding for the user's question
    const queryEmbedding = await generateQueryEmbedding(question);

    // 2. Retrieve relevant material chunks from Supabase (class-specific)
    const { data: classMaterialsData, error: classMaterialsError } =
      await supabaseClient
        .from("class_materials")
        .select("material_id")
        .eq("class_id", class_id);

    if (classMaterialsError) throw classMaterialsError;

    // Initialize an array to hold all relevant context
    let allContextChunks: string[] = [];

    if (classMaterialsData && classMaterialsData.length > 0) {
      const materialIds = classMaterialsData.map(
        (m: { material_id: string }) => m.material_id
      );

      const { data: relevantMaterialChunks, error: materialChunksError } = await supabaseClient.rpc('search_material_embeddings', {
          query_embedding: queryEmbedding,
          material_ids: materialIds
      });

      if (materialChunksError) throw materialChunksError;
      if (relevantMaterialChunks) {
        allContextChunks = allContextChunks.concat(relevantMaterialChunks.map((r: { text: string }) => r.text));
      }
    }

    // 3. Retrieve relevant general definitions (if any)
    const { data: relevantDefinitions, error: definitionsError } = await supabaseClient.rpc('search_general_definitions', {
        query_embedding: queryEmbedding
    });

    if (definitionsError) throw definitionsError;
    if (relevantDefinitions) {
      relevantDefinitions.forEach((def: { term: string, definition: string }) => {
        allContextChunks.push(`Definisi Umum: ${def.term} - ${def.definition}`);
      });
    }

    // If no context found from either source, return appropriate message
    if (allContextChunks.length === 0) {
      return new Response(
        JSON.stringify({
          response:
            "Maaf, saya tidak menemukan informasi relevan dalam materi kelas ini maupun definisi umum untuk pertanyaan Anda.",
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const context = allContextChunks.join("\n\n");

    // 4. Construct the prompt for Gemini
    const prompt = `Anda adalah asisten AI yang membantu siswa memahami materi pelajaran.
Jawablah pertanyaan siswa HANYA berdasarkan konteks yang diberikan di bawah ini. Konteks ini bisa berasal dari materi kelas atau definisi umum.
Jika pertanyaan tidak dapat dijawab dari konteks yang diberikan, atau jika pertanyaan tersebut di luar topik materi,
maka katakan: "Maaf, saya tidak bisa menjawab pertanyaan ini karena di luar konteks materi yang tersedia."

Konteks Materi dan Definisi Umum:
${context}

Pertanyaan Siswa:
${question}

Jawaban Anda:
`;

    // 4. Call Gemini API
    const result = await chatModel.generateContent(prompt);
    const responseText = result.response.text();

    return new Response(JSON.stringify({ response: responseText }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in Edge Function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
