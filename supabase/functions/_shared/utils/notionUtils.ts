import { DBQueryDataModel, DBRetriveDataModel, NotionDBMetadata, PropertyColumn } from "../models/models.ts";

export function parsePropertyData(rawPropertyData: any, name: string = ""): PropertyColumn[] | null {
  console.log("rawPropertyData", rawPropertyData);
  switch (rawPropertyData.type) {
    case "multi_select":
      return rawPropertyData.multi_select.map((option: any) => {
        return {
          notionId: option.id,
          label: option.name,
          metadata: null,
        } as PropertyColumn;
      });
    case "select":
      if (rawPropertyData.select) {
        return [{
          notionId: rawPropertyData.select.id,
          label: rawPropertyData.select.name,
          metadata: null,
        }];
      } else {
        return null;
      }
    case "files":
      console.log("files Here", rawPropertyData);

    default:
      console.error(`Unsupported property type 1: ${rawPropertyData.type}`);
  }
}

export function parseAttributeData(rawPropertyData: any, name: string = ""): any[] | null {
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
      return [rawPropertyData.select && {
        notionId: rawPropertyData.select.id,
        label: rawPropertyData.select.name,
        metadata: null,
      }];
    case "url":
      return [{
        type: name,
        url: rawPropertyData.url || "",
      }];
    case "files":
      {
        const files = rawPropertyData.files
        return files.length > 0 ? files : null;
      }
    case "checkbox":
      {
        return [rawPropertyData.checkbox];
      }
    default:
      throw new Error(`Unsupported property type 2: ${rawPropertyData.type}`);
  }
}

export function parseRetrivedDBData(rawRetrivedDBData: any, DBMetadata: NotionDBMetadata): DBRetriveDataModel {
  const propertyMap = DBMetadata.propertyMap;
  const attributeMap = DBMetadata.attributeMap;
  const resultPropertyMap: Record<string, PropertyColumn[]> = {};
  const resultAttributeMap: Record<string, any> = {};

  for (const property in rawRetrivedDBData.properties) {
    const rawPropertyData = rawRetrivedDBData.properties[property];
    let parsedPropertyData: PropertyColumn[] | undefined = undefined;

    if (rawPropertyData && rawPropertyData.type) {
      const propertyName = propertyMap[property];

      switch (rawPropertyData.type) {
        case "multi_select":
          parsedPropertyData = rawPropertyData.multi_select.map((option: any) => ({
            notionId: option.id,
            propertyName,
            label: option.name,
            metadata: null,
          }));
          break;

        case "select":
          parsedPropertyData = rawPropertyData.select ? [{
            notionId: rawPropertyData.select.id,
            propertyName,
            label: rawPropertyData.select.name,
            metadata: null,
          }] : [];
          break;

        case "files":
          console.log("rawPropertyData (files):", rawPropertyData);
          // Add logic for handling files if necessary
          break;

        default:
          console.error(`Unsupported property type: ${rawPropertyData.type}`);
      }

      // If parsedPropertyData is undefined or an empty array, skip adding it to resultPropertyMap
      if (parsedPropertyData && parsedPropertyData.length > 0) {
        if (resultPropertyMap[propertyName]) {
          resultPropertyMap[propertyName] = resultPropertyMap[propertyName].concat(parsedPropertyData);
        } else {
          resultPropertyMap[propertyName] = parsedPropertyData;
        }
      } else {
        console.log(`Skipping empty or undefined property: ${propertyName}`);
      }
    } else {
      console.log(`Property ${property} has no valid data or is unsupported.`);
    }
  }

  return {
    lastUpdated: rawRetrivedDBData.last_edited_time,
    properties: resultPropertyMap,
  };
}

export function parseQueryDBData(rawQueryDBDatas: any, DBMetadata: NotionDBMetadata): DBQueryDataModel[] {
  const results = rawQueryDBDatas.results;
  return results.map((rawQuerydDBData: any) => {

    const propertyMap = DBMetadata.propertyMap
    const attributeMap = DBMetadata.attributeMap
    const resultPropertyMap: Record<string, PropertyColumn[]> = {};
    const resultAttributeMap: Record<string, any> = {};
    // console.log("rawRetrivedDBData", rawRetrivedDBData);
    const title = rawQuerydDBData.properties.title
      .map((text: any) => text.plain_text)
      .join(" ")
    for (const property in rawQuerydDBData.properties) {
      const rawPropertyData = rawQuerydDBData.properties[property];
      let parsedPropertyData: PropertyColumn[] | undefined = undefined;
      
      if (propertyMap[property]) {
        const propertyName = propertyMap[property];

        const parsedPropertyData = parsePropertyData(rawRetrivedDBData.properties[property]);
        if (!parsedPropertyData) {
          console.error("parsedPropertyData not working line 126", parsedPropertyData);
          continue;
        }
        const i = parsedPropertyData.map((parsedData) => { return { ...parsedData, propertyName } });
        if (resultPropertyMap[propertyName]) {
          resultPropertyMap[propertyName] = resultPropertyMap[propertyName].concat(i);
        } else {
          resultPropertyMap[propertyName] = i;
        }
      }

      if (attributeMap[property]) {
        const attributeName = attributeMap[property];
        const parsedAttributeData = parseAttributeData(rawRetrivedDBData.properties[property], property);
        if (resultAttributeMap[attributeName]) {
          resultAttributeMap[attributeName] = resultAttributeMap[attributeName].concat(parsedAttributeData);
        } else {
          resultAttributeMap[attributeName] = parsedAttributeData;
        }
      }
    }
    return {
      id: rawRetrivedDBData.id,
      label: title,
      lastUpdated: rawRetrivedDBData.last_edited_time,
      created: rawRetrivedDBData.created_time,
      attributes: resultAttributeMap,
      properties: resultPropertyMap,
    }
  })
}

export function parseNotionData() {
  
}