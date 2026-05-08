import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient, useSessionStore } from "@social-crm/api";
import { getRequestErrorMessage, useRequestNotifications } from "@/app/request-notifications";
import { useI18n } from "@/i18n";
import "./login-page.css";

export function LoginPage() {
  const navigate = useNavigate();
  const { lang, setLang, copy } = useI18n();
  const { notifyError } = useRequestNotifications();
  const consumeLogoutReason = useSessionStore((state) => state.consumeLogoutReason);
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  // If we landed here because the previous session ended, show a small banner
  // explaining why. Consume the reason once so it doesn't repeat on re-login.
  useEffect(() => {
    const reason = consumeLogoutReason();
    if (!reason || reason === "manual") return;
    if (reason === "expired") {
      setSessionNotice(copy({ en: "Your session expired. Please sign in again.", vi: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." }));
    } else if (reason === "idle") {
      setSessionNotice(copy({ en: "Signed out after inactivity.", vi: "Đã đăng xuất do không có hoạt động." }));
    } else if (reason === "remote") {
      setSessionNotice(copy({ en: "Signed out from another tab.", vi: "Đã đăng xuất từ một tab khác." }));
    }
    // We only want to read the reason once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiClient.login(username, password);
      navigate("/dashboard");
    } catch (err: unknown) {
      const message = getRequestErrorMessage(err, copy({ en: "Login failed", vi: "Đăng nhập thất bại" }));
      setError(message);
      notifyError(err, copy({ en: "Login failed", vi: "Đăng nhập thất bại" }));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-shell">
        <section className="login-brand-panel">
          <div className="login-brand-top">
            <div className="login-brand-mark">SC</div>
            <div>
              <div className="login-brand-kicker">Social CRM</div>
              <div className="login-brand-title">{copy({ en: "Admin Console", vi: "Bảng điều khiển quản trị" })}</div>
              <div className="login-brand-subtitle">{copy({ en: "Internal recruitment operations", vi: "Vận hành tuyển dụng nội bộ" })}</div>
            </div>
          </div>

          <div className="login-hero">
            <div className="login-lang-toggle" role="group" aria-label={copy({ en: "Language", vi: "Ngôn ngữ" })}>
              <button type="button" className={`login-lang-button ${lang === "en" ? "is-active" : ""}`} onClick={() => setLang("en")}>
                EN
              </button>
              <button type="button" className={`login-lang-button ${lang === "vi" ? "is-active" : ""}`} onClick={() => setLang("vi")}>
                VN
              </button>
            </div>
            <h1>
              {copy({
                en: "Lead operations, matching control, and recruiting decisions in one CRM workspace.",
                vi: "Vận hành lead, kiểm soát ghép đơn và quyết định tuyển dụng trong một không gian CRM duy nhất."
              })}
            </h1>
            <p>
              {copy({
                en: "Use this admin console to process inbound candidates, review structured profile data, evaluate order fit, and monitor the backend integration layer without jumping across disconnected tools.",
                vi: "Dùng bảng điều khiển này để xử lý ứng viên đầu vào, rà soát hồ sơ có cấu trúc, đánh giá độ phù hợp với đơn hàng và theo dõi lớp tích hợp backend mà không phải chuyển qua nhiều công cụ rời rạc."
              })}
            </p>
          </div>

          <div className="login-feature-grid">
            <div className="login-feature-card sky">
              <h3>{copy({ en: "Lead triage queue", vi: "Hàng đợi phân loại lead" })}</h3>
              <p>
                {copy({
                  en: "Search, filter, and move candidates through the backend state machine with clear next actions.",
                  vi: "Tìm kiếm, lọc và đẩy ứng viên qua state machine của backend với các bước tiếp theo rõ ràng."
                })}
              </p>
            </div>
            <div className="login-feature-card white">
              <h3>{copy({ en: "Structured review", vi: "Rà soát có cấu trúc" })}</h3>
              <p>
                {copy({
                  en: "Validate AI extraction, update profile fields, and compare operator judgment with backend data.",
                  vi: "Xác thực dữ liệu AI trích xuất, cập nhật trường hồ sơ và đối chiếu đánh giá nhân sự với dữ liệu backend."
                })}
              </p>
            </div>
            <div className="login-feature-card amber">
              <h3>{copy({ en: "Matching control", vi: "Kiểm soát ghép đơn" })}</h3>
              <p>
                {copy({
                  en: "Evaluate order eligibility, surface reject reasons, and review approval-risk cases in one place.",
                  vi: "Đánh giá điều kiện ghép đơn, hiển thị lý do từ chối và rà soát các ca cần phê duyệt tại một nơi."
                })}
              </p>
            </div>
          </div>

          <div className="login-meta-grid">
            <SystemPoint label={copy({ en: "Auth model", vi: "Mô hình xác thực" })} value="JWT + refresh token" />
            <SystemPoint label={copy({ en: "Operator surface", vi: "Bề mặt vận hành" })} value={copy({ en: "Admin-only CRM console", vi: "CRM chỉ dành cho quản trị nội bộ" })} />
            <SystemPoint label={copy({ en: "Backend dependency", vi: "Phụ thuộc backend" })} value={copy({ en: "Live API connection required", vi: "Yêu cầu kết nối API trực tiếp" })} />
          </div>
        </section>

        <aside className="login-form-card">
          <div className="login-form-header">
            <h2>{copy({ en: "Sign in", vi: "Đăng nhập" })}</h2>
            <p>{copy({ en: "Use your staff credentials to enter the CRM admin console.", vi: "Dùng tài khoản nhân sự để truy cập bảng điều khiển quản trị CRM." })}</p>
          </div>

          <div className="login-access-note">
            <strong>{copy({ en: "Access scope", vi: "Phạm vi truy cập" })}</strong>
            <span>
              {copy({
                en: "This screen authenticates internal operators only. Candidate-facing flows stay on a separate app boundary.",
                vi: "Màn hình này chỉ xác thực cho nhân sự nội bộ. Các luồng dành cho ứng viên vẫn nằm trên ứng dụng riêng."
              })}
            </span>
          </div>

          {sessionNotice ? (
            <div className="login-session-notice">{sessionNotice}</div>
          ) : null}

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-form-group">
              <label className="login-form-label" htmlFor="username">
                {copy({ en: "Username", vi: "Tên đăng nhập" })}
              </label>
              <input
                id="username"
                className="login-form-control"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={copy({ en: "Enter your operator username", vi: "Nhập tên đăng nhập nhân sự" })}
                autoComplete="username"
              />
              <div className="login-inline-help">{copy({ en: "Use the account provided for your staff role.", vi: "Dùng tài khoản được cấp cho vai trò nhân sự của bạn." })}</div>
            </div>

            <div className="login-form-group">
              <label className="login-form-label" htmlFor="password">
                {copy({ en: "Password", vi: "Mật khẩu" })}
              </label>
              <input
                id="password"
                className="login-form-control"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={copy({ en: "Enter your password", vi: "Nhập mật khẩu" })}
                autoComplete="current-password"
              />
            </div>

            {error ? <div className="login-error">{error}</div> : null}

            <button className="login-submit" type="submit" disabled={loading}>
              {loading ? copy({ en: "Signing in...", vi: "Đang đăng nhập..." }) : copy({ en: "Enter admin console", vi: "Vào bảng điều khiển" })}
            </button>
          </form>

          <div className="login-footnote">
            <strong>{copy({ en: "Verification note", vi: "Ghi chú xác minh" })}</strong>
            <span>
              {copy({
                en: "If authentication fails here, verify backend health and JWT configuration before reviewing protected routes.",
                vi: "Nếu đăng nhập thất bại tại đây, hãy kiểm tra tình trạng backend và cấu hình JWT trước khi rà soát các route được bảo vệ."
              })}
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}

function SystemPoint(props: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{props.label}</div>
      <div className="mt-2 text-sm font-medium text-slate-700">{props.value}</div>
    </div>
  );
}
