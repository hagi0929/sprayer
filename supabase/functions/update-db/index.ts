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
  const { supabaseProjectData, error } = await supabaseClient.from("NotionObject").select('*').eq('database', DBNotionId);
  if (error) {
    throw error
  }
  const rawNotionDBData = await queryDB(DBNotionId);
  const notionDBData = parseProjectQueryData(rawNotionDBData);
  console.log(notionDBData);
  console.log("sdfsdsfd");

  const dataMap = new Map();
  for (const row of supabaseProjectData) {
    dataMap.set(row['id'], row);
  }

  const notionObjectToDelete = [];
  const notionObjectToInsert: NotionObjectRow[] = [];
  const projectsToInsert: ProjectQueryData[] = [];
  for (const projectData of notionDBData) {
    const id = projectData['id'];
    const supabaseRow = dataMap.get(id);
    if (supabaseRow) {
      if (new Date(supabaseRow['lastUpdated']) < new Date(projectData.lastEditedTime)) {
        notionObjectToDelete.push(id);
        notionObjectToInsert.push({
          id: id,
          type: 'Project',
          lastUpdated: new Date(projectData.lastEditedTime),
          database: DBNotionId
        } as NotionObjectRow);
      }
    } else {
      notionObjectToDelete.push(id);
      notionObjectToInsert.push({
        id: id,
        type: 'Project',
        lastUpdated: new Date(projectData.lastEditedTime),
        database: DBNotionId
      } as NotionObjectRow);
    }
    // remove all the notion object that are in notionObjectToDelete in a bulk request
    supabaseClient.from('NotionObject').delete().in('id', notionObjectToDelete);
    // insert all the notion object that are in notionObjectToInsert in a bulk request
    supabaseClient.from('NotionObject').insert(notionObjectToInsert);
    const projectTableData: ProjectTableRow[] = [];
    const projectTechStackRelationData: ProjectTechstackRelationsRow[] = [];
    for (const projectData of projectsToInsert) {
      projectTableData.push({
        id: projectData.id,
        title: projectData.title,
        description: projectData.description,
        links: projectData.links
      });
    }
  }

  // for (const row of invalidNotionObject) {
  //   const { data, error } = await tableName === 'Project' ? insertProject(notionId) : insertArticle(notionId);
  //   if (error) {
  //     throw error
  //   }
  // }
  // const supabaseData = data;
  // const supabaseDataMap = new Map();
  // for (const row of supabaseData) {
  //   supabaseDataMap.set(row['id'], row);
  // }

  // for (const row of DBProperty) {
  //   const id = row['id'];
  //   const supabaseRow = supabaseDataMap.get(id);
  //   if (supabaseRow) {
  //     const { data, error } = await supabaseClient.from(tableName).update(row).match({ id: id });
  //     if (error) {
  //       throw error
  //     }
  //   } else {
  //     const { data, error } = await supabaseClient.from(tableName).insert(row);
  //     if (error) {
  //       throw error
  //     }
  //   }
  // }

  // const { data, error } = await supabaseClient.from('NotionDB').update({ lastUpdated: new Date() }).match({ id: notionId });

  // if (error) {
  //   throw error
  // }
}

const updateArticles = async (DBNotionId: string) => {
}

const updateTechstack = async (techstacks: TechstackOption[]) => {
  const { data, error } = await supabaseClient.from('ProjectTechStack').select()

}

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
