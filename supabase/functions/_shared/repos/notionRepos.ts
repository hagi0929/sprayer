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
    return await this.notionClient.client.databases.retrieve({ database_id: dbId });
  }

  async queryDatabase(dbId: string) {
    return await this.notionClient.client.databases.query({ database_id: dbId });
  }

  async getChildBlocks(blockId: string) {
    const { data, error } = await this.notionClient.client.blocks.children.list({
      block_id: blockId,
    });

    if (error) {
      throw new Error(`Error fetching block children: ${error.message}`);
    }

    return data;
  }
}
