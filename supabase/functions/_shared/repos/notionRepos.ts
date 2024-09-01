import { Client } from "npm:@notionhq/client";
import { NotionRenderer } from "npm:@notion-render/client";
import { DependencyContainer, ModuleChain } from "../utils/modules.ts";
import { Service } from "npm:typedi";

@Service()
export class NotionRepos {
  @Inject()
  notionClient: any;
  moduleChain: DependencyContainer;
  constructor(moduleChain: DependencyContainer) {
    this.moduleChain = moduleChain;
  }
  
  async retrieveDatabase(dbId: string) {
  
    try {
      const response = await this.moduleChain.notionClient.client.databases.retrieve({ database_id: dbId });
  
      return response;
    } catch (error) {
      throw error; // Rethrow the error to be handled by the calling function
    }
  }
  
  async queryDatabase(dbId: string) {
    return await this.moduleChain.notionClient.client.databases.query({ database_id: dbId });
  }

  async getChildBlocks(blockId: string) {
    return await this.moduleChain.notionClient.client.blocks.children.list({
      block_id: blockId,
    });
  }
}
