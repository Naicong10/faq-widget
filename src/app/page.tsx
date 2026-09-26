import Script from "next/script";

const notices = [
  { label: "报到", value: "9 月 1 日–2 日 · 南门迎新点" },
  { label: "宿舍", value: "本科生 4 人间 · 23:30 熄灯" },
  { label: "校园卡", value: "报到当天在学生服务中心领取" },
];

export default function Home() {
  return (
    <div className="min-h-full bg-[#f3efe6] text-[#1c2833]">
      <header className="border-b border-[#1d4e89]/20">
        <div className="mx-auto flex max-w-5xl items-baseline justify-between gap-4 px-6 py-5">
          <p className="text-lg font-semibold tracking-wide">星河大学</p>
          <p className="text-sm text-[#5c6b7a]">2026 年秋季入学</p>
        </div>
      </header>
      <main>
        <section className="mx-auto grid max-w-5xl gap-12 px-6 py-16 md:grid-cols-[1.4fr_0.9fr] md:items-end">
          <div>
            <p className="text-sm text-[#1d4e89]">新生指南</p>
            <h1 className="mt-3 max-w-xl text-4xl font-semibold leading-tight md:text-5xl">
              欢迎来到星河大学
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[#3d4c5c]">
              这里是给新生和家长准备的入学说明。报到、宿舍、校园卡、选课等问题，点右下角的智能助手就可以问。
            </p>
          </div>
          <dl className="border-t border-[#1d4e89]/20">
            {notices.map((item) => (
              <div
                key={item.label}
                className="flex items-baseline justify-between gap-6 border-b border-[#1d4e89]/20 py-3 text-sm"
              >
                <dt className="text-[#5c6b7a]">{item.label}</dt>
                <dd className="text-right">{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="border-t border-[#1d4e89]/20">
          <div className="mx-auto max-w-5xl px-6 py-12">
            <h2 className="text-xl font-semibold">入学前可以先了解</h2>
            <ul className="mt-6 max-w-2xl space-y-3 text-[#3d4c5c] leading-7">
              <li>报到请带录取通知书、身份证和一寸证件照。材料不齐可以先登记。</li>
              <li>宿舍每天 23:30 熄灯，只关顶灯，插座和网络不断电。</li>
              <li>食堂使用校园卡或「星河校园」付款码，不收现金。</li>
            </ul>
          </div>
        </section>
      </main>
      <footer className="border-t border-[#1d4e89]/20">
        <div className="mx-auto flex max-w-5xl flex-col gap-1 px-6 py-8 text-sm text-[#5c6b7a] sm:flex-row sm:justify-between">
          <p>星河大学招生办</p>
          <p>zhaosheng@xinghe.edu.cn</p>
        </div>
      </footer>
      <Script src="/widget.js" data-title="星河大学智能助手" strategy="afterInteractive" />
    </div>
  );
}
