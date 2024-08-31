// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { Client } from "npm:@notionhq/client";
import { NotionRenderer } from "npm:@notion-render/client";
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { NotionRepository } from "../_shared/repos/notionRepos.ts";
import { SupabaseRepository } from "../_shared/repos/supabaseRepos.ts";
import { NotionDatabaseService } from "../_shared/services/notionDatabaseService.ts";
console.log("Hello from Functions!")

const client = new Client({
  auth: Deno.env.get('NOTION_API_KEY')
});

const notionClient = {
  client: client,
  renderer: new NotionRenderer({ client }),
};
const supabaseClient = createClient(
  Deno.env.get('SSUPABASE_URL')!,
  Deno.env.get('SSUPABASE_SERVICE_ROLE_KEY')!
)

const notionRepos = new NotionRepository(notionClient);
const supabaseRepos = new SupabaseRepository(supabaseClient);

const notionDatabaseService = new NotionDatabaseService(notionRepos, supabaseRepos);
Deno.serve(async (req) => {
  const { name } = await req.json()

  const notionDBs = await supabaseRepos.getNotionDBs();

  console.log(notionDBs);

  for (const notionDB of notionDBs) {
    console.log(notionDB);
    await notionDatabaseService.updateNotionDBs(notionDB);
  }
  return new Response(
    JSON.stringify("data"),
    { headers: { "Content-Type": "application/json" } },
  )
})
