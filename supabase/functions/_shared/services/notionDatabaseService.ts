import { DBQueryDataModel, DBRetriveDataModel, NotionDBColumn, NotionDBMetadata, PropertyColumn } from '../models/models.ts';
import { NotionRepository } from '../repos/notionRepos.ts'
import { SupabaseRepository } from '../repos/databaseRepos.ts'
import { parseRetrivedDBData, parseQueryDBData } from '../utils.ts/notionUtils.ts';
import { ModuleChain } from '../utils.ts/modules.ts';

export class NotionDatabaseService {
  moduleChain: ModuleChain;
  constructor(moduleChain: ModuleChain) {
    this.moduleChain = moduleChain;
  }



  async updateNotionDBs(notionDB: NotionDBColumn) {

    const databaseId = notionDB.databaseId;
    const DBMetadata = notionDB.metadata;
    const tableName = notionDB.metadata.tableName;
    const lastUpdated = notionDB.lastUpdated;

    const notionDBData = await this.moduleChain.notionRepos.retrieveDatabase(databaseId);
    const DBPropertyData = parseRetrivedDBData(notionDBData, DBMetadata);

    // TODO: Implement the following logic
    const getPageContent = true;

    if (lastUpdated && new Date(lastUpdated) >= new Date(DBPropertyData.lastUpdated)) {
      const rawNotionQueryDBData = await this.moduleChain.notionRepos.queryDatabase(databaseId);
      const notionQueryDBData = parseQueryDBData(rawNotionQueryDBData, DBMetadata);
      // if (getPageContent) {
      //   for (const item of notionQueryDBData) {
      //     try {
      //       const pageContent = await this.notionRepos.getChildBlocks(item.id);
      //       item.attributes = {
      //         ...item.attributes,
      //         pageContent: pageContent.results,
      //       };
      //     } catch (error) {
      //       console.error(`Failed to get page content for item ID ${item.id}:`, error);
      //     }
      //   }
      // }
      

    }
  }
}