import { Client } from "npm:@notionhq/client";
import { ModuleContainer, NotionClient } from "../utils/modules.ts"; // Assuming NotionClient type is defined there
export class NotionRepos {
  private moduleContainer: ModuleContainer;

  constructor(

    moduleContainer: ModuleContainer
  ) {
    this.moduleContainer = moduleContainer; // Access the client from the NotionClient object
  }

  async retrieveDatabase(dbId: string) {
    try {
      const response = await this.moduleContainer.notionClient.client.databases.retrieve({ database_id: dbId });
      return response;
    } catch (error) {
      throw error; // Rethrow the error to be handled by the calling function
    }
  }

  async queryDatabase(dbId: string) {
    return await this.moduleContainer.notionClient.client.databases.query({ database_id: dbId });
  }

  async getChildBlocks(blockId: string) {
    return await this.moduleContainer.notionClient.client.blocks.children.list({
      block_id: blockId,
    });
  }
}
