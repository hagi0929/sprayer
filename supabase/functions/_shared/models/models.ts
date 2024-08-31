enum NotionObjectType {
  PROPERTY = 'property',
  ITEM = 'item',
}

export interface NotionDBMetadata {
  tableName: string;
  propertyMap: {string: string}[];
  attributeMap: {string: string}[];
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

