// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { Client } from "npm:@notionhq/client";
import { NotionRenderer } from "npm:@notion-render/client";
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { NotionRepos } from "../_shared/repos/notionRepos.ts";
import { DatabaseRepos } from "../_shared/repos/databaseRepos.ts";
import { NotionDatabaseService } from "../_shared/services/notionDatabaseService.ts";
import { PropertyService } from "../_shared/services/propertyService.ts";
import { ItemService } from "../_shared/services/itemService.ts";

import { Container } from "npm:inversify";


console.log("Hello from Functions!")

const client = new Client({
  auth: Deno.env.get('NOTION_API_KEY')
});

container.bind<Katana>("Katana").toDynamicValue((context: interfaces.Context) => { return Promise.resolve(new Katana()); });


class NotionClient {
  client: Client;
  renderer: NotionRenderer;
  constructor(client: Client) {
    this.client = client;
    this.renderer = new NotionRenderer({ client });
  }
}
const supabaseClient = createClient(
  Deno.env.get('SSUPABASE_URL')!,
  Deno.env.get('SSUPABASE_SERVICE_ROLE_KEY')!
)


const container = new Container();

// Register clients
container.register('NotionClient', { useValue: notionClient });
container.register('SupabaseClient', { useValue: supabaseClient });

// Register services
container.register('NotionRepos', { useClass: NotionRepos });
container.register('DatabaseRepos', { useClass: DatabaseRepos });

container.register('PropertyService', { useClass: PropertyService });
container.register('ItemService', { useClass: ItemService });
container.register('NotionDatabaseService', { useClass: NotionDatabaseService });

const moduleChain = new ModuleChain(container);




Deno.serve(async (req) => {
  const { name } = await req.json()

  const notionDBs = await moduleChain.databaseRepos.getNotionDBs();

  // console.log(notionDBs);

  for (const notionDB of notionDBs) {
    // console.log(notionDB);
    await moduleChain.notionDatabaseService.updateNotionDBs(notionDB);
  }
  return new Response(
    JSON.stringify("data"),
    { headers: { "Content-Type": "application/json" } },
  )
})
