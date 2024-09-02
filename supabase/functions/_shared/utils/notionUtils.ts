import { ParsedNotionAPIModel, ParsedNotionAPIPropertyModel, PropertyColumn } from "../models/models.ts";


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
      if (!rawPropertyData.select) {
        parsedProperty.body = [];
        break;
      }
      const rawData = isRetriveData ? rawPropertyData.select.options : [rawPropertyData.select];

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