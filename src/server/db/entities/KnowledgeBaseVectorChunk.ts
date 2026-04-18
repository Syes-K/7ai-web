import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from "typeorm";

@Entity("knowledge_base_vector_chunks")
@Index(["knowledgeBaseId", "vectorContentHash"])
@Index(["knowledgeBaseId", "vectorContentHash", "chunkIndex"], { unique: true })
export class KnowledgeBaseVectorChunk {
  @PrimaryColumn("varchar", { length: 36 })
  id!: string;

  @Column({ type: "varchar", length: 36 })
  knowledgeBaseId!: string;

  @Column({ type: "varchar", length: 64 })
  vectorContentHash!: string;

  @Column({ type: "int" })
  chunkIndex!: number;

  @Column({ type: "text" })
  chunkContent!: string;

  @Column({ type: "simple-json", nullable: true })
  chunkMeta!: Record<string, unknown> | null;

  @Column({ type: "varchar", length: 128 })
  embeddingModel!: string;

  /**
   * SQLite 无原生 vector；首期用 JSON 数组保存 embedding。
   * 后续如引入向量索引/扩展，可迁移为 blob 或外部向量库。
   */
  @Column({ type: "simple-json" })
  embedding!: number[];

  @CreateDateColumn({ type: "datetime" })
  createdAt!: Date;
}

