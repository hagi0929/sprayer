// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { Client } from "npm:@notionhq/client";
import { NotionRenderer } from "npm:@notion-render/client";
import { createClient } from 'jsr:@supabase/supabase-js@2'

console.log("Hello from Functions!")

const client = new Client({
  auth: Deno.env.get('NOTION_API_KEY')
});

const notionClient = {
  client: client,
  renderer: new NotionRenderer({ client }),
};



const supabaseClient = createClient(
  Deno.env.get('SSUPABASE_URL')!,
  Deno.env.get('SSUPABASE_SERVICE_ROLE_KEY')!
)


const retrieveDB = (dbId: string) => {
  return notionClient.client.databases.retrieve({
    database_id: dbId!,
  });
};

const queryDB = (dbId: string) => {
  return notionClient.client.databases.query({
    database_id: dbId!,
  });
};
type TechstackOption = {
  id: string;
  name: string;
};
type ArticleTagOption = {
  id: string;
  label: string;
};

type ProjectPropertyData = {
  techstack: TechstackOption[];
  lastEditedTime: string;
};

type ArticlePropertyData = {
  tags: ArticleTagOption[];
  series: ArticleSeriesOption[];
  lastEditedTime: string;
};


type Link = {
  type: string;
  url: string;
};

type ImageMetaData = {
  name: string;
  url: string;
}[];


function parseProjectData(request: any): ProjectPropertyData {
  const techstack = request.properties.Techstack.multi_select.options.map((option: any) => ({
    id: option.id,
    name: option.name,
  }));

  const lastEditedTime = request.last_edited_time;

  return { techstack, lastEditedTime };
}

type ProjectQueryData = {
  id: string;
  createdTime: string;
  lastEditedTime: string;
  techstacks: TechstackOption[];
  title: string;
  description: string;
  links: Link[];
  thumbnail: ImageMetaData | null;
  isPrimary: boolean;
};

function parseProjectQueryData(response: any): ProjectQueryData[] {
  return response.results.map((page: any): ProjectQueryData => {
    const techstacks: TechstackOption[] = page.properties.Techstack.multi_select.map(
      (option: any) => ({
        id: option.id,
        label: option.name,
      })
    );

    const title = page.properties.title.title
      .map((text: any) => text.plain_text)
      .join(" ");

    const description = page.properties.Description.rich_text
      .map((text: any) => text.plain_text)
      .join(" ");

    const links: Link[] = [
      {
        type: "Github",
        url: page.properties.Github.url || "",
      },
      {
        type: "Website",
        url: page.properties.Website.url || "",
      },
    ];

    const thumbnail: ImageMetaData | null = page.properties.Thumbnail.files.length
      ? page.properties.Thumbnail.files.map((file: any) => ({
        name: file.name,
        url: file.url,
      }))
      : null;

    return {
      id: page.id,
      createdTime: page.created_time,
      lastEditedTime: page.last_edited_time,
      techstacks,
      title,
      description,
      links,
      thumbnail,
      isPrimary: page.properties.isPrimary.checkbox,
    };
  });
}

function parseArticleData(request: any): ArticlePropertyData {
  const tags = request.properties.tag.multi_select.options.map((option: any) => ({
    id: option.id,
    label: option.name,
  }));
  const series = request.properties.series.select.options.map((option: any) => ({
    id: option.id,
    label: option.name,
  }));

  const lastEditedTime = request.last_edited_time;

  return { tags, series, lastEditedTime };
}

// const parseNotionQueryData = (data) => {
//   const results = data.results.map((page) => {
//     const properties = page.properties;
//     const obj = {};
//     for (const key in properties) {
//       obj[key] = properties[key].title[0].plain_text;
//     }
//     return obj;
//   });
//   return results;
// }


type ArticleQueryData = {
  id: string;
  createdTime: string;
  lastEditedTime: string;
  tags: ArticleTagOption[];
  series: ArticleSeriesOption | null;
  title: string;
  description: string;
};

function parseArticleQueryData(response: any): ArticleQueryData[] {
  return response.results.map((page: any): ArticleQueryData => {
    const tags: ArticleTagOption[] = page.properties.tag.multi_select.map(
      (option: any) => ({
        id: option.id,
        label: option.name,
      } as ArticleTagOption)
    );

    const title = page.properties.title.title
      .map((text: any) => text.plain_text)
      .join(" ");

    const description = page.properties.Description.rich_text
      .map((text: any) => text.plain_text)
      .join(" ");

    const series = page.properties.series.select ? {
      id: page.properties.series.select.id,
      label: page.properties.series.select.name
    } as ArticleSeriesOption : null;

    return {
      id: page.id,
      createdTime: page.created_time,
      lastEditedTime: page.last_edited_time,
      tags: tags,
      series: series,
      title: title,
      description: description
    };
  });
}

