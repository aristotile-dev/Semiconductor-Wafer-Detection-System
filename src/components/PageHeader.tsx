interface Props { title: string; accent?: string; subtitle?: string; children?: React.ReactNode; }

/** Big stacked title like the landing: first line white, second line lime. Controls sit on the right. */
export default function PageHeader({ title, accent, subtitle, children }: Props) {
  return (
    <header className="head">
      <div>
        <h1><span>{title}</span>{accent && <span className="a">{accent}</span>}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children}
    </header>
  );
}
