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

export interface DBRetriveDataModel {
  lastUpdated: Date;
  properties: Record<string, PropertyColumn[]>;
}
export interface DBQueryDataModel {
  id: string;
  lastUpdated: Date;
  created: Date;
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
  metadata: JSON | null;
}

export type PropertyColumn = {
  notionId: string;
  label: string;
  propertyName?: string;
  metadata: JSON | null;
}

export type ItemPropertyRelationColumn = {
  itemId: string;
  propertyId: string;
} 

