import { NotionDBColumn, DBOperations, ItemColumn, DBQueryDataModel, NotionObjectColumn, ParsedNotionAPIModel } from "../models/models.ts";
import { ModuleContainer } from "../utils/modules.ts";

export class StorageService {
  private moduleContainer: ModuleContainer;

  constructor(
    moduleContainer: ModuleContainer
  ) {
    this.moduleContainer = moduleContainer;
  }

  async uploadPublicFile(url: string): Promise<string> {
    const blob = await fetch(url).then((r) => r.blob())
    const newFileName = `${crypto.randomUUID()}`
    await this.moduleContainer.supabaseClient.storage.from('publicFile').upload(newFileName, blob)
    const temp = this.moduleContainer.supabaseClient.storage.from('publicFile').getPublicUrl(newFileName)
    if (!temp.data) {
      throw new Error("Error uploading file");
    }
    return temp.data.publicUrl;
  }
}
