import { DBQueryDataModel, DBRetriveDataModel, NotionDBMetadata, PropertyColumn } from "../models/models.ts";

export function parsePropertyData(rawPropertyData: any, name: string = ""): PropertyColumn[] {
  switch (rawPropertyData.type) {
    case "multi_select":
      return (rawPropertyData.multi_select.options || rawPropertyData.multi_select).map((option: any) => {
        return {
          notionId: option.id,
          label: option.name,
          metadata: null,
        } as PropertyColumn
      });
    case "select":

      return [rawPropertyData.select && {
        notionId: rawPropertyData.select.id,
        label: rawPropertyData.select.name,
        metadata: null,
      }];
    default:
      return [];
  }
}

export function parseAttributeData(rawPropertyData: any, name: string = ""): any[] {
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
        type: name,
        url: rawPropertyData.url || "",
      }];
    default:
      return [];
  }
}

export function parseRetrivedDBData(rawRetrivedDBData: any, DBMetadata: NotionDBMetadata): DBRetriveDataModel {

  const propertyMap = DBMetadata.propertyMap
  const attributeMap = DBMetadata.attributeMap
  const resultPropertyMap: Record<string, PropertyColumn[]> = {};
  const resultAttributeMap: Record<string, any> = {};

  for (const property in rawRetrivedDBData.properties) {

    if (propertyMap[property]) {
      const propertyName = propertyMap[property];
      const parsedPropertyData = parsePropertyData(rawRetrivedDBData.properties[property], property);
      const i = parsedPropertyData.map((parsedData) => { return { ...parsedData, propertyName } });
      if (resultPropertyMap[propertyName]) {
        resultPropertyMap[propertyName] = resultPropertyMap[propertyName].concat(i);

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

export function parseQueryDBData(rawRetrivedDBDatas: any, DBMetadata: NotionDBMetadata): DBQueryDataModel[] {
  const results = rawRetrivedDBDatas.results;
  return results.map((rawRetrivedDBData: any) => {

    const propertyMap = DBMetadata.propertyMap
    const attributeMap = DBMetadata.attributeMap
    const resultPropertyMap: Record<string, PropertyColumn[]> = {};
    const resultAttributeMap: Record<string, any> = {};
    console.log("rawRetrivedDBData", rawRetrivedDBData);

    for (const property in rawRetrivedDBData.properties) {
      // console.log("propertyMap", propertyMap);
      // console.log("attributeMap", attributeMap);
      // console.log("propertyMap[property]", propertyMap[property]);
      // console.log("attributeMap[property]", attributeMap[property]);
      if (propertyMap[property]) {
        const propertyName = propertyMap[property];

        const parsedPropertyData = parsePropertyData(rawRetrivedDBData.properties[property]);
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
      lastUpdated: rawRetrivedDBData.last_edited_time,
      created: rawRetrivedDBData.created_time,
      attributes: resultAttributeMap,
      properties: resultPropertyMap,
    }
  })
}
