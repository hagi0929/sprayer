import { NotionDBColumn, DBOperations, ItemColumn, DBQueryDataModel, NotionObjectColumn, ParsedNotionAPIModel } from "../models/models.ts";
import { ModuleContainer } from "../utils/modules.ts";

export class StorageService {
  private moduleContainer: ModuleContainer;

  constructor(
    moduleContainer: ModuleContainer
  ) {
    this.moduleContainer = moduleContainer;
  }

  async uploadFile(url: string, type: string = "img"): Promise<string> {

    const blob = await fetch(url).then((r) => r.blob())
    const newFileName = `${crypto.randomUUID()}.${type}`
    await this.moduleContainer.supabaseClient.storage.from('image').upload("example.jpg", blob)
    const temp = this.moduleContainer.supabaseClient.storage.from('image').getPublicUrl("example.jpg")
    if (!temp.data) {
      throw new Error("Error uploading file");
    }
    console.log("temp.data.publicUrl", temp.data.publicUrl);
    console.log("blob", temp.data.publicUrl);
    
    
    return temp.data.publicUrl;
  }
}
