import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";
import { timestampColumn } from "@/server/db/column-types";

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

  @Column(timestampColumn())
  startedAt!: Date;

  @Column(timestampColumn({ nullable: true }))
  endedAt!: Date | null;

  @Column({ type: "integer", nullable: true })
  durationMs!: number | null;

  @Column({ type: "text" })
  stepsSnapshotJson!: string;

  @CreateDateColumn(timestampColumn())
  createdAt!: Date;

  @UpdateDateColumn(timestampColumn())
  updatedAt!: Date;
}
