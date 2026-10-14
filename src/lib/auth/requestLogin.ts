/** 로그인이 필요한 동작에서 호출한다. 헤더의 로그인 폼이 이 이벤트를 받아 열린다. */
export const LOGIN_EVENT = "mathflow:login";

export function requestLogin() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(LOGIN_EVENT));
}
