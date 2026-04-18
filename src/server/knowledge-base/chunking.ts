import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import type { KnowledgeBaseContentFormat } from "@/server/db/entities/KnowledgeBase";

export type SplitChunk = {
  chunkIndex: number;
  content: string;
  meta?: Record<string, unknown>;
};

export type ChunkingOptions = {
  chunkSize: number;
  chunkOverlap: number;
};

export async function splitKnowledgeBaseContent(
  contentFormat: KnowledgeBaseContentFormat,
  content: string,
  options: ChunkingOptions,
): Promise<SplitChunk[]> {
  const { chunkSize, chunkOverlap } = options;
  const splitter =
    contentFormat === "markdown"
      ? RecursiveCharacterTextSplitter.fromLanguage("markdown", {
          chunkSize,
          chunkOverlap,
        })
      : new RecursiveCharacterTextSplitter({
          chunkSize,
          chunkOverlap,
        });

  const docs = await splitter.createDocuments([content]);
  return docs.map((d, i) => ({
    chunkIndex: i,
    content: d.pageContent,
    meta: d.metadata as Record<string, unknown>,
  }));
}

