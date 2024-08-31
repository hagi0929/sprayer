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
        rawPropertyData.multi_select.options.map((option: any) => {
          return {
            notionId: option.id,
            name: option.name,
            metadata: null,
          }
        });
      case "select":
        return [{
          notionId: rawPropertyData.select.id,
          name: rawPropertyData.select.name,
          metadata: null,
        }]
      default:
        []
    }
    return [];
  }
  parseRetrivedDBData(rawRetrivedDBData: any, DBMetadata: NotionDBMetadata) {

    const propertyMap = DBMetadata.propertyMap
    const attributeMap = DBMetadata.attributeMap
    const resultPropertyMap: Record<string, PropertyColumn[]> = {};
    const resultAttributeMap: Record<string, any> = {};
    for (const property of rawRetrivedDBData.properties) {
      if (propertyMap[property]) {
        const propertyName = propertyMap[property];
        const parsedPropertyData = this.parsePropertyData(rawRetrivedDBData.properties[property]);
        if (resultPropertyMap[propertyName]) {
          resultPropertyMap[propertyName].push(parsedPropertyData);
        } else {
          resultPropertyMap[propertyName] = [parsedPropertyData];
        }
      }
      if (attributeMap[property]) {
        const attributeName = attributeMap[property];
        resultAttributeMap[attributeMap[property]] = [];
      }
    }
    for (const [from, to] of Object.entries(propertyMap)) {
      const rawPropertyData = rawRetrivedDBData.properties[from];
      const parsedPropertyData = this.parsePropertyData(rawPropertyData);
      parsedPropertyData.map((parsedData) => {
        const obj = {
          notionId: parsedData.notionId,
          label: parsedData.name,
          propertyName: to,
          metadata: parsedData.metadata,
        }
        if (resultPropertyMap[to]) {
          resultPropertyMap[to].push(obj);
        } else {
          resultPropertyMap[to] = [obj];
        }
      })
    }
    for (const [from, to] of Object.entries(attributeMap)) {
      const rawPropertyData = rawRetrivedDBData.properties[from];
      const parsedPropertyData = this.parsePropertyData(rawPropertyData);
      parsedPropertyData.map((parsedData) => {
        const obj = {
          notionId: parsedData.notionId,
          label: parsedData.name,
          propertyName: to,
          metadata: parsedData.metadata,
        }
        if (resultPropertyMap[to]) {
          resultPropertyMap[to].push(obj);
        } else {
          resultPropertyMap[to] = [obj];
        }
      })
    }

  }
  async updateNotionDBs(notionDB: NotionDBColumn) {
    // check the date
    console.log(notionDB);

    const databaseId = notionDB.databaseId;
    const DBMetadata = notionDB.metadata;
    const tableName = notionDB.metadata.tableName;
    const lastUpdated = notionDB.lastUpdated;
    console.log("notionDBDatasdf", databaseId);

    const notionDBData = await this.notionRepos.retrieveDatabase(databaseId);
    console.log("notionDBData");
    const DBPropertyData = this.parseRetrivedDBData(notionDBData, DBMetadata);
    console.log(DBPropertyData);
  }
}