import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";
import { timestampColumn } from "@/server/db/column-types";

/**
 * 用户侧 AI 对话会话；消息见 {@link Message}。
 * 可选绑定助手：assistantId 有值时本会话内固定使用该助手（不可换绑）。
 * 不设数据库外键，助手删除后仍保留 id + 快照列以便展示与追溯。
 */
@Entity("conversations")
@Index(["userId", "updatedAt"])
export class Conversation {
  @PrimaryColumn("varchar", { length: 36 })
  id!: string;

  @Column({ type: "varchar", length: 36 })
  @Index()
  userId!: string;

  @Column({ type: "varchar", length: 255 })
  title!: string;

  /** 绑定的助手 id；null 表示普通对话 */
  @Column({ type: "varchar", length: 36, nullable: true })
  @Index()
  assistantId!: string | null;

  /** 创建时从助手复制的展示名（快照） */
  @Column({ type: "varchar", length: 64, nullable: true })
  assistantName!: string | null;

  /** 创建时从助手复制的 emoji 图标（快照） */
  @Column({ type: "varchar", length: 16, nullable: true })
  assistantIcon!: string | null;

  /** 会话滚动摘要（用于主模型上下文注入，不直接返回给前端）。 */
  @Column({ type: "text", nullable: true })
  contextSummary!: string | null;

  /** 滚动摘要最后一次成功写入时间。 */
  @Column(timestampColumn({ nullable: true }))
  contextSummaryUpdatedAt!: Date | null;

  /** 当前滚动摘要已覆盖到的最后一条消息序号（sortOrder）。 */
  @Column({ type: "integer", nullable: true })
  contextSummaryCutoffSortOrder!: number | null;

  @CreateDateColumn(timestampColumn())
  createdAt!: Date;

  @UpdateDateColumn(timestampColumn())
  updatedAt!: Date;
}
