export default function Footer() {
  return (
    <footer className="px-12 py-10 border-t border-(--border) flex justify-between items-center">
      <div className="text-[12px] font-bold tracking-[0.08em] uppercase text-ink">
        SysViz<span className="text-ink3 font-normal">.dev</span>
      </div>

      <ul className="flex gap-6 list-none">
        {["Docs", "Roadmap", "GitHub", "Twitter"].map((link) => (
          <li key={link}>
            <a
              href="#"
              className="text-[10px] tracking-widest uppercase text-ink3 no-underline font-semibold hover:text-ink transition-colors duration-200"
            >
              {link}
            </a>
          </li>
        ))}
      </ul>

      <div className="text-[10px] text-ink3 tracking-[0.05em]">
        © 2025 SysViz. MIT License.
      </div>
    </footer>
  );
}
