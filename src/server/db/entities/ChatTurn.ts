import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("chat_turns")
@Index(["conversationId", "createdAt"])
@Index(["userId", "createdAt"])
export class ChatTurn {
  @PrimaryColumn("varchar", { length: 36 })
  id!: string;

  @Column({ type: "varchar", length: 36 })
  @Index()
  conversationId!: string;

  @Column({ type: "varchar", length: 36 })
  @Index()
  userId!: string;

  @Column({ type: "varchar", length: 36, nullable: true })
  userMessageId!: string | null;

  @Column({ type: "varchar", length: 36, nullable: true })
  assistantMessageId!: string | null;

  @Column({ type: "varchar", length: 16 })
  finalStatus!: "completed" | "failed" | "interrupted";

  @Column({ type: "varchar", length: 32, nullable: true })
  interruptionReason!: "user_cancelled" | "network_disconnected" | "server_timeout" | "unknown" | null;

  @Column({ type: "integer", default: 0 })
  reasoningVisibilityLevel!: number;

  @Column({ type: "datetime" })
  startedAt!: Date;

  @Column({ type: "datetime", nullable: true })
  endedAt!: Date | null;

  @Column({ type: "integer", nullable: true })
  durationMs!: number | null;

  @Column({ type: "text" })
  stepsSnapshotJson!: string;

  @CreateDateColumn({ type: "datetime" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime" })
  updatedAt!: Date;
}
