import Link from "next/link";
import { Clock, BarChart3, Wallet } from "lucide-react";
import { HomeCta } from "@/components/auth/home-cta";
import { IconBox } from "@/components/ui/list-section";

const FEATURES = [
  {
    icon: Clock,
    title: "Chấm công thông minh",
    description: "Check-in/out hoặc nhập tay từng ca",
  },
  {
    icon: Wallet,
    title: "Tính lương tự động",
    description: "Theo giờ, ca, overtime — không cần Excel",
  },
  {
    icon: BarChart3,
    title: "Thống kê rõ ràng",
    description: "Biểu đồ thu nhập theo ngày, tuần, tháng",
  },
] as const;

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,color-mix(in_srgb,var(--primary)_14%,transparent),transparent)]"
      />
      <header className="relative z-10 flex items-center justify-between px-6 py-5">
        <span className="text-xl font-bold tracking-tight">Payday</span>
        <Link
          href="/login"
          className="text-[15px] font-semibold text-primary"
        >
          Đăng nhập
        </Link>
      </header>

      <main className="relative z-10 mx-auto flex max-w-lg flex-col px-6 pb-24 pt-10">
        <div className="page-enter">
          <p className="toss-label">Chấm công & tính lương</p>
          <h1 className="mt-2 text-[34px] font-bold leading-[1.15] tracking-tight">
            Biết chính xác
            <br />
            <span className="text-primary">ngày lương</span> của bạn
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
            Theo dõi giờ làm, tính lương tự động — đồng bộ an toàn
            trên mọi thiết bị.
          </p>
        </div>

        <ul className="mt-8 space-y-2.5">
          {FEATURES.map(({ icon: Icon, title, description }, i) => (
            <li
              key={title}
              className={`page-enter stagger-${i + 1} toss-card flex items-center gap-4 px-4 py-4`}
            >
              <IconBox>
                <Icon className="size-5" strokeWidth={2} />
              </IconBox>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold">{title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="page-enter stagger-4 mt-8">
          <HomeCta />
        </div>
      </main>
    </div>
  );
}
