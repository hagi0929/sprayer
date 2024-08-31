import { DBPropertyDataModel, DBQueryDataModel, NotionDBColumn, NotionDBMetadata, PropertyColumn, UrlModel } from '../models/models.ts';
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
          return {
            notionId: option.id,
            label: option.name,
            metadata: null,
          } as PropertyColumn
        });
      case "select":
        return [{
          notionId: rawPropertyData.select.id,
          label: rawPropertyData.select.name,
          metadata: null,
        }];
      default:
        return [];
    }
  }

  parseAttributeData(rawPropertyData: any): any[] {
    switch (rawPropertyData.type) {
      case "multi_select":
        return rawPropertyData.multi_select.options.map((option: any) => {
          return option
        });
      case "rich_text":
        return [rawPropertyData.rich_text
          .map((text: any) => text.plain_text)
          .join(" ")];
      case "title":
        return [rawPropertyData.title
          .map((text: any) => text.plain_text)
          .join(" ")];
      case "select":
        return [rawPropertyData.select];
      case "url":
        return [{
          type: rawPropertyData.name,
          url: rawPropertyData.url || "",
        }];
      default:
        return [];
    }
  }

  parseRetrivedDBData(rawRetrivedDBData: any, DBMetadata: NotionDBMetadata): DBPropertyDataModel {

    const propertyMap = DBMetadata.propertyMap
    const attributeMap = DBMetadata.attributeMap
    const resultPropertyMap: Record<string, PropertyColumn[]> = {};
    const resultAttributeMap: Record<string, any> = {};
    console.log("rawRetrivedDBData.properties", rawRetrivedDBData.properties);

    for (const property in rawRetrivedDBData.properties) {
      console.log("property", property);
      console.log("propertyMap", propertyMap);
      console.log("propertyMap[property]", propertyMap[property]);

      if (propertyMap[property]) {
        const propertyName = propertyMap[property];
        const parsedPropertyData = this.parsePropertyData(rawRetrivedDBData.properties[property]);
        const i = parsedPropertyData.map((parsedData) => { return { ...parsedData, propertyName } });
        if (resultPropertyMap[propertyName]) {
          resultPropertyMap[propertyName].concat(i);
        } else {
          resultPropertyMap[propertyName] = i;
        }
      }
    }
    return {
      lastUpdated: rawRetrivedDBData.last_edited_time,
      properties: resultPropertyMap,
    }
  }

  parseQueryDBData(rawRetrivedDBData: any, DBMetadata: NotionDBMetadata): DBQueryDataModel {
    // console.log("rawRetrivedDBData", rawRetrivedDBData);

    const propertyMap = DBMetadata.propertyMap
    const attributeMap = DBMetadata.attributeMap
    const resultPropertyMap: Record<string, PropertyColumn[]> = {};
    const resultAttributeMap: Record<string, any> = {};
    // console.log("rawRetrivedDBData.properties", rawRetrivedDBData.properties);

    for (const property in rawRetrivedDBData.properties) {      
      if (propertyMap[property]) {
        const propertyName = propertyMap[property];
        const parsedPropertyData = this.parsePropertyData(rawRetrivedDBData.properties[property]);
        const i = parsedPropertyData.map((parsedData) => { return { ...parsedData, propertyName } });
        if (resultPropertyMap[propertyName]) {
          resultPropertyMap[propertyName].concat(i);
        } else {
          resultPropertyMap[propertyName] = i;
        }
      }
      if (attributeMap[property]) {
        const attributeName = attributeMap[property];
        const parsedAttributeData = this.parseAttributeData(rawRetrivedDBData.properties[property]);
        if (resultAttributeMap[attributeName]) {
          resultAttributeMap[attributeName].concat(parsedAttributeData);
        } else {
          resultAttributeMap[attributeName] = parsedAttributeData;
        }
      }
    }
    return {
      attributes: resultAttributeMap,
      properties: resultPropertyMap,
    }
  }

  async updateNotionDBs(notionDB: NotionDBColumn) {
    // check the date
    console.log(notionDB);

    const databaseId = notionDB.databaseId;
    const DBMetadata = notionDB.metadata;
    const tableName = notionDB.metadata.tableName;
    const lastUpdated = notionDB.lastUpdated;

    const notionDBData = await this.notionRepos.retrieveDatabase(databaseId);
    console.log("before", notionDBData);

    const DBPropertyData = this.parseRetrivedDBData(notionDBData, DBMetadata);

    console.log("after", DBPropertyData);

    // TODO: Implement the following logic
    const getPageContent = false;


    if (!lastUpdated || lastUpdated < DBPropertyData.lastUpdated) {
      const rawNotionQueryDBData = await this.notionRepos.queryDatabase(databaseId);
      const notionQueryDBData = this.parseQueryDBData(rawNotionQueryDBData, DBMetadata);
      console.log("sinuu", notionQueryDBData);

    }
  }
}