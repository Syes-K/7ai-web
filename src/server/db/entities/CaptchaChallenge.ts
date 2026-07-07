import { Column, Entity, PrimaryColumn } from "typeorm";
import { timestampColumn } from "@/server/db/column-types";

/**
 * 图形验证码挑战：答案仅存哈希，校验成功即标记 consumed。
 */
@Entity("captcha_challenges")
export class CaptchaChallenge {
  @PrimaryColumn("varchar", { length: 64 })
  id!: string;

  /** sha256(hex) 小写答案 */
  @Column({ type: "varchar", length: 64 })
  answerHash!: string;

  @Column(timestampColumn())
  expiresAt!: Date;

  @Column(timestampColumn({ nullable: true }))
  consumedAt!: Date | null;
}
