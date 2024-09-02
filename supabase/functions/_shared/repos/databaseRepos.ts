import { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { ItemColumn, ItemPropertyRelationColumn, NotionDBColumn, NotionObjectColumn } from "../models/models.ts";
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
      .in('notionId', notionObjectIdsToDelete);

    if (deleteError) {
      console.error(`Error deleting all or some of Notion objects having id ${notionObjectIdsToDelete}:`, deleteError);
    }
  }

  async deleteNotionObjectsWithDatabaseId(notionDatabaseId: string) {
    const { error: deleteError } = await this.moduleContainer.supabaseClient
      .from('NotionObject')
      .delete()
      .eq('databaseId', notionDatabaseId);

    if (deleteError) {
      console.error(`Error deleting Notion objects associated with ${notionDatabaseId}:`, deleteError);
    }
  }

  async insertNotionObjects(notionObjectsToInsert: NotionObjectColumn[]) {
    const { error: insertError } = await this.moduleContainer.supabaseClient
      .from('NotionObject')
      .insert(notionObjectsToInsert);
    if (insertError) {
      console.error('Error inserting new Notion objects:', insertError);
    }
  }

  async insertItem(itemToInsert: ItemColumn[]) {
    const { error: insertError } = await this.moduleContainer.supabaseClient
      .from("Item")
      .insert(itemToInsert);
    if (insertError) {
      console.error('Error inserting new Item:', insertError);
    }
  }

  async insertProperties(propertyToInsert: any) {
    const { error: insertError } = await this.moduleContainer.supabaseClient
      .from('Property')
      .insert(propertyToInsert);
    if (insertError) {
      console.error(`Error inserting new Properties:`, insertError);
    }
  }

  async insertItemPropertyRelations(propertyToInsert: ItemPropertyRelationColumn[]) {
    const { error: insertError } = await this.moduleContainer.supabaseClient
      .from('ItemPropertyRelation')
      .insert(propertyToInsert);
    if (insertError) {
      console.error(`Error inserting ItemPropertyRelations: ${propertyToInsert}`, insertError);
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

  async updateNotionDBWithLastUpdatedTime(dbId: string, lastUpdated: Date) {
    const { error: updateError } = await this.moduleContainer.supabaseClient
      .from('NotionDB')
      .update({ lastUpdated })
      .eq('databaseId', dbId);

    if (updateError) {
      console.error(`Error updating NotionDB with id ${dbId}:`, updateError);
    }
  }
}