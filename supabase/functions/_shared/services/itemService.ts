import { NotionDBColumn, DBOperations, ItemColumn, DBQueryDataModel, NotionObjectColumn, ParsedNotionAPIModel } from "../models/models.ts";
import { ModuleContainer } from "../utils/modules.ts";

export class ItemService {
  private moduleContainer: ModuleContainer;

  constructor(
    moduleContainer: ModuleContainer
  ) {
    this.moduleContainer = moduleContainer; // Access the client from the NotionClient object
  }

  validateItems(
    currentItems: ItemColumn[],
    incomingItemMap: Map<string, ParsedNotionAPIModel>,
    currentLastUpdated: string | null
  ): DBOperations<string> {
    const operations: DBOperations<string> = {
      add: [],
      update: [],
      delete: [],
    };

    const currentItemMap = new Map<string, ItemColumn>(
      currentItems.map((item) => [item.notionId, item])
    );
    
    for (const [itemId, incomingItem] of incomingItemMap) {
      const currentItem = currentItemMap.get(itemId);

      if (!currentItem) {
        // Incoming item not found in current items, add it
        operations.add.push(itemId);
      } else {
        if (!currentLastUpdated || new Date(currentLastUpdated) < new Date(incomingItem.lastUpdatedTime)) {
          // Incoming item found in current items, check if it needs an update
          operations.add.push(itemId);
          operations.delete.push(itemId);
        }
      }
      currentItemMap.delete(itemId);
    }
    for (const [itemId, currentItem] of currentItemMap) {
      operations.delete.push(itemId);
    }
    return operations;
  }
}
