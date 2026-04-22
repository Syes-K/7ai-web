export interface PublicUser {
  id: string;
  email: string;
  nickName: string;
  telNo: string | null;
  readOnly: boolean;
}

export interface LoginRequestBody {
  email?: string;
  password?: string;
  captchaId?: string;
  captcha?: string;
  redirect?: string;
}

export interface RegisterRequestBody {
  email?: string;
  password?: string;
  passwordConfirm?: string;
  nickName?: string;
  telNo?: string | null;
  captchaId?: string;
  captcha?: string;
  redirect?: string;
}

export type CaptchaVerifyResult = "ok" | "missing" | "invalid";
