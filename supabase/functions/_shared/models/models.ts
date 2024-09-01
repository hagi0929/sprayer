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
  lastUpdated: string;
  metadata: NotionDBMetadata;
}

export type NotionObjectColumn = {
  notionId: string;
  objectType: NotionObjectType;
  databaseId: string;
}

export interface DBRetriveDataModel {
  lastUpdated: string;
  properties: Record<string, PropertyColumn[]>;
}

export interface DBQueryDataModel {
  id: string;
  label: string;
  lastUpdated: string;
  created: string;
  properties: Record<string, PropertyColumn[]>;
  attributes: Record<string, any>;
}

export type DBOperations<OperationType> = {
  add: OperationType[];
  update: OperationType[];
  delete: string[];
}

export interface ItemColumn {
  notionId: string;
  label: string;
  itemName: string;
  metadata: any | null;
}

export type PropertyColumn = {
  notionId: string;
  label: string;
  propertyName?: string;
  metadata: any | null;
}

export type ItemPropertyRelationColumn = {
  itemId: string;
  propertyId: string;
}

export interface ParsedNotionAPIPropertyModel {
  type: string;
  body: any;
}

export type ParsedNotionAPIModel = {
  id: string;
  title: string;
  createdTime: string;
  lastUpdatedTime: string;
  properties: Map<string, ParsedNotionAPIPropertyModel>;
}

export type UrlModel = {
  type: string;
  url: string;
}