import { NotionDBColumn, NotionDBMetadata, PropertyColumn } from '../models/models.ts';
import { NotionRepository } from '../repos/notionRepos.ts'
import { SupabaseRepository } from '../repos/supabaseRepos.ts'

export class NotionDatabaseService {
  notionRepos: NotionRepository;
  supabaseRepos: SupabaseRepository;
  constructor(notionRepos: NotionRepository, supabaseRepos: SupabaseRepository) {
    this.notionRepos = notionRepos;
    this.supabaseRepos = supabaseRepos;
  }


  parsePropertyData(rawPropertyData: any): PropertyColumn[] {
    switch (rawPropertyData.type) {
      case "multi_select":
        return rawPropertyData.multi_select.options.map((option: any) => {
          notionId = option.id;
          label = option.name;
          propertyName = rawPropertyData.name;
          metadata = option;
        });
      default:
        []
    }
    return [];
  }
  parseRetrivedDBData(rawRetrivedDBData: any, DBMetadata: NotionDBMetadata) {

    const properties = DBMetadata.propertyMap;
    console.log(rawRetrivedDBData);

    for (const property of properties) {
      parsePropertyData(rawRetrivedDBData.properties[property])
      parsedData.properties[property] = rawTrivedData.properties[property];
    }
    for (const attribute of attributes) {
      parsedData.attributes[attribute] = rawTrivedData.properties[attribute];
    }
    return parsedData;
  }
  async updateNotionDBs(notionDB: NotionDBColumn) {
    // check the date
    console.log("sdf");

    const notionId = notionDB.notionId;
    const DBMetadata = notionDB.metadata;
    const tableName = notionDB.metadata.tableName;
    const lastUpdated = notionDB.lastUpdated;
    try {
      console.log("notionDBDatasdf");

      const notionDBData = await this.notionRepos.retrieveDatabase(notionId);
      console.log("notionDBData");
    }
    catch (error) {
      console.log('Error fetching Notion data:', error);
      return;
    }
    const DBPropertyData = await this.parseRetrivedDBData(notionDBData, DBMetadata);
    console.log(DBPropertyData);
    return "hello"
  }
}