import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";
import { timestampColumn } from "@/server/db/column-types";

export type KnowledgeBaseContentFormat = "markdown" | "plain";
export type KnowledgeBaseSourceType = "text" | "file";
export type KnowledgeBaseVectorStatus = "pending" | "success" | "failed";

@Entity("knowledge_bases")
@Index(["userId", "updatedAt"])
@Index(["userId", "name"], { unique: true })
export class KnowledgeBase {
  @PrimaryColumn("varchar", { length: 36 })
  id!: string;

  @Column({ type: "varchar", length: 36 })
  userId!: string;

  @Column({ type: "varchar", length: 64 })
  name!: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  description!: string | null;

  @Column({ type: "simple-json", nullable: true })
  tags!: string[] | null;

  @Column({ type: "varchar", length: 16 })
  contentFormat!: KnowledgeBaseContentFormat;

  @Column({ type: "text" })
  content!: string;

  @Column({ type: "varchar", length: 16 })
  sourceType!: KnowledgeBaseSourceType;

  @Column({ type: "varchar", length: 16 })
  vectorStatus!: KnowledgeBaseVectorStatus;

  @Column(timestampColumn({ nullable: true }))
  vectorUpdatedAt!: Date | null;

  @Column(timestampColumn({ nullable: true }))
  vectorLastStartedAt!: Date | null;

  /** 当前 content 的版本 hash，用于防止旧分片混入 */
  @Column({ type: "varchar", length: 64, nullable: true })
  vectorContentHash!: string | null;

  /** 失败原因摘要（需脱敏） */
  @Column({ type: "varchar", length: 500, nullable: true })
  vectorError!: string | null;

  @CreateDateColumn(timestampColumn())
  createdAt!: Date;

  @UpdateDateColumn(timestampColumn())
  updatedAt!: Date;
}

