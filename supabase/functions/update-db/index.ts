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
  name: string;
};

type ProjectPropertyData = {
  techstack: TechstackOption[];
  lastEditedTime: string;
};

type ArticlePropertyData = {
  tags: ArticleTagOption[];
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
  return response.results.map((page: any): ProjectData => {
    const techstacks: TechstackOption[] = page.properties.Techstack.multi_select.map(
      (option: any) => ({
        id: option.id,
        name: option.name,
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
  const tags = request.properties.Tag.multi_select.options.map((option: any) => ({
    id: option.id,
    name: option.name,
  }));

  const lastEditedTime = request.last_edited_time;

  return { tags, lastEditedTime };
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
function parseArticleQueryData(request: any): any {
  console.log(request);
}

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
    const dataMap = new Map(supabaseProjectData.map((row: any) => [row.id, row]));

    // Prepare arrays for batch operations
    const notionObjectToDelete = [];
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
        links: projectData.links,
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

  } catch (error) {
    console.error('Error updating projects:', error);
  }
};

// TODO update logic for tags
const updateArticles = async (DBNotionId: string) => {
}

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

  const currentTechstackMap : Map<string, TechstackTableRow>= new Map(
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
    const incomingTechstack = {id: incomingTechstackTemp.id, label: incomingTechstackTemp.name} as TechstackTableRow;

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
  const { data, error } = await supabaseClient.from('ArticleTag').select()
}

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
        await updateArticles(notionId);
      }

    }

  }
  return new Response(
    JSON.stringify(data),
    { headers: { "Content-Type": "application/json" } },
  )
})
