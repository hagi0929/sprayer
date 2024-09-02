// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { Client } from "npm:@notionhq/client";
import { NotionRenderer } from "npm:@notion-render/client";
import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { NotionRepos } from "../_shared/repos/notionRepos.ts";
import { DatabaseRepos } from "../_shared/repos/databaseRepos.ts";
import { NotionDatabaseService } from "../_shared/services/notionDatabaseService.ts";
import { PropertyService } from "../_shared/services/propertyService.ts";
import { ItemService } from "../_shared/services/itemService.ts";

import { NotionClient, ModuleContainer } from "../_shared/utils/modules.ts";


const moduleChain = new ModuleContainer();

Deno.serve(async (req) => {

  const notionDBs = await moduleChain.databaseRepos.getNotionDBs();


  for (const notionDB of notionDBs) {
    await moduleChain.notionDatabaseService.updateNotionDBs(notionDB);
  }
  return new Response(
    JSON.stringify("data"),
    { headers: { "Content-Type": "application/json" } },
  )
})