const updateArticles = async (DBNotionId: string) => {
  try {
    // Fetch current data from Supabase
    const { data: supabaseArticleData, error: fetchError } = await supabaseClient
      .from('NotionObject')
      .select('*')
      .eq('database', DBNotionId);

    if (fetchError) {
      throw new Error(`Error fetching Supabase data: ${fetchError.message}`);
    }

    // Query Notion database and parse the response
    const rawNotionDBData = await queryDB(DBNotionId);
    const notionDBData = parseArticleQueryData(rawNotionDBData);

    // Create a map of current Supabase data
    const dataMap: Map<string, NotionObjectRow> = new Map(
      supabaseArticleData.map((row: any) => [row.id, row])
    );

    // Prepare arrays for batch operations
    const notionObjectToDelete: string[] = [];
    const notionObjectToInsert: NotionObjectRow[] = [];
    const articleTableData: ArticleTableRow[] = [];
    const articleTagRelationData: ArticleTagRelationsRow[] = [];

    // Process the Notion database data
    for (const articleData of notionDBData) {
      const id = articleData.id;
      const supabaseRow = dataMap.get(id);

      if (supabaseRow) {
        if (new Date(supabaseRow.lastUpdated) < new Date(articleData.lastEditedTime)) {
          // Update: Mark the outdated row for deletion and prepare the new data for insertion
          notionObjectToDelete.push(id);
          notionObjectToInsert.push({
            id,
            type: 'Article',
            lastUpdated: new Date(articleData.lastEditedTime),
            database: DBNotionId,
          });
        }
        dataMap.delete(id); // Remove from map after processing
      } else {
        // Insert: New article data that isn't in Supabase yet
        notionObjectToInsert.push({
          id,
          type: 'Article',
          lastUpdated: new Date(articleData.lastEditedTime),
          database: DBNotionId,
        });
      }

      // Prepare data for Article and ArticleTagRelations tables
      articleTableData.push({
        id: articleData.id,
        title: articleData.title,
        description: articleData.description,
        tags: articleData.tags, // Store as JSONB directly
        series: articleData.series,
      });
    }
  } catch (error) {
    console.error('Error updating projects:', error);

  }

};

type NotionObjectRow = {
  id: string;
  type: string;
  lastUpdated: Date;
  database: string;
}
type ProjectTableRow = {
  id: string;
  title: string;
  description: string;
  links: Link[];
}
type ProjectTechstackRelationsRow = {
  project: string;
  projectTechStack: string;
}

const updateProjects = async (DBNotionId: string) => {
  try {
    // Fetch current data from Supabase
    const { data: supabaseProjectData, error: fetchError } = await supabaseClient
      .from('NotionObject')
      .select('*')
      .eq('database', DBNotionId);

    if (fetchError) {
      throw new Error(`Error fetching Supabase data: ${fetchError.message}`);
    }

    // Query Notion database and parse the response
    const rawNotionDBData = await queryDB(DBNotionId);
    const notionDBData = parseProjectQueryData(rawNotionDBData);

    // Create a map of current Supabase data
    const dataMap: Map<string, NotionObjectRow> = new Map(
      supabaseProjectData.map((row: any) => [row.id, row])
    );

    // Prepare arrays for batch operations
    const notionObjectToDelete: string[] = [];
    const notionObjectToInsert: NotionObjectRow[] = [];
    const projectTableData: ProjectTableRow[] = [];
    const projectTechStackRelationData: ProjectTechstackRelationsRow[] = [];

    // Process the Notion database data
    for (const projectData of notionDBData) {
      const id = projectData.id;
      const supabaseRow = dataMap.get(id);

      if (supabaseRow) {
        if (new Date(supabaseRow.lastUpdated) < new Date(projectData.lastEditedTime)) {
          // Update: Mark the outdated row for deletion and prepare the new data for insertion
          notionObjectToDelete.push(id);
          notionObjectToInsert.push({
            id,
            type: 'Project',
            lastUpdated: new Date(projectData.lastEditedTime),
            database: DBNotionId,
          });
        }
        dataMap.delete(id); // Remove from map after processing
      } else {
        // Insert: New project data that isn't in Supabase yet
        notionObjectToInsert.push({
          id,
          type: 'Project',
          lastUpdated: new Date(projectData.lastEditedTime),
          database: DBNotionId,
        });
      }

      // Prepare data for Project and ProjectTechStackRelations tables
      projectTableData.push({
        id: projectData.id,
        title: projectData.title,
        description: projectData.description,
        links: projectData.links, // Store as JSONB directly
      });

      projectData.techstacks.forEach((techstack) => {
        projectTechStackRelationData.push({
          project: projectData.id,
          projectTechStack: techstack.id,
        });
      });

      // TODO: Handle image data if necessary
    }

    // Any remaining items in dataMap should be deleted
    for (const [id] of dataMap) {
      notionObjectToDelete.push(id);
    }

    // Perform batch operations
    if (notionObjectToDelete.length > 0) {
      const { error: deleteError } = await supabaseClient
        .from('NotionObject')
        .delete()
        .in('id', notionObjectToDelete);

      if (deleteError) {
        console.error('Error deleting outdated Notion objects:', deleteError);
      }
    }

    if (notionObjectToInsert.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('NotionObject')
        .insert(notionObjectToInsert);

      if (insertError) {
        console.error('Error inserting new Notion objects:', insertError);
      }
    }

    if (projectTableData.length > 0) {
      const { error: projectInsertError } = await supabaseClient
        .from('Project')
        .insert(projectTableData);

      if (projectInsertError) {
        console.error('Error inserting into Project table:', projectInsertError);
      }
    }

    if (projectTechStackRelationData.length > 0) {
      const { error: relationInsertError } = await supabaseClient
        .from('ProjectTechStackRelations')
        .insert(projectTechStackRelationData);

      if (relationInsertError) {
        console.error('Error inserting into ProjectTechStackRelations table:', relationInsertError);
      }
    }
    console.log('Projects updated successfully!');
  } catch (error) {
    console.error('Error updating projects:', error);
  }
};


