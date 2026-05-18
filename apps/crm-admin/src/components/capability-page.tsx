import { Badge, EmptyState, Panel, SectionHeader, Toolbar } from "@social-crm/ui";
import { useI18n } from "@/i18n";

type CapabilityPageProps = {
  title: string;
  description: string;
  readinessLabel?: string;
  surfaces?: string[];
  blockers?: string[];
  nextSteps?: string[];
};

export function CapabilityPage(props: CapabilityPageProps) {
  const { copy } = useI18n();
  const surfaces = props.surfaces ?? [];
  const blockers = props.blockers ?? [];
  const nextSteps = props.nextSteps ?? [];

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={copy({ en: "Capability-gated", vi: "Tính năng đang giới hạn" })}
        title={props.title}
        description={copy({
          en: "This workspace already follows the same operational shell as active CRM modules, but its actions stay gated until the backend exposes the required endpoints.",
          vi: "Khu vực này đã dùng cùng khung giao diện vận hành với các mô-đun CRM khác, nhưng thao tác vẫn khóa cho đến khi API hỗ trợ đầy đủ."
        })}
      />

      <div className="grid gap-3 md:grid-cols-4">
        <GateStat label={copy({ en: "Module state", vi: "Trạng thái mô-đun" })} value={props.readinessLabel ?? copy({ en: "Backend incomplete", vi: "API chưa hoàn thiện" })} tone="warning" />
        <GateStat label={copy({ en: "Planned surfaces", vi: "Màn hình dự kiến" })} value={surfaces.length || "-"} />
        <GateStat label={copy({ en: "API blockers", vi: "Điểm nghẽn API" })} value={blockers.length || "-"} tone="danger" />
        <GateStat label={copy({ en: "Next steps", vi: "Bước tiếp theo" })} value={nextSteps.length || "-"} tone="accent" />
      </div>

      <Toolbar className="border-slate-200/90">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
          <span>{props.description}</span>
          <Badge tone="warning">{props.readinessLabel ?? copy({ en: "Backend incomplete", vi: "API chưa hoàn thiện" })}</Badge>
        </div>
      </Toolbar>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_360px]">
        <div className="space-y-6">
          <Panel
            title={copy({ en: "Planned workspace surfaces", vi: "Màn hình vận hành dự kiến" })}
            subtitle={copy({
              en: "These are the operator-facing sections this module should eventually expose once the backend is ready.",
              vi: "Đây là các phần nhân sự sẽ sử dụng khi API của mô-đun đã sẵn sàng."
            })}
          >
            {surfaces.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {surfaces.map((surface) => (
                  <div key={surface} className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="text-sm font-semibold text-slate-800">{surface}</div>
                    <div className="mt-2 text-xs leading-5 text-slate-500">
                      {copy({
                        en: "Kept visible in the roadmap shell, but intentionally non-interactive today.",
                        vi: "Được giữ trong khung lộ trình, nhưng hiện chưa cho thao tác để tránh tạo luồng giả."
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title={copy({ en: "No surface map yet", vi: "Chưa có sơ đồ màn hình" })}
                description={copy({
                  en: "Add the intended operator surfaces for this module before implementing its first backend-backed actions.",
                  vi: "Cần xác định các màn hình nhân sự sẽ dùng trước khi nối thao tác thật với API."
                })}
              />
            )}
          </Panel>

          <Panel
            title={copy({ en: "Current backend blockers", vi: "Điểm nghẽn API hiện tại" })}
            subtitle={copy({
              en: "The UI is intentionally stopped at this boundary to avoid inventing unsupported flows.",
              vi: "Giao diện dừng tại ranh giới này để không tạo luồng nghiệp vụ chưa được hệ thống hỗ trợ."
            })}
          >
            {blockers.length ? (
              <div className="space-y-3">
                {blockers.map((blocker) => (
                  <div key={blocker} className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm leading-7 text-rose-800">
                    {blocker}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title={copy({ en: "No blockers listed", vi: "Chưa liệt kê điểm nghẽn" })}
                description={copy({
                  en: "This module needs explicit backend constraints documented before it should be opened for implementation.",
                  vi: "Cần ghi rõ các giới hạn API trước khi mở mô-đun này để triển khai thao tác thật."
                })}
              />
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel
            title={copy({ en: "Recommended next implementation steps", vi: "Bước triển khai đề xuất" })}
            subtitle={copy({
              en: "Use this checklist when the backend is expanded and this module is ready to move beyond a gated shell.",
              vi: "Dùng danh sách này khi API đã mở rộng và mô-đun sẵn sàng chuyển khỏi trạng thái giới hạn."
            })}
          >
            {nextSteps.length ? (
              <div className="space-y-3">
                {nextSteps.map((step, index) => (
                  <div key={step} className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                        {index + 1}
                      </div>
                      <div className="text-sm leading-7 text-slate-600">{step}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title={copy({ en: "No next steps defined", vi: "Chưa có bước tiếp theo" })}
                description={copy({
                  en: "Document the activation path for this module before attaching new UI flows to it.",
                  vi: "Cần ghi rõ cách kích hoạt mô-đun trước khi gắn thêm luồng giao diện mới."
                })}
              />
            )}
          </Panel>

          <Panel
            title={copy({ en: "Activation rule", vi: "Quy tắc kích hoạt" })}
            subtitle={copy({
              en: "This shell should flip into a live workbench only when the backend can support real operator actions end-to-end.",
              vi: "Chỉ chuyển khu vực này thành màn hình thao tác thật khi API hỗ trợ đầy đủ từ đầu đến cuối."
            })}
          >
            <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
              {copy({
                en: "Keep the shell visible for navigation completeness, but do not add fake tables, simulations, or optimistic controls here. This area should graduate directly from roadmap shell to backend-backed work surface.",
                vi: "Giữ khung này để điều hướng đầy đủ, nhưng không thêm bảng giả, mô phỏng hoặc thao tác giả. Khu vực này chỉ nên mở thành màn hình làm việc thật khi có API hỗ trợ."
              })}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function GateStat(props: { label: string; value: string | number; tone?: "neutral" | "accent" | "warning" | "danger" }) {
  const accentClass =
    props.tone === "accent"
      ? "border-indigo-200 bg-indigo-50"
      : props.tone === "warning"
        ? "border-amber-200 bg-amber-50"
        : props.tone === "danger"
          ? "border-rose-200 bg-rose-50"
          : "border-slate-200 bg-white";

  return (
    <div className={`rounded-[22px] border px-4 py-4 shadow-[0_14px_26px_rgba(15,23,42,0.04)] ${accentClass}`}>
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{props.label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-900">{props.value}</div>
    </div>
  );
}
