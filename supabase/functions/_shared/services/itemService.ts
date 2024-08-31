import { DBOperations, DBQueryDataModel, PropertyColumn } from "../models/models.ts";
import { ModuleChain } from "../utils.ts/modules.ts";

export class ItemService {
  moduleChain: ModuleChain;
  constructor(moduleChain: any) {
    this.moduleChain = moduleChain;
  }


  updateItems(currentItems: Record<string, PropertyColumn[]>, incomingItems: Record<string, PropertyColumn[]>): DBOperations {
  }
}