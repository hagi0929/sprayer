import { PropertyColumn, DBOperations } from "../models/models.ts";
import { DependencyContainer, ModuleChain } from "../utils/modules.ts";

export class PropertyService {
  moduleChain: DependencyContainer;
  constructor(moduleChain: DependencyContainer) {
    this.moduleChain = moduleChain;
  }

  updateProperties(
    currentProperties: Record<string, PropertyColumn[]>,
    incomingProperties: Record<string, PropertyColumn[]>
  ): DBOperations<PropertyColumn> {
    const operations: DBOperations<PropertyColumn> = {
      add: [],
      update: [],
      delete: [],
    };

    // Create a map for quick lookup of current properties by notionId
    const currentPropertyMap = new Map<string, PropertyColumn>();
    for (const [propertyName, propertyColumns] of Object.entries(currentProperties)) {
      for (const propertyColumn of propertyColumns) {
        currentPropertyMap.set(propertyColumn.notionId, propertyColumn);
      }
    }

    // Process incoming properties
    for (const [propertyName, incomingItems] of Object.entries(incomingProperties)) {
      for (const incomingItem of incomingItems) {
        const currentItem = currentPropertyMap.get(incomingItem.notionId);

        if (!currentItem) {
          // Incoming item not found in current properties, add it
          operations.add.push(incomingItem);
        } else {
          // Incoming item found in current properties, check if it needs an update
          if (JSON.stringify(currentItem) !== JSON.stringify(incomingItem)) {
            operations.update.push(incomingItem);
          }
          // Remove the processed current property from the map
          currentPropertyMap.delete(incomingItem.notionId);
        }
      }
    }

    // Any remaining properties in currentPropertyMap are to be deleted
    currentPropertyMap.forEach((currentItem) => {
      operations.delete.push(currentItem.notionId);
    });

    return operations;
  }

}