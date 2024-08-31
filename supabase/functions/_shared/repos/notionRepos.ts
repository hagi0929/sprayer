import { Client } from "npm:@notionhq/client";
import { NotionRenderer } from "npm:@notion-render/client";

export class NotionRepository {
  notionClient: {
    client: Client;
    renderer: NotionRenderer;
  };

  constructor(notionClient: {
    client: Client;
    renderer: NotionRenderer;
  }) {
    this.notionClient = notionClient;
  }
  
  async retrieveDatabase(dbId: string) {
    console.log('Starting to retrieve database:', dbId); // Log before the try-catch
  
    try {
      const response = await this.notionClient.client.databases.retrieve({ database_id: dbId });
      console.log('Retrieving database:', dbId);
  
      return response;
    } catch (error) {
      console.error('Error retrieving database:', error);
      throw error; // Rethrow the error to be handled by the calling function
    }
  }
  
  async queryDatabase(dbId: string) {
    return await this.notionClient.client.databases.query({ database_id: dbId });
  }

  async getChildBlocks(blockId: string) {
    return await this.notionClient.client.blocks.children.list({
      block_id: blockId,
    });
  }
}
