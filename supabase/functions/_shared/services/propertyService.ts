import { PropertyColumn, DBOperations } from "../models/models.ts";
import { ModuleContainer } from "../utils/modules.ts";

export class PropertyService {
  private moduleContainer: ModuleContainer;

  constructor(

    moduleContainer: ModuleContainer
  ) {
    this.moduleContainer = moduleContainer;
  }

  updateProperties(
    currentProperties: PropertyColumn[],
    incomingProperties: Record<string, PropertyColumn[]>
  ): DBOperations<PropertyColumn> {
    const operations: DBOperations<PropertyColumn> = {
      add: [],
      update: [],
      delete: [],
    };

    const currentPropertyMap = new Map<string, PropertyColumn>();
    for (const property of currentProperties) {
      currentPropertyMap.set(property.notionId, property);
    }

    for (const [propertyName, incomingItems] of Object.entries(incomingProperties)) {
      for (const incomingItem of incomingItems) {
        const currentItem = currentPropertyMap.get(incomingItem.notionId);

        if (!currentItem) {
          operations.add.push(incomingItem);
        } else {
          if (JSON.stringify(currentItem) !== JSON.stringify(incomingItem)) {
            operations.update.push(incomingItem);
          }
          currentPropertyMap.delete(incomingItem.notionId);
        }
      }
    }

    currentPropertyMap.forEach((currentItem) => {
      operations.delete.push(currentItem.notionId);
    });

    return operations;
  }

}
