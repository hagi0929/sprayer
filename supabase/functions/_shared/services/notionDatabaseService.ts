import { DBQueryDataModel, FileModel, ItemColumn, ItemPropertyRelationColumn, NotionDBColumn, NotionDBMetadata, NotionObjectColumn, NotionPropertyType, ParsedNotionAPIModel, ParsedNotionAPIPropertyModel, PropertyColumn, UrlModel } from '../models/models.ts';
import { NotionRepos } from '../repos/notionRepos.ts';
import { DatabaseRepos } from '../repos/databaseRepos.ts';
import { ItemService } from '../services/itemService.ts';
import { parseRetrivedDBData, parseQueryDBData, parseNotionData } from '../utils/notionUtils.ts';
import { ModuleContainer } from "../utils/modules.ts";

export class NotionDatabaseService {
  private moduleContainer: ModuleContainer;

  constructor(

    moduleContainer: ModuleContainer
  ) {
    this.moduleContainer = moduleContainer; // Access the client from the NotionClient object
  }

  convertToPropertyColumn(DBPropertyData: ParsedNotionAPIPropertyModel, newPropertyName: string): PropertyColumn[] | null {
    switch (DBPropertyData.type) {
      case 'title':
        console.error("title is not property");
        return null;
      case 'rich_text':
        console.error("rich_text is not property");
        return null;
      case 'multi_select':
      case 'select':
        return DBPropertyData.body.map((option) => {
          return {
            propertyType: NotionPropertyType.SELECT,
            notionId: option.id,
            label: option.name,
            propertyName: newPropertyName,
            metadata: null,
          } as PropertyColumn;
        })
      case 'files':
        return DBPropertyData.body.map((option) => {
          return {
            notionId: option.file.id,
            label: option.file.name,
            propertyName: newPropertyName,
            propertyType: NotionPropertyType.FILE,
            metadata: {
              file: this.moduleContainer.storageService.uploadPublicFile(option.file.url),
            },
          } as PropertyColumn;
        });
        break;
      default:
        console.error(`Unsupported property type 1: ${DBPropertyData.type}`);
        return null;
    }
  }

  convertToAttributeObject(DBPropertyData: ParsedNotionAPIPropertyModel, oldName: string): UrlModel | FileModel | string[] | string | null {
    switch (DBPropertyData.type) {
      case 'title':
        console.error("title is not atribute");
        return null;
      case 'rich_text':
        return DBPropertyData.body;
      case 'multi_select':
      case 'select':
        return DBPropertyData.body.map((option) => {
          return option.name;
        });
      case 'files':
        return DBPropertyData.body.map(async (option) => {
          return this.moduleContainer.storageService.uploadPublicFile(option.file.url);
        });
      case 'url':
        return { type: oldName, url: DBPropertyData.body.url } as UrlModel;
      case 'checkbox':
        return DBPropertyData.body ? 'true' : 'false';
      default:
        console.error(`Unsupported property type 2: ${DBPropertyData.type}`);
        return null;
    }
  }

  groupPropertyData(DBPropertyData: Map<string, ParsedNotionAPIPropertyModel>, metadata: NotionDBMetadata, handleAttribute: boolean = true) {
    const propertyNames = metadata.propertyMap;
    const attributeNames = metadata.attributeMap;
    const groupedPropertyData: Record<string, PropertyColumn[]> = {};
    const groupedAttributeData: Record<string, any[]> = {};
    if (handleAttribute) {
      for (const attributeName of Object.values(attributeNames)) {
        groupedAttributeData[attributeName] = [];
      }
    }
    for (const [propertyName, propertyData] of DBPropertyData) {
      if (propertyNames[propertyName]) {
        const newPropertyName = propertyNames[propertyName];
        const propertyColumn = this.convertToPropertyColumn(propertyData, newPropertyName);
        if (!propertyColumn) continue;
        if (groupedPropertyData[newPropertyName]) {
          groupedPropertyData[newPropertyName] = groupedPropertyData[newPropertyName].concat(propertyColumn);
        } else {
          groupedPropertyData[newPropertyName] = propertyColumn;
        }
      }

      if (handleAttribute && attributeNames[propertyName]) {
        const newAttributeName = attributeNames[propertyName];

        const attributeObject = this.convertToAttributeObject(propertyData, propertyName);
        if (attributeObject == null) continue;

        if (Array.isArray(attributeObject)) {
          groupedAttributeData[newAttributeName] = groupedAttributeData[newAttributeName].concat(attributeObject);
        } else {
          groupedAttributeData[newAttributeName].push(attributeObject);
        }
      }
    }
    return {
      properties: groupedPropertyData,
      attributes: groupedAttributeData
    };
  }

