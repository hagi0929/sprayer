export class ModuleChain {
  notionRepos: any;
  databaseRepos: any;
  notionDatabaseService: any;
  itemService: any;
  propertyService: any;
  notionClient: any;
  supabaseClient: any;
  addNotionRepos(notionRepos: any) {
    this.notionRepos = notionRepos;
    return this;
  }
  addItemService(itemService: any) {
    this.itemService = itemService;
    return this;
  }
  addPropertyService(propertyService: any) {
    this.propertyService = propertyService;
    return this;
  }
  addDatabaseRepos(databaseRepos: any) {
    this.databaseRepos = databaseRepos;
    return this;
  }
  addNotionDatabaseService(notionDatabaseService: any) {
    this.notionDatabaseService = notionDatabaseService;
    return this;
  }
  addNotionClient(notionClient: any) {
    this.notionClient = notionClient;
    return this;
  }
  addSupabaseClient(supabaseClient: any) {
    this.supabaseClient = supabaseClient;
    return this;
  }
}
