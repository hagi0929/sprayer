import { Client } from "npm:@notionhq/client";
import { NotionRenderer } from "npm:@notion-render/client";
import { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export class SupabaseRepository {
  supabaseClient: SupabaseClient<any, any, any>
    ;

  constructor(supabaseClient: SupabaseClient<any, any, any>) {
    this.supabaseClient = supabaseClient;
  }

  async getNotionDBs() : NotionDBColumn[] {
    const { data: notionDBs, error: fetchError } = await this.supabaseClient
      .from('NotionDB')
      .select('*');

    if (fetchError) {
      throw new Error(`Error fetching Supabase data: ${fetchError.message}`);
    }
    return notionDBs;
  }

  async getNotionObjectsWithDBId(dbId: string) {
    const { data: supabaseArticleData, error: fetchError } = await this.supabaseClient
      .from('NotionObject')
      .select('*')
      .eq('database', dbId);

    if (fetchError) {
      throw new Error(`Error fetching Supabase data: ${fetchError.message}`);
    }
    return supabaseArticleData;
  }

  async deleteNotionObjectsWithObjectIds(notionObjectIdsToDelete: string[]) {
    const { error: deleteError } = await this.supabaseClient
      .from('NotionObject')
      .delete()
      .in('id', notionObjectIdsToDelete);

    if (deleteError) {
      console.error('Error deleting outdated Notion objects:', deleteError);
    }
  }

  async insertNotionObjects(notionObjectsToInsert: any[]) {
    const { error: insertError } = await this.supabaseClient
      .from('NotionObject')
      .insert(notionObjectsToInsert);
    if (insertError) {
      console.error('Error inserting new Notion objects:', insertError);
    }
  }

  async insertItem(tableName: string, itemToInsert: any[]) {
    const { error: insertError } = await this.supabaseClient
      .from(tableName)
      .insert(itemToInsert);
    if (insertError) {
      console.error('Error inserting new Notion objects:', insertError);
    }
  }

  async insertProperties(tableName: string, propertyToInsert: any) {
    const { error: insertError } = await this.supabaseClient
      .from(tableName)
      .insert(propertyToInsert);
    if (insertError) {
      console.error(`Error inserting new ${tableName} items:`, insertError);
    }
  }

  async updateProperties(tableName: string, propertiesToUpdate: any[]) {
    await Promise.all(
      propertiesToUpdate.map((techstack) =>
        this.supabaseClient
          .from(tableName)
          .update({ label: techstack.label })
          .eq('id', techstack.id)
      )
    );
  }

  async deleteProperties(tableName: string, propertyIdsToDelete: string[]) {
    const { error: deleteError } = await this.supabaseClient
      .from(tableName)
      .delete()
      .in('id', propertyIdsToDelete);

    if (deleteError) {
      console.error('Error deleting techstacks:', deleteError);
    }
  }


  async insertItemPropertyRelations(tableName: string, itemToInsert: any) {
    const { error: relationInsertError } = await this.supabaseClient
      .from(tableName)
      .insert(itemToInsert);
    if (relationInsertError) {
      console.error('Error inserting into ArticleTagRelations table:', relationInsertError);
    }
  }
}
