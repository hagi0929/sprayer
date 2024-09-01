import { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { NotionDBColumn } from "../models/models.ts";
import { ModuleContainer, TYPES } from "../utils/modules.ts"; // Assuming you have a TYPES file where symbols are defined

export class DatabaseRepos {
  private moduleContainer: ModuleContainer;

  constructor(
    moduleContainer: ModuleContainer
  ) {
    this.moduleContainer = moduleContainer;
  }

  async getNotionDBs(): Promise<NotionDBColumn[]> {
    const { data: notionDBs, error: fetchError } = await this.moduleContainer.supabaseClient
      .from('NotionDB')
      .select('*');

    if (fetchError) {
      throw new Error(`Error fetching Supabase data: ${fetchError.message}`);
    }
    return notionDBs;
  }

  async getNotionObjectsWithDBId(dbId: string) {
    const { data: supabaseArticleData, error: fetchError } = await this.moduleContainer.supabaseClient
      .from('NotionObject')
      .select('*')
      .eq('database', dbId);

    if (fetchError) {
      throw new Error(`Error fetching Supabase data: ${fetchError.message}`);
    }
    return supabaseArticleData;
  }

  async deleteNotionObjectsWithObjectIds(notionObjectIdsToDelete: string[]) {
    const { error: deleteError } = await this.moduleContainer.supabaseClient
      .from('NotionObject')
      .delete()
      .in('id', notionObjectIdsToDelete);

    if (deleteError) {
      console.error('Error deleting outdated Notion objects:', deleteError);
    }
  }

  async insertNotionObjects(notionObjectsToInsert: any[]) {
    const { error: insertError } = await this.moduleContainer.supabaseClient
      .from('NotionObject')
      .insert(notionObjectsToInsert);
    if (insertError) {
      console.error('Error inserting new Notion objects:', insertError);
    }
  }

  async insertItem(tableName: string, itemToInsert: any[]) {
    const { error: insertError } = await this.moduleContainer.supabaseClient
      .from(tableName)
      .insert(itemToInsert);
    if (insertError) {
      console.error('Error inserting new Item:', insertError);
    }
  }

  async insertProperties(tableName: string, propertyToInsert: any) {
    const { error: insertError } = await this.moduleContainer.supabaseClient
      .from(tableName)
      .insert(propertyToInsert);
    if (insertError) {
      console.error(`Error inserting new ${tableName} items:`, insertError);
    }
  }

  async updateProperties(tableName: string, propertiesToUpdate: any[]) {
    await Promise.all(
      propertiesToUpdate.map((techstack) =>
        this.moduleContainer.supabaseClient
          .from(tableName)
          .update({ label: techstack.label })
          .eq('id', techstack.id)
      )
    );
  }

  async deleteProperties(tableName: string, propertyIdsToDelete: string[]) {
    const { error: deleteError } = await this.moduleContainer.supabaseClient
      .from(tableName)
      .delete()
      .in('notionId', propertyIdsToDelete);

    if (deleteError) {
      console.error('Error deleting techstacks:', deleteError);
    }
  }

  async insertItemPropertyRelations(tableName: string, itemToInsert: any) {
    const { error: relationInsertError } = await this.moduleContainer.supabaseClient
      .from(tableName)
      .insert(itemToInsert);
    if (relationInsertError) {
      console.error('Error inserting into ArticleTagRelations table:', relationInsertError);
    }
  }
}