type TechstackTableRow = {
  id: string;
  label: string;
}
const updateTechstack = async (techstacks: TechstackOption[]) => {
  // Fetch current techstacks from the database
  const { data: currentTechstacks, error } = await supabaseClient
    .from('ProjectTechStack')
    .select();

  if (error) {
    console.error('Error fetching techstacks:', error);
    return;
  }

  const operations = {
    add: [] as TechstackTableRow[],
    update: [] as TechstackTableRow[],
    delete: [] as string[],
  };

  const currentTechstackMap: Map<string, TechstackTableRow> = new Map(
    currentTechstacks.map((techstack: TechstackTableRow) => [
      techstack.id,
      techstack,
    ])
  );

  const incomingTechstackMap = new Map(
    techstacks.map((techstack) => [techstack.id, techstack])
  );

  // Compare and identify add, update, and delete operations
  techstacks.forEach((incomingTechstackTemp) => {
    const incomingTechstack = { id: incomingTechstackTemp.id, label: incomingTechstackTemp.name } as TechstackTableRow;

    const currentTechstack = currentTechstackMap.get(incomingTechstack.id);
    if (!currentTechstack) {
      // Techstack is not in the database, add it
      operations.add.push(incomingTechstack);
    } else if (currentTechstack.label !== incomingTechstack.label) {
      // Techstack exists but the label has changed, update it
      operations.update.push(incomingTechstack);
    }
    // If the techstack is the same, no action is needed
  });

  // Identify techstacks to delete (those in the database but not in the incoming list)
  currentTechstacks.forEach((currentTechstack: TechstackOption) => {
    if (!incomingTechstackMap.has(currentTechstack.id)) {
      operations.delete.push(currentTechstack.id);
    }
  });

  // Perform batch operations in the database
  if (operations.add.length > 0) {
    const { error: addError } = await supabaseClient
      .from('ProjectTechStack')
      .insert(operations.add);

    if (addError) {
      console.error('Error adding techstacks:', addError);
    }
  }

  if (operations.update.length > 0) {
    await Promise.all(
      operations.update.map((techstack) =>
        supabaseClient
          .from('ProjectTechStack')
          .update({ label: techstack.label })
          .eq('techstack', techstack.id)
      )
    );
  }

  if (operations.delete.length > 0) {
    const { error: deleteError } = await supabaseClient
      .from('ProjectTechStack')
      .delete()
      .in('id', operations.delete);

    if (deleteError) {
      console.error('Error deleting techstacks:', deleteError);
    }
  }
};

