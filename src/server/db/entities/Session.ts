import { Column, Entity, PrimaryColumn } from "typeorm";

/**
 * 服务端会话：Cookie 中存放 session id，与浏览器绑定。
 */
@Entity("sessions")
export class Session {
  @PrimaryColumn("varchar", { length: 64 })
  id!: string;

  @Column("varchar", { length: 36 })
  userId!: string;

  @Column({ type: "datetime" })
  expiresAt!: Date;

  @Column({ type: "datetime" })
  createdAt!: Date;
}
