import SkeletonCard from '../../components/SkeletonCard';

/* Espelha a estrutura real do dashboard, para o salto ao carregar ser mínimo. */
export default function DashboardSkeleton() {
  return (
    <>
      <SkeletonCard height={44} style={{ borderRadius: 'var(--r-md)', marginBottom: 'var(--sp-6)', maxWidth: 260 }} />
      <SkeletonCard height={230} style={{ borderRadius: 'var(--r-lg)', marginBottom: 'var(--sp-4)' }} />
      <div className="ui-grid ui-grid--2" style={{ marginBottom: 'var(--sp-4)' }}>
        <SkeletonCard height={280} style={{ borderRadius: 'var(--r-lg)' }} />
        <SkeletonCard height={280} style={{ borderRadius: 'var(--r-lg)' }} />
      </div>
      <div className="ui-grid ui-grid--2">
        <SkeletonCard height={260} style={{ borderRadius: 'var(--r-lg)' }} />
        <SkeletonCard height={260} style={{ borderRadius: 'var(--r-lg)' }} />
      </div>
    </>
  );
}