const updateArticleTag = async (tags: ArticleTagOption[]) => {
  // Fetch current tags from the database
  const { data: currentTags, error } = await supabaseClient.from('ArticleTag').select();

  if (error) {
    console.error('Error fetching article tags:', error);
    return;
  }

  const operations = {
    add: [] as ArticleTagOption[],
    update: [] as ArticleTagOption[],
    delete: [] as string[],
  };

  const currentTagMap: Map<string, ArticleTagOption> = new Map(
    currentTags.map((tag: ArticleTagOption) => [tag.id, tag])
  );

  const incomingTagMap = new Map(
    tags.map((tag) => [tag.id, tag])
  );

  // Compare and identify add, update, and delete operations
  tags.forEach((incomingTag) => {
    const currentTag = currentTagMap.get(incomingTag.id);

    if (!currentTag) {
      // Tag is not in the database, add it
      operations.add.push(incomingTag);
    } else if (currentTag.label !== incomingTag.label) {
      // Tag exists but the name has changed, update it
      operations.update.push(incomingTag);
    }
    // If the tag is the same, no action is needed
  });

  // Identify tags to delete (those in the database but not in the incoming list)
  currentTags.forEach((currentTag: ArticleTagOption) => {
    if (!incomingTagMap.has(currentTag.id)) {
      operations.delete.push(currentTag.id);
    }
  });

  // Perform batch operations in the database
  if (operations.add.length > 0) {
    const { error: addError } = await supabaseClient
      .from('ArticleTag')
      .insert(operations.add);

    if (addError) {
      console.error('Error adding article tags:', addError);
    }
  }

  if (operations.update.length > 0) {
    const { error: updateError } = await Promise.all(
      operations.update.map((tag) =>
        supabaseClient
          .from('ArticleTag')
          .update({ name: tag.name })
          .eq('id', tag.id)
      )
    );

    if (updateError) {
      console.error('Error updating article tags:', updateError);
    }
  }

  if (operations.delete.length > 0) {
    const { error: deleteError } = await supabaseClient
      .from('ArticleTag')
      .delete()
      .in('id', operations.delete);

    if (deleteError) {
      console.error('Error deleting article tags:', deleteError);
    }
  }
};

type ArticleSeriesOption = {
  id: string;
  label: string;
}
const updateArticleSeries = async (series: ArticleSeriesOption[]) => {
  // Fetch current series from the database
  const { data: currentSeries, error } = await supabaseClient.from('ArticleSeries').select();

  if (error) {
    console.error('Error fetching article series:', error);
    return;
  }

  const operations = {
    add: [] as ArticleSeriesOption[],
    update: [] as ArticleSeriesOption[],
    delete: [] as string[],
  };

  const currentSeriesMap = new Map(
    currentSeries.map((item: ArticleSeriesOption) => [item.id, item])
  );

  const incomingSeriesMap = new Map(
    series.map((item) => [item.id, item])
  );

  // Compare and identify add, update, and delete operations
  series.forEach((incomingItem) => {
    const currentItem = currentSeriesMap.get(incomingItem.id);

    if (!currentItem) {
      // Series is not in the database, add it
      operations.add.push(incomingItem);
    } else if (currentItem.label !== incomingItem.label) {
      // Series exists but the label has changed, update it
      operations.update.push(incomingItem);
    }
    // If the series is the same, no action is needed
  });

  // Identify series to delete (those in the database but not in the incoming list)
  currentSeries.forEach((currentItem: ArticleSeriesOption) => {
    if (!incomingSeriesMap.has(currentItem.id)) {
      operations.delete.push(currentItem.id);
    }
  });

  // Perform batch operations in the database
  if (operations.add.length > 0) {
    const { error: addError } = await supabaseClient
      .from('ArticleSeries')
      .insert(operations.add);

    if (addError) {
      console.error('Error adding article series:', addError);
    }
  }

  if (operations.update.length > 0) {
    const { error: updateError } = await Promise.all(
      operations.update.map((item) =>
        supabaseClient
          .from('ArticleSeries')
          .update({ label: item.label })
          .eq('id', item.id)
      )
    );

    if (updateError) {
      console.error('Error updating article series:', updateError);
    }
  }

  if (operations.delete.length > 0) {
    const { error: deleteError } = await supabaseClient
      .from('ArticleSeries')
      .delete()
      .in('id', operations.delete);

    if (deleteError) {
      console.error('Error deleting article series:', deleteError);
    }
  }
};

Deno.serve(async (req) => {
  const { name } = await req.json()

  const { data, error } = await supabaseClient.from('NotionDB').select()

  if (error) {
    throw error
  }
  for (const tableDB of data) {
    const notionId = tableDB['id'];
    const tableName = tableDB['tableName'];
    const lastUpdated = tableDB['lastUpdated'];
    const notionDBData = await retrieveDB(notionId);
    if (tableName === 'Project') {
      const DBProperty = parseProjectData(notionDBData);
      if (lastUpdated === null || new Date(lastUpdated) < new Date(DBProperty.lastEditedTime)) {
        await updateTechstack(DBProperty.techstack);
        await updateProjects(notionId);
      }

    } else if (tableName === 'Article') {
      const DBProperty = parseArticleData(notionDBData);
      if (lastUpdated === null || new Date(lastUpdated) < new Date(DBProperty.lastEditedTime)) {
        await updateArticleTag(DBProperty.tags);
        await updateArticleSeries(DBProperty.series);
        await updateArticles(notionId);
      }

    }

  }
  return new Response(
    JSON.stringify(data),
    { headers: { "Content-Type": "application/json" } },
  )
})
