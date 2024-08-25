// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { Client } from "npm:@notionhq/client";
import { NotionRenderer } from "npm:@notion-render/client";

console.log("Hello from Functions!")

Deno.serve(async (req) => {
  const { name } = await req.json()
  const data = {
    message: `Hello ${name}!`,
  }

  const client = new Client({
    auth: Deno.env.get('NOTION_API_KEY')
  });

  const renderer = new NotionRenderer({ client });

  const notion = {
    client: client,
    renderer: renderer,
  };

  return new Response(
    JSON.stringify(data),
    { headers: { "Content-Type": "application/json" } },
  )
})
