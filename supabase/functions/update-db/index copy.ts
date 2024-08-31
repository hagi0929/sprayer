// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { Client } from "npm:@notionhq/client";
import { NotionRenderer } from "npm:@notion-render/client";
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { NotionRepository } from "../_shared/repos/notionRepos.ts";
import { SupabaseRepository } from "../_shared/repos/supabaseRepos.ts";

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

const notionRepos = new NotionRepository(notionClient);
const supabaseRepos = new SupabaseRepository(supabaseClient);



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
  projectCategory: ProjectCategoryOption[];
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
  const projectCategory = request.properties.Category.multi_select.options.map((option: any) => ({
    id: option.id,
    label: option.name,
  }));
  const lastEditedTime = request.last_edited_time;

  return { techstack, projectCategory, lastEditedTime };
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


type ArticleQueryData = {
  id: string;
  createdTime: string;
  lastEditedTime: string;
  tags: ArticleTagOption[];
  series: ArticleSeriesOption | null;
  title: string;
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
    };
  });
}

type ArticleTableRow = {
  id: string;
  label: string;
  blocks: JSON;
  title: string;
  created: Date;
  series: string | null;
}
type ArticleTagRelationsRow = {
  article: string;
  articleTag: string;
}

const updateArticles = async (DBNotionId: string) => {
  try {
    // Fetch current data from Supabase
    const supabaseArticleData = await supabaseRepos.getNotionObjectsWithDBId(DBNotionId);
    // Query Notion database and parse the response
    const rawNotionDBData = await notionRepos.queryDatabase(DBNotionId);
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

    console.log(`notionDBData`, notionDBData);

    // Process the Notion database data
    for (const articleData of notionDBData) {
      const id = articleData.id;
      const supabaseRow = dataMap.get(id);
      dataMap.delete(id);

      if (!supabaseRow || new Date(supabaseRow.lastUpdated) < new Date(articleData.lastEditedTime)) {

        if (supabaseRow) {
          notionObjectToDelete.push(id);
        }
        // Update: Mark the outdated row for deletion and prepare the new data for insertion

        notionObjectToInsert.push({
          id,
          type: 'Article',
          lastUpdated: new Date(articleData.lastEditedTime),
          database: DBNotionId,
        });
        const blocks = await notionRepos.getChildBlocks(id);
        articleData.tags.forEach((tag) => {
          articleTagRelationData.push({
            article: articleData.id,
            articleTag: tag.id,
          });
        });
        articleTableData.push({
          id: articleData.id,
          label: articleData.title,
          blocks: blocks,
          title: articleData.title,
          created: new Date(articleData.createdTime),
          series: articleData.series?.id,
        } as ArticleTableRow);

      }
    }

    // Any remaining items in dataMap should be deleted
    for (const [id] of dataMap) {
      notionObjectToDelete.push(id);
    }
    console.log("notionObjectToDelete", notionObjectToDelete);

    // Perform batch operations
    if (notionObjectToDelete.length > 0) {
      await supabaseRepos.deleteNotionObjectsWithObjectIds(notionObjectToDelete);
    }

    if (notionObjectToInsert.length > 0) {
      await supabaseRepos.insertNotionObjects(notionObjectToInsert);
    }

    if (articleTableData.length > 0) {
      await supabaseRepos.insertItem('Article', articleTableData);
    }

    if (articleTagRelationData.length > 0) {
      await supabaseRepos.insertItemPropertyRelations('ArticleTagRelations', articleTagRelationData);
    }
    console.log('Articles updated successfully!');

    // Prepare data for Article and ArticleTagRelations tables
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
    const rawNotionDBData = await notionRepos.queryDatabase(DBNotionId);
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
      dataMap.delete(id);

      if (!supabaseRow || new Date(supabaseRow.lastUpdated) < new Date(projectData.lastEditedTime)) {
        // Update: Mark the outdated row for deletion and prepare the new data for insertion
        if (supabaseRow) {
          notionObjectToDelete.push(id);
        }

        notionObjectToInsert.push({
          id,
          type: 'Project',
          lastUpdated: new Date(projectData.lastEditedTime),
          database: DBNotionId,
        });
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

      }

    }

    // Any remaining items in dataMap should be deleted
    for (const [id] of dataMap) {
      notionObjectToDelete.push(id);
    }

    if (notionObjectToDelete.length > 0) {
      supabaseRepos.deleteNotionObjectsWithObjectIds(notionObjectToDelete);
    }

    if (notionObjectToInsert.length > 0) {
      supabaseRepos.insertNotionObjects(notionObjectToDelete);
    }

    if (projectTableData.length > 0) {
      supabaseRepos.insertItem('Project', projectTableData);
    }

    if (projectTechStackRelationData.length > 0) {
      supabaseRepos.insertItem('ProjectTechStackRelations', projectTechStackRelationData);
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
    supabaseRepos.insertItemPropertyRelations('ProjectTechStack', operations.add);
  }

  if (operations.update.length > 0) {
    supabaseRepos.updateProperties('ProjectTechStack', operations.update);
  }

  if (operations.delete.length > 0) {
    supabaseRepos.deleteProperties('ProjectTechStack', operations.delete);
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
    supabaseRepos.insertItemPropertyRelations('ArticleTag', operations.add);
  }

  if (operations.update.length > 0) {
    supabaseRepos.updateProperties('ArticleTag', operations.update);
  }

  if (operations.delete.length > 0) {
    supabaseRepos.deleteProperties('ArticleTag', operations.delete);
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
    supabaseRepos.insertItemPropertyRelations('ArticleSeries', operations.add);
  }

  if (operations.update.length > 0) {
    supabaseRepos.updateProperties('ArticleSeries', operations.update);
  }

  if (operations.delete.length > 0) {
    supabaseRepos.deleteProperties('ArticleSeries', operations.delete);
  }
};

