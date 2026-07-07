import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";
import { timestampColumn } from "@/server/db/column-types";
import { AssistantScope } from "@/common/enums";

/**
 * 对话助手：系统（全站）或个人（仅创建者可写）。
 */
@Entity("assistants")
@Index(["scope", "updatedAt"])
@Index(["userId", "updatedAt"])
export class Assistant {
  @PrimaryColumn("varchar", { length: 36 })
  id!: string;

  @Column({ type: "varchar", length: 16 })
  scope!: AssistantScope;

  /** 个人助手必填；系统助手为 null */
  @Column({ type: "varchar", length: 36, nullable: true })
  userId!: string | null;

  @Column({ type: "varchar", length: 64 })
  name!: string;

  @Column({ type: "text" })
  prompt!: string;

  @Column({ type: "varchar", length: 16, nullable: true })
  icon!: string | null;

  @Column({ type: "text", nullable: true })
  openingMessage!: string | null;

  @Column({ type: "simple-json", nullable: true })
  tags!: string[] | null;

  @CreateDateColumn(timestampColumn())
  createdAt!: Date;

  @UpdateDateColumn(timestampColumn())
  updatedAt!: Date;
}
