import { PropertyColumn, DBOperations } from "../models/models.ts";
import { ModuleChain } from "../utils.ts/modules.ts";

export class PropertyService {
  moduleChain: ModuleChain;
  constructor(moduleChain: ModuleChain) {
    this.moduleChain = moduleChain;
  }

  updateProperties(
    currentProperties: Record<string, PropertyColumn[]>,
    incomingProperties: Record<string, PropertyColumn[]>
  ): DBOperations {
    const operations: DBOperations = {
      add: [],
      update: [],
      delete: [],
    };

    const currentPropertyMap = new Map<string, PropertyColumn[]>(
      Object.entries(currentProperties)
    );

    const incomingPropertyMap = new Map<string, PropertyColumn[]>(
      Object.entries(incomingProperties)
    );

    // Compare and determine add, update, and delete operations for properties
    for (const [propertyName, incomingItems] of incomingPropertyMap) {
      const currentItems = currentPropertyMap.get(propertyName);

      if (!currentItems) {
        operations.add.push(...incomingItems);
      } else {
        for (const incomingItem of incomingItems) {
          const currentItem = currentItems.find(item => item.notionId === incomingItem.notionId);

          if (!currentItem) {
            operations.add.push(incomingItem);
          } else if (JSON.stringify(currentItem) !== JSON.stringify(incomingItem)) {
            operations.update.push(incomingItem);
          }
        }
      }
    }

    // Identify properties to delete
    for (const [propertyName, currentItems] of currentPropertyMap) {
      const incomingItems = incomingPropertyMap.get(propertyName);

      if (!incomingItems) {
        operations.delete.push(...currentItems.map(item => item.notionId));
      } else {
        for (const currentItem of currentItems) {
          if (!incomingItems.some(item => item.notionId === currentItem.notionId)) {
            operations.delete.push(currentItem.notionId);
          }
        }
      }
    }

    return operations;
  }

}