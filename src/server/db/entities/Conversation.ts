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

  @CreateDateColumn({ type: "datetime" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime" })
  updatedAt!: Date;
}
