import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";
import { timestampColumn } from "@/server/db/column-types";
import type { McpLastCheckStatus, McpTransport } from "@/common/enums";

@Entity("user_mcp_configs")
@Index(["userId", "updatedAt"])
@Index(["userId", "name"], { unique: true })
export class UserMcpConfig {
  @PrimaryColumn("varchar", { length: 36 })
  id!: string;

  @Column({ type: "varchar", length: 36 })
  userId!: string;

  @Column({ type: "varchar", length: 64 })
  name!: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  description!: string | null;

  @Column({ type: "varchar", length: 32 })
  transport!: McpTransport;

  /** 连接参数（URL、command 等），禁止完整写入日志 */
  @Column({ type: "simple-json" })
  endpoint!: Record<string, unknown>;

  @Column({ type: "simple-json", nullable: true })
  metadata!: Record<string, unknown> | null;

  @Column({ type: "text", nullable: true })
  credentialsCipher!: string | null;

  @Column(timestampColumn({ nullable: true }))
  credentialsUpdatedAt!: Date | null;

  @Column({ type: "boolean", default: true })
  enabled!: boolean;

  @Column(timestampColumn({ nullable: true }))
  lastCheckedAt!: Date | null;

  @Column({ type: "varchar", length: 16, default: "never" })
  lastCheckStatus!: McpLastCheckStatus;

  @Column({ type: "varchar", length: 500, nullable: true })
  lastErrorSummary!: string | null;

  @CreateDateColumn(timestampColumn())
  createdAt!: Date;

  @UpdateDateColumn(timestampColumn())
  updatedAt!: Date;
}
