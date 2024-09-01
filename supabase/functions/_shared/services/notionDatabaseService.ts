import { DBQueryDataModel, DBRetriveDataModel, ItemPropertyRelationColumn, NotionDBColumn, NotionDBMetadata, NotionObjectColumn, PropertyColumn } from '../models/models.ts';
import { NotionRepos } from '../repos/notionRepos.ts'
import { DatabaseRepos } from '../repos/databaseRepos.ts'
import { parseRetrivedDBData, parseQueryDBData } from '../utils/notionUtils.ts';
import { DependencyContainer, ModuleChain } from '../utils/modules.ts';

export class NotionDatabaseService {
  moduleChain: DependencyContainer;
  constructor(moduleChain: DependencyContainer) {
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

    if (lastUpdated && new Date(lastUpdated) >= new Date(DBPropertyData.lastUpdated)) return;
    const rawNotionQueryDBData = await this.moduleChain.notionRepos.queryDatabase(databaseId);
    const notionQueryDBData = parseQueryDBData(rawNotionQueryDBData, DBMetadata);
    console.log("notionQueryDBData", rawNotionQueryDBData);

    const propertyOperations = this.moduleChain.itemService.updateItems(DBPropertyData.properties, notionQueryDBData);

    if (propertyOperations.add.length > 0) {
      const propertiesToInsert: PropertyColumn[] = propertyOperations.add;
      await this.moduleChain.databaseRepos.insertProperties('Property', propertiesToInsert);
    }
    if (propertyOperations.update.length > 0) {
      const propertiesToUpdate: PropertyColumn[] = propertyOperations.update;
      await this.moduleChain.databaseRepos.updateProperties('Property', propertiesToUpdate);
    }
    if (propertyOperations.delete.length > 0) {
      const propertiesToDelete: string[] = propertyOperations.delete;
      await this.moduleChain.databaseRepos.deleteProperties('Property', propertiesToDelete);
    }

    const itemOperations = this.moduleChain.itemService.updateItems(DBPropertyData.properties, notionQueryDBData);
    const incomingItemsMap = new Map<string, DBQueryDataModel>(
      notionQueryDBData.map((item) => [item.id, item])
    );
    const propertyRelations: ItemPropertyRelationColumn[] = [];

    itemOperations.add.forEach((item) => {
      Object.keys(item.properties).forEach((propertyId) => {
        propertyRelations.push({
          itemId: item.notionId,
          propertyId,
        });
      });
    })
    if (itemOperations.delete.length > 0) {
      const itemsToDelete: string[] = itemOperations.delete;
      await this.moduleChain.databaseRepos.deleteNotionObjectsWithObjectIds(itemsToDelete);
    }
    if (itemOperations.add.length > 0) {
      const notionObjects: NotionObjectColumn[] = itemOperations.add.map((item) => ({
        notionId: item.id,
        notionType: 'item',
        databaseId,
      }));
      const propertyRelations: ItemPropertyRelationColumn[] = [];

    };
  }

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