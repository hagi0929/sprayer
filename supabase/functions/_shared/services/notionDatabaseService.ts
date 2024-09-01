import { DBQueryDataModel, ItemColumn, ItemPropertyRelationColumn, NotionDBColumn, NotionObjectColumn, PropertyColumn } from '../models/models.ts';
import { NotionRepos } from '../repos/notionRepos.ts';
import { DatabaseRepos } from '../repos/databaseRepos.ts';
import { ItemService } from '../services/itemService.ts';
import { parseRetrivedDBData, parseQueryDBData } from '../utils/notionUtils.ts';
import { ModuleContainer } from "../utils/modules.ts";
import { oauthToken } from "npm:@notionhq/client";

export class NotionDatabaseService {
  private moduleContainer: ModuleContainer;

  constructor(

    moduleContainer: ModuleContainer
  ) {
    this.moduleContainer = moduleContainer; // Access the client from the NotionClient object
  }

  async updateNotionDBs(notionDB: NotionDBColumn) {
    const databaseId = notionDB.databaseId;
    const DBMetadata = notionDB.metadata;
    const tableName = notionDB.metadata.tableName;
    const lastUpdated = notionDB.lastUpdated;

    const notionDBData = await this.moduleContainer.notionRepos.retrieveDatabase(databaseId);
    const DBPropertyData = parseRetrivedDBData(notionDBData, DBMetadata);

    if (lastUpdated && new Date(lastUpdated) >= new Date(DBPropertyData.lastUpdated)) return;

    const rawNotionQueryDBData = await this.moduleContainer.notionRepos.queryDatabase(databaseId);
    const notionQueryDBData = parseQueryDBData(rawNotionQueryDBData, DBMetadata);
    console.log("propertyOperations", DBPropertyData);

    const { data: currentProperties, error } = await this.moduleContainer.supabaseClient.from("fullPropertyTable").select(
      `notionId, propertyName, metadata, label`
    ).eq('databaseId', databaseId);
    if (error) {
      console.error('Error fetching properties:', error);
      return;
    }

    const propertyOperations = this.moduleContainer.propertyService.updateProperties(currentProperties, DBPropertyData.properties);
    console.log("propertyOperations", propertyOperations);

    if (propertyOperations.add.length > 0) {

      const propertiesToInsert: PropertyColumn[] = propertyOperations.add;
      console.log("propertiesToInsert", propertiesToInsert);
      
      const notionObejctsToInsert: NotionObjectColumn[] = propertiesToInsert.map((property) => {
        return {
          notionId: property.notionId,
          objectType: 'property',
          databaseId,
        } as NotionObjectColumn;
      });

      await this.moduleContainer.databaseRepos.insertNotionObjects(notionObejctsToInsert);

      await this.moduleContainer.databaseRepos.insertProperties(propertiesToInsert);
    }

    if (propertyOperations.update.length > 0) {
      const propertiesToUpdate: PropertyColumn[] = propertyOperations.update;
      await this.moduleContainer.databaseRepos.updateProperties('Property', propertiesToUpdate);
    }

    if (propertyOperations.delete.length > 0) {
      const propertiesToDelete: string[] = propertyOperations.delete;
      await this.moduleContainer.databaseRepos.deleteNotionObjectsWithObjectIds(propertiesToDelete);
    }


    const { data: currentItems, error: dd } = await this.moduleContainer.supabaseClient.from("fullItemTable").select(
      `notionId, itemName, metadata, label`
    ).eq('databaseId', databaseId);
    if (dd) {
      console.error('Error fetching properties:', error);
      return;
    }
    const incomingItemMap = new Map<string, DBQueryDataModel>(
      notionQueryDBData.map((item) => [item.id, item])
    );

    const itemOperations = this.moduleContainer.itemService.validateItems(currentItems, incomingItemMap, lastUpdated);

    if (itemOperations.delete.length > 0) {
      await this.moduleContainer.databaseRepos.deleteNotionObjectsWithObjectIds(itemOperations.delete);
    }

    if (itemOperations.add.length > 0) {
      const notionObjectsToInsert: NotionObjectColumn[] = itemOperations.add.map((itemId) => {
        return {
          notionId: itemId,
          objectType: 'item',
          databaseId,
        } as NotionObjectColumn;
      });
      const propertyItemRelationsToInsert: ItemPropertyRelationColumn[] = []
      itemOperations.add.forEach((itemId) => {
        const item = incomingItemMap.get(itemId);
        if (!item) {
          console.error(`Failed to find item with ID ${itemId}`);
          throw new Error(`Failed to find item with ID ${itemId}`);
        }
        // flatten record and get only all the notion ids
        Object.keys(item.properties).forEach((propertyId) => {
          return item.properties[propertyId].forEach((property) =>
            propertyItemRelationsToInsert.push({ itemId, propertyId: property.notionId } as ItemPropertyRelationColumn));
        });
      });
      const itemsToInsert: ItemColumn[] = itemOperations.add.map((itemId) => {
        const item = incomingItemMap.get(itemId);
        if (!item) {
          console.error(`Failed to find item with ID ${itemId}`);
          throw new Error(`Failed to find item with ID ${itemId}`);
        }

        return {
          notionId: itemId,
          label: item.label,
          itemName: DBMetadata.tableName,
          metadata: item.attributes,
        } as ItemColumn;
      });
      
      await this.moduleContainer.databaseRepos.insertNotionObjects(notionObjectsToInsert);
      await this.moduleContainer.databaseRepos.insertItem(itemsToInsert);
      await this.moduleContainer.databaseRepos.insertItemPropertyRelations(propertyItemRelationsToInsert);
    }
  }

  // If you want to retrieve page content as well
  // async getPageContentForItems(notionQueryDBData: DBQueryDataModel[]) {
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
