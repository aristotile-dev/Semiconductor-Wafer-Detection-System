interface Props { title: string; subtitle?: string; }

export default function PageHeader({ title, subtitle }: Props) {
  return (
    <div className="page-header">
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </div>
  );
}
