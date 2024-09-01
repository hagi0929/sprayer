import { NotionDBColumn, DBOperations, ItemColumn, ItemPropertyRelationColumn } from "../models/models.ts";
import { DependencyContainer, ModuleChain } from "../utils/modules.ts";

export class ItemService {
  moduleChain: DependencyContainer;
  constructor(moduleChain: DependencyContainer) {
    this.moduleChain = moduleChain;
  }

  updateItems(
    currentItems: ItemColumn[],
    incomingItems: ItemColumn[]
  ): DBOperations<ItemColumn> {
    const operations: DBOperations<ItemColumn> = {
      add: [],
      update: [],
      delete: [],
    };
    const currentItemMap = new Map<string, ItemColumn>(
      currentItems.map((item) => [item.notionId, item])
    );

    const incomingItemMap = new Map<string, ItemColumn>(
      incomingItems.map((item) => [item.notionId, item])
    );

    // Identify items to delete or update (handled as delete + add)
    for (const [notionId, currentItem] of currentItemMap) {
      const incomingItem = incomingItemMap.get(notionId);

      if (!incomingItem) {
        // If the current item is not found in the incoming items, it needs to be deleted
        operations.delete.push(currentItem.notionId);
      } else if (JSON.stringify(currentItem) !== JSON.stringify(incomingItem)) {
        // If the item exists but has changed, mark it for deletion and re-adding
        operations.delete.push(currentItem.notionId);
        operations.add.push(incomingItem);
      }

      // Remove the processed incoming item from the map
      incomingItemMap.delete(notionId);
    }

    // Any remaining incoming items should be added
    for (const [notionId, incomingItem] of incomingItemMap) {
      operations.add.push(incomingItem);
    }

    return { main: operations, relations: [] };
  }
}
