import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

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

  @CreateDateColumn({ type: "datetime" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime" })
  updatedAt!: Date;
}
