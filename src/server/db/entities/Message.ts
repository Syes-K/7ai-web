import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from "typeorm";

/**
 * 会话内一条消息；与 {@link Conversation} 级联删除由业务清空或未来删会话策略处理。
 */
@Entity("messages")
@Index(["conversationId", "sortOrder"])
export class Message {
  @PrimaryColumn("varchar", { length: 36 })
  id!: string;

  @Column({ type: "varchar", length: 36 })
  @Index()
  conversationId!: string;

  /** 所属 turn（v0.1.8 新增）；历史数据可为空 */
  @Column({ type: "varchar", length: 36, nullable: true })
  @Index()
  turnId!: string | null;

  /** 冗余 userId，便于防御性校验与审计 */
  @Column({ type: "varchar", length: 36 })
  @Index()
  userId!: string;

  @Column({ type: "varchar", length: 16 })
  role!: string;

  @Column({ type: "text" })
  content!: string;

  /** 会话内顺序，从 0 递增 */
  @Column({ type: "integer" })
  sortOrder!: number;

  @CreateDateColumn({ type: "datetime" })
  createdAt!: Date;
}