type ProjectCategoryOption = {
  id: string;
  label: string;
}

const updateProjectCategory = async (incomingCategories: ProjectCategoryOption[]) => {
  // Fetch current category from the database
  const { data: currentCategories, error } = await supabaseClient.from('ProjectCategory').select();
  if (error) {
    console.error('Error fetching article series:', error);
    return;
  }

  const operations = {
    add: [] as ProjectCategoryOption[],
    update: [] as ProjectCategoryOption[],
    delete: [] as string[],
  };

  const currentCategoryMap = new Map(
    currentCategories.map((item: ProjectCategoryOption) => [item.id, item])
  );

  const incomingCategoryMap = new Map(
    incomingCategories.map((item) => [item.id, item])
  );

  // Compare and identify add, update, and delete operations
  incomingCategories.forEach((incomingItem) => {
    const currentItem = currentCategoryMap.get(incomingItem.id);

    if (!currentItem) {
      // Category is not in the database, add it
      operations.add.push(incomingItem);
    } else if (currentItem.label !== incomingItem.label) {
      // Category exists but the label has changed, update it
      operations.update.push(incomingItem);
    }
    // If the category is the same, no action is needed
  });

  // Identify category to delete (those in the database but not in the incoming list)

  currentCategories.forEach((currentItem: ProjectCategoryOption) => {
    if (!incomingCategoryMap.has(currentItem.id)) {
      operations.delete.push(currentItem.id);
    }
  });

  // Perform batch operations in the database
  if (operations.add.length > 0) {
    supabaseRepos.insertItemPropertyRelations('ProjectCategory', operations.add);
  }

  if (operations.update.length > 0) {
    supabaseRepos.updateProperties('ProjectCategory', operations.update);
  }

  if (operations.delete.length > 0) {
    supabaseRepos.deleteProperties('ProjectCategory', operations.delete);
  }
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
    const notionDBData = await notionRepos.retrieveDatabase(notionId);
    if (tableName === 'Project') {
      const DBProperty = parseProjectData(notionDBData);
      if (lastUpdated === null || new Date(lastUpdated) < new Date(DBProperty.lastEditedTime)) {
        await updateTechstack(DBProperty.techstack);
        await updateProjectCategory(DBProperty.projectCategory);
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
