import { DBQueryDataModel, DBRetriveDataModel, NotionDBMetadata, ParsedNotionAPIModel, ParsedNotionAPIPropertyModel, PropertyColumn } from "../models/models.ts";

export function parsePropertyData(rawPropertyData: any, name: string = ""): PropertyColumn[] | null {
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
      console.error("files Here", rawPropertyData);

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
          console.error("rawPropertyData (files):", rawPropertyData);
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
        console.error(`Skipping empty or undefined property: ${propertyName}`);
      }
    } else {
      console.error(`Property ${property} has no valid data or is unsupported.`);
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

export function parseNotionPropertyData(rawPropertyData: any, isRetriveData: boolean): ParsedNotionAPIPropertyModel | null {
  const type = rawPropertyData.type;
  if (!type) {
    console.error("Property type not found");
    return null;
  }
  const parsedProperty = { type: type } as ParsedNotionAPIPropertyModel;
  switch (type) {
    case "title": {
      parsedProperty.body = rawPropertyData.title
        .map((text: any) => text.plain_text)
        .join(" ");
      break;
    }
    case "multi_select": {
      const rawData = isRetriveData ? rawPropertyData.multi_select.options : rawPropertyData.multi_select;
      parsedProperty.body = rawData.map((option: any) => {
        return { ...option };
      });
      break;
    }
    case "select": {
      console.log("rawPropertyData.select", rawPropertyData.select);
      if (!rawPropertyData.select) {
        parsedProperty.body = [];
        break;
      }
      const rawData = isRetriveData ? rawPropertyData.select.options : [rawPropertyData.select];
      console.log("isRetriveData", isRetriveData);

      console.log("rawData", rawData);

      parsedProperty.body = rawData.map((option: any) => {
        return { ...option };
      });
      break;
    }
    case "rich_text": {
      if (isRetriveData) {
        return null;
      }
      parsedProperty.body = rawPropertyData.rich_text.map((text: any) => text.plain_text).join(" ");
      break;
    }
    case "url": {
      parsedProperty.body = {
        url: rawPropertyData.url || "",
      };
      break;
    } case "files": {
      if (isRetriveData) {
        return null;
      }
      // TODO - Add logic for handling files if necessary
      parsedProperty.body = rawPropertyData.files;
      break;
    }
    case "checkbox": {
      parsedProperty.body = rawPropertyData.checkbox;
      break;
    } default: {
      console.error(`Unsupported property type 1: ${rawPropertyData.type}`);
      return null;
    }
  }
  return parsedProperty;
}

export function parseNotionData(rawNotionData: any): ParsedNotionAPIModel {
  const isRetriveData = rawNotionData.object === "database";

  const notionId = rawNotionData.id;

  const titleMap = isRetriveData ? rawNotionData.title : rawNotionData.properties.title.title;
  const title = titleMap.map((text: any) => text.plain_text).join(" ");

  const lastUpdatedTime = rawNotionData.last_edited_time;
  const createdTime = rawNotionData.created_time;

  const properties: Map<string, any> = new Map();

  for (const property in rawNotionData.properties) {
    if (property == "title") {
      continue;
    }
    const rawPropertyData = rawNotionData.properties[property];
    const parsedPropertyData = parseNotionPropertyData(rawPropertyData, isRetriveData);
    if (parsedPropertyData === null) continue;
    properties.set(property, parsedPropertyData);
  }

  return {
    id: notionId,
    title: title,
    createdTime: createdTime,
    lastUpdatedTime: lastUpdatedTime,
    properties: properties,
  };
}