  async updateNotionDBs(notionDB: NotionDBColumn) {
    const databaseId = notionDB.databaseId;
    const DBMetadata: NotionDBMetadata = notionDB.metadata;
    const tableName = notionDB.metadata.tableName;
    const lastUpdated = notionDB.lastUpdated;

    const rawRetrivedData = await this.moduleContainer.notionRepos.retrieveDatabase(databaseId);
    const parsedRetrivedData = parseNotionData(rawRetrivedData);
    const { properties: retrivedPropertyData } = this.groupPropertyData(parsedRetrivedData.properties, DBMetadata, false);


    if (lastUpdated && new Date(lastUpdated) >= new Date(parsedRetrivedData.lastUpdatedTime)) return;

    const DBPropertyData = parsedRetrivedData.properties;

    const { data: currentProperties, error } = await this.moduleContainer.supabaseClient.from("fullPropertyTable").select(
      `notionId, propertyName, metadata, label`
    ).eq('databaseId', databaseId);
    if (error) {
      console.error('Error fetching properties:', error);
      return;
    }
    const propertyOperations = this.moduleContainer.propertyService.updateProperties(currentProperties, retrivedPropertyData);

    if (propertyOperations.add.length > 0) {

      const propertiesToInsert: PropertyColumn[] = propertyOperations.add;

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


    const rawNotionQueryData = await this.moduleContainer.notionRepos.queryDatabase(databaseId);
    const parsedNotionQueryData = rawNotionQueryData.results.map((d) => parseNotionData(d));

    const { data: currentItems, error: dd } = await this.moduleContainer.supabaseClient.from("fullItemTable").select(
      `notionId, itemName, metadata, label`
    ).eq('databaseId', databaseId);
    if (dd) {
      console.error('Error fetching properties:', error);
      return;
    }
    const incomingItemMap = new Map<string, ParsedNotionAPIModel>(
      parsedNotionQueryData.map((item) => [item.id, item])
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
      // TODO: iam fucking drunked rn check if this is okay
      const incomingPropertyAtributeMap = new Map<string, { properties: Record<string, PropertyColumn[]>, attributes: Record<string, any> }>(
        itemOperations.add.map((item) => {
          const itemObj = incomingItemMap.get(item);
          if (!itemObj) {
            console.error(`Failed to find item with ID ${item}`);
            throw new Error(`Failed to find item with ID ${item}`);
          }
          const { properties, attributes } = this.groupPropertyData(itemObj.properties, DBMetadata);
          return [item, { properties, attributes }];
        })
      );

      const propertyItemRelationsToInsert: ItemPropertyRelationColumn[] = []
      itemOperations.add.forEach((itemId) => {
        const item = incomingPropertyAtributeMap.get(itemId);
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
        const atributes = incomingPropertyAtributeMap.get(itemId)?.attributes;
        if (!item) {
          console.error(`Failed to find item with ID ${itemId}`);
          throw new Error(`Failed to find item with ID ${itemId}`);
        }

        return {
          notionId: itemId,
          label: item.title,
          itemName: DBMetadata.tableName,
          metadata: atributes,
        } as ItemColumn;
      });

      await this.moduleContainer.databaseRepos.insertNotionObjects(notionObjectsToInsert);
      await this.moduleContainer.databaseRepos.insertItem(itemsToInsert);

      await this.moduleContainer.databaseRepos.insertItemPropertyRelations(propertyItemRelationsToInsert);
    }
  }
}
