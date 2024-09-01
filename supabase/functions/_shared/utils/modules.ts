import { Client } from "npm:@notionhq/client";
import { DatabaseRepos } from "../repos/databaseRepos.ts";
import { NotionRepos } from "../repos/notionRepos.ts";
import { ItemService } from "../services/itemService.ts";
import { NotionDatabaseService } from "../services/notionDatabaseService.ts";
import { PropertyService } from "../services/propertyService.ts";
import { NotionRenderer } from "npm:@notion-render/client";
import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { Container, interfaces } from "npm:inversify";


export type NotionClient = {
  client: Client;
  renderer: NotionRenderer;
}

let container = new Container();


container.bind<DatabaseRepos>(Symbol.for("DatabaseRepos")).to(DatabaseRepos);
container.bind<NotionRepos>(Symbol.for("NotionRepos")).to(NotionRepos);
container.bind<ItemService>(Symbol.for("NotionRepos")).to(ItemService);
container.bind<NotionDatabaseService>(Symbol.for("NotionDatabaseService")).to(NotionDatabaseService);
container.bind<PropertyService>(Symbol.for("PropertyService")).to(PropertyService);
container.bind<NotionClient>("NotionClient").toDynamicValue(() => {
  const client = new Client({
    auth: Deno.env.get('NOTION_API_KEY')
  });
  const renderer = new NotionRenderer({ client });
  return { client, renderer };
});
container.bind<SupabaseClient>("SupabaseClient").toDynamicValue(() => {
  return createClient(
    Deno.env.get('SSUPABASE_URL')!,
    Deno.env.get('SSUPABASE_SERVICE_ROLE_KEY')!
  )
});

export default container;