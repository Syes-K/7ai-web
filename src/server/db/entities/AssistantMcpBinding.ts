import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from "typeorm";
import { timestampColumn } from "@/server/db/column-types";

@Entity("assistant_mcp_bindings")
@Index(["userId", "mcpConfigId"])
@Index(["assistantId"])
@Index(["assistantId", "mcpConfigId"], { unique: true })
export class AssistantMcpBinding {
  @PrimaryColumn("varchar", { length: 36 })
  id!: string;

  @Column({ type: "varchar", length: 36 })
  userId!: string;

  @Column({ type: "varchar", length: 36 })
  assistantId!: string;

  @Column({ type: "varchar", length: 36 })
  mcpConfigId!: string;

  @CreateDateColumn(timestampColumn())
  createdAt!: Date;
}
