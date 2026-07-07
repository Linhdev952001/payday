import { FirebaseError } from "firebase/app";

const messages: Record<string, string> = {
  "auth/email-already-in-use": "Email này đã được sử dụng.",
  "auth/invalid-email": "Email không hợp lệ.",
  "auth/operation-not-allowed":
    "Đăng nhập Google chưa được bật. Vào Firebase Console → Authentication → Sign-in method → Google.",
  "auth/weak-password": "Mật khẩu phải có ít nhất 6 ký tự.",
  "auth/user-disabled": "Tài khoản đã bị vô hiệu hóa.",
  "auth/user-not-found": "Email hoặc mật khẩu không đúng.",
  "auth/wrong-password": "Email hoặc mật khẩu không đúng.",
  "auth/invalid-credential": "Email hoặc mật khẩu không đúng.",
  "auth/too-many-requests": "Quá nhiều lần thử. Vui lòng thử lại sau.",
  "auth/popup-closed-by-user": "Đã hủy đăng nhập Google.",
  "auth/popup-blocked": "Trình duyệt đã chặn popup. Hãy cho phép popup.",
  "auth/network-request-failed": "Lỗi mạng. Kiểm tra kết nối internet.",
  "auth/unauthorized-domain":
    "Domain chưa được phép. Vào Firebase → Authentication → Authorized domains → thêm payday-pearl.vercel.app",
  "auth/operation-not-supported-in-this-environment":
    "Trình duyệt này không hỗ trợ popup. Đang chuyển sang đăng nhập redirect…",
  "auth/argument-error":
    "Không mở được cửa sổ đăng nhập Google trên thiết bị này. Thử lại hoặc dùng email.",
  "auth/invalid-api-key": "Firebase API key không hợp lệ.",
  "auth/configuration-not-found": "Firebase Auth chưa được bật cho project này.",
};

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    const mapped = messages[error.code];
    if (mapped) return mapped;
    return error.message || error.code;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Đã xảy ra lỗi. Vui lòng thử lại.";
}
