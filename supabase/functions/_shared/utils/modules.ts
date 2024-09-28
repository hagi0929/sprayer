import { Client } from "npm:@notionhq/client";
import { DatabaseRepos } from "../repos/databaseRepos.ts";
import { NotionRepos } from "../repos/notionRepos.ts";
import { ItemService } from "../services/itemService.ts";
import { NotionDatabaseService } from "../services/notionDatabaseService.ts";
import { PropertyService } from "../services/propertyService.ts";
import { NotionRenderer } from "npm:@notion-render/client";
import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { StorageService } from "../services/storageService.ts";
import { NotionAPI } from 'npm:notion-client'


export type NotionClient = {
  client: Client;
  sessionClient: NotionAPI;
  renderer: NotionRenderer;
};

export class ModuleContainer {
  notionClient: NotionClient;
  supabaseClient: SupabaseClient;
  databaseRepos: DatabaseRepos;
  notionRepos: NotionRepos;
  itemService: ItemService;
  notionDatabaseService: NotionDatabaseService;
  propertyService: PropertyService;
  storageService: StorageService;

  constructor() {
    const client = new Client({
      auth: Deno.env.get("NOTION_API_KEY"),
    });
    const notionAPI = new NotionAPI({
      activeUser: Deno.env.get("NOTION_ACTIVE_USER"),
      authToken: Deno.env.get("NOTION_TOKEN_V2")
    })
    this.notionClient = {
      client: client,
      sessionClient: notionAPI,
      renderer: new NotionRenderer({ client }),
    };
    this.supabaseClient = createClient(
      Deno.env.get("SSUPABASE_URL")!,
      Deno.env.get("SSUPABASE_SERVICE_ROLE_KEY")!,
    );
    this.databaseRepos = new DatabaseRepos(this);
    this.notionRepos = new NotionRepos(this);
    this.itemService = new ItemService(this);
    this.notionDatabaseService = new NotionDatabaseService(this);
    this.propertyService = new PropertyService(this);
    this.storageService = new StorageService(this);
  }
}