import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from "typeorm";
import { timestampColumn } from "@/server/db/column-types";

@Entity("assistant_knowledge_bases")
@Index(["assistantId", "knowledgeBaseId"], { unique: true })
@Index(["userId", "assistantId"])
export class AssistantKnowledgeBase {
  @PrimaryColumn("varchar", { length: 36 })
  id!: string;

  @Column({ type: "varchar", length: 36 })
  userId!: string;

  @Column({ type: "varchar", length: 36 })
  assistantId!: string;

  @Column({ type: "varchar", length: 36 })
  knowledgeBaseId!: string;

  @CreateDateColumn(timestampColumn())
  createdAt!: Date;
}

