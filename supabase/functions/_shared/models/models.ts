enum NotionObjectType {
  PROPERTY = 'property',
  ITEM = 'item',
}

export interface NotionDBMetadata {
  tableName: string;
  propertyMap: Record<string, string>;
  attributeMap: Record<string, string>;
}

export interface NotionDBColumn {
  databaseId: string;
  lastUpdated: Date;
  metadata: NotionDBMetadata;
}

export interface NotionObjectColumn {
  notionId: string;
  notionType: NotionObjectType;
  databaseId: string;
}

export interface DBPropertyDataModel {

  properties: Record<string, string>;
  attributes: Record<string, string>;
}

export interface ItemColumn {
  notionId: string;
  label: string;
  itemName: string;
  metadata: JSON;
}

export type PropertyColumn {
  notionId: string;
  label: string;
  propertyName: string;
  metadata: JSON | null;
}