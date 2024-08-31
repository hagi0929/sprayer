enum NotionObjectType {
  PROPERTY = 'property',
  ITEM = 'item',
}

export interface NotionDBMetadata {
  tableName: string;
  propertyMap: { string: string }[];
  attributeMap: { string: string }[];
}

export interface NotionDBColumn {
  notionId: string;
  lastUpdated: Date;
  metadata: NotionDBMetadata;
}

export interface NotionObjectColumn {
  notionId: string;
  notionType: NotionObjectType;
  databaseId: string;
}

export interface DBPropertyDataModel {

  properties: { string: string }[];
  attributes: { string: string }[];
}

export interface ItemColumn {
  notionId: string;
  label: string;
  itemName: string;
  metadata: JSON;
}

export interface PropertyColumn {
  notionId: string;
  label: string;
  propertyName: string;
  metadata: JSON;
}