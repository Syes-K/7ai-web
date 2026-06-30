import { authRedirectPathForClient } from "@/common/utils/redirect";

/** 登录/注册成功后整页跳转，确保 Set-Cookie 在下一请求生效 */
export function navigateAfterAuth(redirectUrl: string | null | undefined): void {
  window.location.assign(authRedirectPathForClient(redirectUrl));
}
